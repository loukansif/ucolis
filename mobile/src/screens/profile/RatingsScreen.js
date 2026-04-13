import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userService } from '../../services/userService';
import Avatar     from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import Loader     from '../../components/common/Loader';
import COLORS     from '../../constants/colors';
import { t }      from '../../i18n/index';
import ReportModal from '../../components/common/ReportModal';
import { formatRelativeDate } from '../../utils/formatters';

function StarRow({ note, size = 16 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= note ? 'star' : 'star-outline'}
          size={size}
          color={COLORS.warning}
        />
      ))}
    </View>
  );
}

export default function RatingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [ratings,  setRatings]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [average,  setAverage]  = useState(0);
  const [total,    setTotal]    = useState(0);
  const [reportAvisId, setReportAvisId] = useState(null);

  useEffect(() => { fetchRatings(); }, []);

  async function fetchRatings() {
    try {
      setLoading(true);
      const data = await userService.getMyRatings();
      setRatings(data.avis     || []);
      setAverage(data.moyenne  || 0);
      setTotal(data.total      || 0);
    } catch (e) {
      console.warn('Ratings:', e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loader fullScreen />;

  return (
    <>
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.myRatings')}</Text>
      </View>

      {/* Résumé note */}
      {total > 0 && (
        <View style={styles.summaryCard}>
          <Text style={styles.averageValue}>{average.toFixed(1)}</Text>
          <StarRow note={Math.round(average)} size={22} />
          <Text style={styles.totalText}>{total} avis</Text>
        </View>
      )}

      <FlatList
        data={ratings}
        keyExtractor={item => item._id}
        renderItem={({ item }) => {
          const name = item.auteur
            ? `${item.auteur.prenom} ${item.auteur.nom}`
            : 'Utilisateur';
          return (
            <View style={styles.ratingCard}>
              {item.colis && (
                <Text style={styles.colisTag}>
                  📦 {item.colis.villeDepart || ''} → {item.colis.villeArrivee || ''}
                </Text>
              )}
              <View style={styles.ratingHeader}>
                <Avatar uri={item.auteur?.photoProfil} name={name} size={44} />
                <View style={styles.ratingInfo}>
                  <Text style={styles.ratingName}>{name}</Text>
                  <Text style={styles.ratingRole}>
                    {item.type === 'expediteur' ? 'Expéditeur' : 'Transporteur'}
                  </Text>
                  <StarRow note={item.note} />
                </View>
                <View style={styles.cardActions}>
                  <Text style={styles.ratingDate}>{formatRelativeDate(item.createdAt)}</Text>
                  <TouchableOpacity
                    onPress={() => setReportAvisId(item._id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="flag-outline" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
              {item.commentaire ? (
                <Text style={styles.comment}>{item.commentaire}</Text>
              ) : null}
            </View>
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="star-outline"
            title="Aucun avis pour l'instant"
            description="Vos avis apparaîtront ici après chaque livraison."
          />
        }
      />
    </View>
    <ReportModal
        visible={!!reportAvisId}
        onClose={() => setReportAvisId(null)}
        type="avis"
        cibleAvis={reportAvisId}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backBtn:     { padding: 4 },
  title:       { flex: 1, fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  summaryCard: {
    alignItems: 'center', gap: 6,
    backgroundColor: COLORS.card, padding: 20,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  averageValue: { fontSize: 48, fontWeight: '900', color: COLORS.textPrimary },
  totalText:    { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  list:         { padding: 16, paddingBottom: 32 },
  ratingCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  ratingInfo:   { flex: 1, gap: 4 },
  ratingName:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cardActions:  { alignItems: 'flex-end', gap: 6 },
  ratingDate:   { fontSize: 11, color: COLORS.placeholder },
  comment:      { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, fontStyle: 'italic' },
  colisTag:    { fontSize: 11, color: COLORS.primary, fontWeight: '600', marginBottom: 10, opacity: 0.8 },
  ratingRole:  { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
});