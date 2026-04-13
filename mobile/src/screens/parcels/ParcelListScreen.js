import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import parcelService from '../../services/parcelService';
import ParcelCard from '../../components/parcels/ParcelCard';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import COLORS from '../../constants/colors';
import { t } from '../../i18n/index';
import { getWilayaNames } from '../../utils/wilayas';
import { PARCEL_STATUS } from '../../constants/config';

const LIMIT = 10;

const STATUS_OPTIONS = [
  { label: 'Tous', value: '' },
  { label: t('status.disponible'), value: PARCEL_STATUS.DISPONIBLE },
  { label: t('status.en_negociation'), value: PARCEL_STATUS.EN_NEGOCIATION },
  { label: t('status.accepte'), value: PARCEL_STATUS.ACCEPTE },
  { label: t('status.en_livraison'), value: PARCEL_STATUS.EN_LIVRAISON },
  { label: t('status.livre'), value: PARCEL_STATUS.LIVRE },
];

export default function ParcelListScreen({ navigation }) {
  const { isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const wilayas = getWilayaNames();

  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    wilaya: '',
    statut: '',
    poidsMax: '',
  });
  const [applied, setApplied] = useState({
    search: '',
    wilaya: '',
    statut: PARCEL_STATUS.DISPONIBLE, // ← filtre par défaut
    poidsMax: '',
  });

  // ✅ useCallback sans dépendance externe — setters sont stables
  const fetchParcels = useCallback(async (pg, flt, reset = false) => {
    try {
      if (pg === 1) {
        if (reset) setLoading(true);
        else setRefreshing(true);
      } else {
        setLoadingMore(true);
      }
      const params = {
        page: pg,
        limit: LIMIT,
        ...(flt.wilaya && { wilaya: flt.wilaya }),
        ...(flt.statut && { statut: flt.statut }),
        ...(flt.poidsMax && { poidsMax: flt.poidsMax }),
        ...(flt.search && { search: flt.search }),
      };
      const data = await parcelService.getParcels(params);
      const list = data.parcels || [];
      if (reset || pg === 1) setParcels(list);
      else setParcels((prev) => [...prev, ...list]);
      setHasMore(list.length === LIMIT);
      setPage(pg);
    } catch (e) {
      console.warn('ParcelList fetch:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // setters stables — pas de dep externe

  useFocusEffect(
    useCallback(() => {
      fetchParcels(1, applied, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [applied]) // ← se déclenche à chaque fois que l'écran devient actif
  );

  // ✅ fetchParcels inclus dans les deps
  const onRefresh = useCallback(() => {
    fetchParcels(1, applied, true);
  }, [fetchParcels, applied]); // ✅

  // ✅ fetchParcels inclus dans les deps
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchParcels(page + 1, applied);
  }, [fetchParcels, hasMore, loadingMore, page, applied]); // ✅

  function applyFilters() {
    setApplied({ ...filters });
    setShowFilters(false);
  }

  function resetFilters() {
    const empty = {
      search: '',
      wilaya: '',
      statut: PARCEL_STATUS.DISPONIBLE,
      poidsMax: '',
    };
    setFilters(empty);
    setApplied(empty);
    setShowFilters(false);
  }

  function handleParcelPress(parcel) {
    if (!isLoggedIn) {
      Alert.alert(t('auth.guestRestriction'), t('auth.guestMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    navigation.navigate('ParcelDetail', { parcelId: parcel._id });
  }

  const hasActiveFilters = applied.wilaya || applied.statut || applied.poidsMax;

  const renderFooter = () =>
    loadingMore ? <Loader message={t('common.loadMore')} /> : null;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Ionicons
            name="search-outline"
            size={18}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchText}
            placeholder={t('parcels.search')}
            placeholderTextColor={COLORS.placeholder}
            value={filters.search}
            onChangeText={(v) => {
              setFilters((prev) => ({ ...prev, search: v }));
              if (v.length === 0)
                setApplied((prev) => ({ ...prev, search: '' }));
            }}
            onSubmitEditing={() =>
              setApplied((prev) => ({ ...prev, search: filters.search }))
            }
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={[
            styles.filterBtn,
            hasActiveFilters && styles.filterBtnActive,
          ]}>
          <Ionicons
            name="options-outline"
            size={20}
            color={hasActiveFilters ? COLORS.white : COLORS.primary}
          />
          {hasActiveFilters && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Titre */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('parcels.title')}</Text>
        <Text style={styles.count}>
          {parcels.length}
          {hasMore ? ' +' : ''}
        </Text>
      </View>

      {loading ? (
        <Loader fullScreen />
      ) : (
        <FlatList
          data={parcels}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ParcelCard parcel={item} onPress={() => handleParcelPress(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <EmptyState
              icon="package-variant-closed"
              title={t('parcels.noResults')}
              description={t('parcels.noResultsDescription')}
              actionLabel={hasActiveFilters ? t('parcels.resetFilters') : null}
              onAction={hasActiveFilters ? resetFilters : null}
            />
          }
        />
      )}

      {/* Modal filtres */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('parcels.filters')}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterLabel}>
                {t('parcels.filterWilaya')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}>
                {['', ...wilayas].map((w) => (
                  <TouchableOpacity
                    key={w || 'all'}
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, wilaya: w }))
                    }
                    style={[
                      styles.chip,
                      filters.wilaya === w && styles.chipActive,
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        filters.wilaya === w && styles.chipTextActive,
                      ]}>
                      {w || 'Toutes'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.filterLabel}>
                {t('parcels.filterStatus')}
              </Text>
              <View style={styles.chipsWrap}>
                {STATUS_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, statut: s.value }))
                    }
                    style={[
                      styles.chip,
                      filters.statut === s.value && styles.chipActive,
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        filters.statut === s.value && styles.chipTextActive,
                      ]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>
                {t('parcels.filterWeight')}
              </Text>
              <TextInput
                style={styles.filterInput}
                placeholder="ex: 50"
                placeholderTextColor={COLORS.placeholder}
                value={filters.poidsMax}
                onChangeText={(v) =>
                  setFilters((prev) => ({ ...prev, poidsMax: v }))
                }
                keyboardType="numeric"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title={t('parcels.resetFilters')}
                onPress={resetFilters}
                variant="outline"
                size="md"
                style={styles.modalBtn}
              />
              <Button
                title={t('parcels.applyFilters')}
                onPress={applyFilters}
                variant="primary"
                size="md"
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: { marginRight: 8 },
  searchText: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF3EE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  filterBtnActive: { backgroundColor: COLORS.primary },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  count: { fontSize: 14, color: COLORS.textSecondary },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 16,
  },
  chipsScroll: { marginBottom: 4 },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.white, fontWeight: '700' },
  filterInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1 },
});