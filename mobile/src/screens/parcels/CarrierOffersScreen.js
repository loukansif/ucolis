import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { offerService }  from '../../services/offerService';
import parcelService      from '../../services/parcelService';
import OfferCard   from '../../components/parcels/OfferCard';
import StatusBadge from '../../components/parcels/StatusBadge';
import EmptyState  from '../../components/common/EmptyState';
import Loader      from '../../components/common/Loader';
import COLORS      from '../../constants/colors';
import { t }       from '../../i18n/index';
import { formatPrice } from '../../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

export default function CarrierOffersScreen({ navigation, route }) {
  const { parcelId } = route.params || {};
  const insets       = useSafeAreaInsets();

  const [offers,     setOffers]     = useState([]);
  const [parcel,     setParcel]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      if (parcelId) {
        const [o, p] = await Promise.all([
          offerService.getOffersByParcel(parcelId),
          parcelService.getParcelById(parcelId),
        ]);
        setOffers(Array.isArray(o) ? o : (o?.offres || []));
        setParcel(p?.colis || p);
      } else {
        const myOffers = await offerService.getMyOffers();
        setOffers(Array.isArray(myOffers) ? myOffers : (myOffers?.offres || []));
      }
    } catch (e) {
      console.warn('CarrierOffers:', e.message);
      Alert.alert('', t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }, [parcelId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  async function handleAccept(offerId) {
    Alert.alert(t('offers.accept'), t('offers.acceptConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('offers.accept'),
        onPress: async () => {
          try {
            await offerService.acceptOffer(offerId);
            Alert.alert('', t('offers.offerAccepted'));
            fetchAll();
          } catch (e) {
            Alert.alert('', e.response?.data?.message || t('errors.generic'));
          }
        },
      },
    ]);
  }

  async function handleReject(offerId) {
    Alert.alert(t('offers.reject'), t('offers.rejectConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('offers.reject'),
        style: 'destructive',
        onPress: async () => {
          try {
            await offerService.rejectOffer(offerId);
            Alert.alert('', t('offers.offerRejected'));
            fetchAll();
          } catch (e) {
            Alert.alert('', t('errors.generic'));
          }
        },
      },
    ]);
  }

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{t('offers.title')}</Text>
          {parcel && (
            <Text style={styles.sub}>
              {parcel.depart?.ville || parcel.villeDepart} → {parcel.arrivee?.ville || parcel.villeArrivee}
              {parcel.prixDemande ? ` · ${formatPrice(parcel.prixDemande)}` : ''}
            </Text>
          )}
        </View>
        <StatusBadge statut={parcel?.statut || 'disponible'} />
      </View>

      <FlatList
        data={offers}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <OfferCard
            offer={item}
            isSender={!!parcelId}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="tag-multiple-outline"
            title={t('offers.noOffers')}
            description={
              parcelId
                ? "Aucun transporteur n'a encore proposé d'offre."
                : "Vous n'avez pas encore envoyé d'offre."
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backBtn:      { padding: 4 },
  headerCenter: { flex: 1 },
  title:        { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sub:          { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  list:         { padding: 16, paddingBottom: 32 },
});