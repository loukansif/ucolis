import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, Alert, RefreshControl, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { adminService } from '../../services/adminService';
import Avatar  from '../../components/common/Avatar';
import Loader  from '../../components/common/Loader';
import COLORS  from '../../constants/colors';
import moment  from 'moment';

const STATUTS = ['', 'disponible', 'en_negociation', 'accepte', 'en_livraison', 'livre', 'annule'];
const STATUT_LABELS = {
  '':              'Tous',
  disponible:      'Disponible',
  en_negociation:  'En négo.',
  accepte:         'Accepté',
  en_livraison:    'En route',
  livre:           'Livré',
  annule:          'Annulé',
};
const STATUT_COLORS = {
  disponible:     '#10B981',
  en_negociation: '#F59E0B',
  accepte:        '#3B82F6',
  en_livraison:   '#8B5CF6',
  livre:          '#6EE7B7',
  annule:         '#EF4444',
};

export default function AdminParcelsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [parcels,     setParcels]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [statut,      setStatut]      = useState('');
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [statusModal, setStatusModal] = useState(null);  // parcel en cours
  const searchTimer = useRef(null);

  useFocusEffect(useCallback(() => { load(1, true); }, []));

  async function load(p = 1, reset = false) {
    try {
      if (reset) setLoading(true);
      const data = await adminService.getParcels({ page: p, limit: 20, statut, search });
      setParcels(prev => reset ? data.parcels : [...prev, ...data.parcels]);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setLoading(false); }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(1, true); setRefreshing(false);
  }, [search, statut]);

  function onSearch(text) {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, true), 500);
  }

  async function changeStatus(parcelId, newStatut) {
    try {
      await adminService.setParcelStatus(parcelId, newStatut);
      setParcels(prev => prev.map(p => p._id === parcelId ? { ...p, statut: newStatut } : p));
      setStatusModal(null);
      Alert.alert('✅', 'Statut mis à jour');
    } catch (e) { Alert.alert('Erreur', e.message); }
  }

  function confirmDelete(parcel) {
    Alert.alert(
      '⚠️ Supprimer cette annonce',
      `Supprimer "${parcel.titre}" ? Les offres associées seront également supprimées.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteParcel(parcel._id);
              setParcels(prev => prev.filter(p => p._id !== parcel._id));
            } catch (e) { Alert.alert('Erreur', e.message); }
          },
        },
      ]
    );
  }

  function renderParcel({ item }) {
    const color = STATUT_COLORS[item.statut] || COLORS.placeholder;
    const exp   = item.expediteur;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.titre}</Text>
            <Text style={styles.route}>
              📍 {item.villeDepart || item.wilayaDepart} → {item.villeArrivee || item.wilayaArrivee}
            </Text>
            {exp && (
              <View style={styles.expRow}>
                <Avatar uri={exp.photoProfil} name={`${exp.prenom} ${exp.nom}`} size={20} />
                <Text style={styles.expName}>{exp.prenom} {exp.nom}</Text>
              </View>
            )}
            <Text style={styles.date}>{moment(item.createdAt).format('DD/MM/YYYY')}</Text>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statutBadge, { backgroundColor: color + '20', borderColor: color }]}>
              <Text style={[styles.statutText, { color }]}>{STATUT_LABELS[item.statut]}</Text>
            </View>
            <Text style={styles.price}>{item.prixDemande} DA</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setStatusModal(item)}>
            <Ionicons name="swap-horizontal-outline" size={16} color={COLORS.primary} />
            <Text style={[styles.actionText, { color: COLORS.primary }]}>Statut</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(item)}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            <Text style={[styles.actionText, { color: COLORS.error }]}>Supprimer</Text>
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
        <Text style={styles.title}>Annonces</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.placeholder} />
        <TextInput
          style={styles.searchInput}
          placeholder="Titre, ville départ, ville arrivée..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={onSearch}
        />
      </View>

      <View style={styles.filtersScroll}>
        {STATUTS.map(s => (
          <TouchableOpacity
            key={s}
            onPress={() => { setStatut(s); setTimeout(() => load(1, true), 100); }}
            style={[styles.chip, statut === s && styles.chipActive]}
          >
            <Text style={[styles.chipText, statut === s && styles.chipTextActive]}>
              {STATUT_LABELS[s]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={parcels}
        keyExtractor={item => item._id}
        renderItem={renderParcel}
        onEndReached={() => { if (page < totalPages) load(page + 1); }}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      />

      {/* ── Modal changement de statut ── */}
      <Modal visible={!!statusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Changer le statut</Text>
            <Text style={styles.modalSub}>{statusModal?.titre}</Text>
            {STATUTS.filter(s => s).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.statusOption, statusModal?.statut === s && styles.statusOptionActive]}
                onPress={() => changeStatus(statusModal._id, s)}
              >
                <View style={[styles.dot, { backgroundColor: STATUT_COLORS[s] }]} />
                <Text style={[styles.statusOptionText, statusModal?.statut === s && { fontWeight: '700' }]}>
                  {STATUT_LABELS[s]}
                </Text>
                {statusModal?.statut === s && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatusModal(null)}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:        { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 8,
                  margin: 12, paddingHorizontal: 12, paddingVertical: 10,
                  backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput:  { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  filtersScroll:{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingBottom: 8 },
  chip:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
                  backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive:   { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:     { fontSize: 12, color: COLORS.textSecondary },
  chipTextActive:{ color: '#fff', fontWeight: '600' },
  card:         { backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: COLORS.border },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardLeft:     { flex: 1, gap: 3 },
  cardRight:    { alignItems: 'flex-end', gap: 4 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  route:        { fontSize: 12, color: COLORS.textSecondary },
  expRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expName:      { fontSize: 11, color: COLORS.placeholder },
  date:         { fontSize: 11, color: COLORS.placeholder },
  statutBadge:  { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statutText:   { fontSize: 11, fontWeight: '700' },
  price:        { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  cardActions:  { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  actionBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 },
  actionText:   { fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                  padding: 20, paddingBottom: 40, gap: 4 },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  modalSub:     { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10 },
  statusOptionActive: { backgroundColor: COLORS.primary + '12' },
  statusOptionText: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  cancelBtn:    { marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: COLORS.border, alignItems: 'center' },
  cancelText:   { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
});