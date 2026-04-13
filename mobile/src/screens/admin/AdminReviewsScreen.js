import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { adminService } from '../../services/adminService';
import Avatar  from '../../components/common/Avatar';
import Loader  from '../../components/common/Loader';
import COLORS  from '../../constants/colors';
import moment  from 'moment';

function Stars({ note }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= note ? 'star' : 'star-outline'}
          size={13} color={COLORS.warning} />
      ))}
    </View>
  );
}

export default function AdminReviewsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [reviews,    setReviews]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useFocusEffect(useCallback(() => { load(1, true); }, []));

  async function load(p = 1, reset = false) {
    try {
      if (reset) setLoading(true);
      const data = await adminService.getReviews({ page: p, limit: 20 });
      setReviews(prev => reset ? data.reviews : [...prev, ...data.reviews]);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setLoading(false); }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(1, true); setRefreshing(false);
  }, []);

  function confirmDelete(review) {
    const auteur = `${review.auteur?.prenom || ''} ${review.auteur?.nom || ''}`.trim();
    Alert.alert(
      'Supprimer cet avis',
      `L'avis de ${auteur} (${review.note}★) sera définitivement supprimé et la moyenne recalculée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteReview(review._id);
              setReviews(prev => prev.filter(r => r._id !== review._id));
            } catch (e) { Alert.alert('Erreur', e.message); }
          },
        },
      ]
    );
  }

  function renderReview({ item }) {
    const auteurName = `${item.auteur?.prenom || ''} ${item.auteur?.nom || ''}`.trim() || '—';
    const destName   = `${item.destinataire?.prenom || ''} ${item.destinataire?.nom || ''}`.trim() || '—';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.userRow}>
            <Avatar uri={item.auteur?.photoProfil} name={auteurName} size={36} />
            <View>
              <Text style={styles.userName}>{auteurName}</Text>
              <Text style={styles.userRole}>
                {item.type === 'expediteur' ? '📦 Expéditeur' : '🚗 Transporteur'}
              </Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={16} color={COLORS.placeholder} />
          <View style={styles.userRow}>
            <Avatar uri={item.destinataire?.photoProfil} name={destName} size={36} />
            <View>
              <Text style={styles.userName}>{destName}</Text>
              <Stars note={item.note} />
            </View>
          </View>
        </View>

        {item.colis && (
          <Text style={styles.colisTag}>
            📦 {item.colis.titre || `${item.colis.villeDepart} → ${item.colis.villeArrivee}`}
          </Text>
        )}

        {item.commentaire ? (
          <Text style={styles.comment}>« {item.commentaire} »</Text>
        ) : (
          <Text style={styles.noComment}>Sans commentaire</Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.date}>{moment(item.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
          <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
            <Text style={styles.deleteText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Avis utilisateurs</Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={item => item._id}
        renderItem={renderReview}
        onEndReached={() => { if (page < totalPages) load(page + 1); }}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun avis</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: COLORS.background },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 16, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:      { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  card:       { backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  userRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName:   { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  userRole:   { fontSize: 11, color: COLORS.textSecondary },
  colisTag:   { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  comment:    { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  noComment:  { fontSize: 12, color: COLORS.placeholder, fontStyle: 'italic' },
  footer:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  date:       { fontSize: 11, color: COLORS.placeholder },
  deleteBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deleteText: { fontSize: 13, fontWeight: '600', color: COLORS.error },
  empty:      { textAlign: 'center', color: COLORS.placeholder, marginTop: 40, fontSize: 14 },
});