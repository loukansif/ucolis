import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet,
  RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }       from '../../context/AuthContext';
import parcelService     from '../../services/parcelService';
import ParcelCard        from '../../components/parcels/ParcelCard';
import EmptyState        from '../../components/common/EmptyState';
import Loader            from '../../components/common/Loader';
import Button            from '../../components/common/Button';
import COLORS            from '../../constants/colors';
import { t }             from '../../i18n/index';
import { PARCEL_STATUS } from '../../constants/config';

export default function MyParcelsScreen({ navigation }) {
  const insets   = useSafeAreaInsets();
  const { user } = useAuth();

  const [parcels,    setParcels]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab,  setActiveTab]  = useState('');

  const STATUS_TABS = [
    { label: 'Tous',           value: '' },
    { label: 'Disponible',     value: PARCEL_STATUS.DISPONIBLE },
    { label: 'En négociation', value: PARCEL_STATUS.EN_NEGOCIATION },
    { label: 'Accepté',        value: PARCEL_STATUS.ACCEPTE },
    { label: 'En livraison',   value: PARCEL_STATUS.EN_LIVRAISON },
    { label: 'Livré',          value: PARCEL_STATUS.LIVRE },
    { label: 'Annulé',         value: PARCEL_STATUS.ANNULE },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchMyParcels(); }, []);

  async function fetchMyParcels() {
    if (!user?._id) return;
    try {
      setLoading(true);
      // ✅ GET /parcels?expediteur=userId — filtre côté backend
      const data = await parcelService.getParcels({ expediteur: user._id });
      setParcels(Array.isArray(data) ? data : (data.parcels || []));
    } catch (e) {
      console.warn('MyParcels:', e.message);
      Alert.alert('', 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyParcels();
    setRefreshing(false);
  }, [user?._id]);

  async function handleDelete(parcelId) {
    Alert.alert('Supprimer', 'Confirmer la suppression de cette annonce ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await parcelService.deleteParcel(parcelId);
            Alert.alert('', 'Annonce supprimée.');
            fetchMyParcels();
          } catch (e) {
            Alert.alert('', 'Une erreur est survenue.');
          }
        },
      },
    ]);
  }

  const filtered = activeTab
    ? parcels.filter(p => p.statut === activeTab)
    : parcels;

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Mes annonces</Text>
        <Button
          title="+ Publier"
          onPress={() => navigation.navigate('Créer')}
          variant="primary"
          size="sm"
        />
      </View>

      {/* Chips filtres */}
      <View
        style={styles.tabsWrapper}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
      >
        <ScrollView
          horizontal
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
        {STATUS_TABS.map((item) => (
          <TouchableOpacity
            key={item.value}
            onPress={() => setActiveTab(item.value)}
            style={[styles.chip, activeTab === item.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, activeTab === item.value && styles.chipTextActive]}>
              {item.label}
              {item.value ? ` (${parcels.filter(p => p.statut === item.value).length})` : ` (${parcels.length})`}
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      {/* Liste */}
      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View>
            <ParcelCard
              parcel={item}
              onPress={() => navigation.navigate('ParcelDetail', { parcelId: item._id })}
            />
            {/* Actions disponibles selon le statut */}
            <View style={styles.cardActions}>
              {(item.statut === PARCEL_STATUS.DISPONIBLE || item.statut === PARCEL_STATUS.EN_NEGOCIATION) && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('CarrierOffers', { parcelId: item._id })}
                  style={styles.actionBtn}
                >
                  <Ionicons name="pricetag-outline" size={15} color={COLORS.primary} />
                  <Text style={styles.actionText}>Voir les offres</Text>
                </TouchableOpacity>
              )}
              {item.statut === PARCEL_STATUS.DISPONIBLE && (
                <TouchableOpacity
                  onPress={() => handleDelete(item._id)}
                  style={[styles.actionBtn, styles.deleteBtn]}
                >
                  <Ionicons name="trash-outline" size={15} color={COLORS.error} />
                  <Text style={[styles.actionText, { color: COLORS.error }]}>Supprimer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="package-variant-closed"
            title="Aucune annonce"
            description="Vous n'avez pas encore publié d'annonce."
            actionLabel="Publier une annonce"
            onAction={() => navigation.navigate('Créer')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card, gap: 8,
  },
  backBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:    { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  tabsWrapper: { height: 52, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tabsRow:  { paddingHorizontal: 14, alignItems: 'center', flexDirection: 'row', gap: 8, height: 52 },
  chip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white, fontWeight: '700' },
  list:     { paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  cardActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -8, marginBottom: 12 },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: '#FFF3EE', borderWidth: 1, borderColor: '#FFDAC7' },
  deleteBtn:   { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  actionText:  { fontSize: 12, fontWeight: '600', color: COLORS.primary },
});