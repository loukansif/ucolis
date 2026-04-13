import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { LinearGradient }   from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }           from '../../context/AuthContext';
import { useNotifications }  from '../../context/NotificationContext';
import parcelService          from '../../services/parcelService';  // ✅ default import
import ParcelCard  from '../../components/parcels/ParcelCard';
import Loader      from '../../components/common/Loader';
import EmptyState  from '../../components/common/EmptyState';
import COLORS      from '../../constants/colors';
import { t }       from '../../i18n/index';
import { USER_ROLES } from '../../constants/config';

export default function HomeScreen({ navigation }) {
  const { user, isLoggedIn } = useAuth();
  const { unreadCount }      = useNotifications();
  const insets               = useSafeAreaInsets();

  const [parcels,    setParcels]    = useState([]);
  const [stats,      setStats]      = useState({ sent: 0, carried: 0, offers: 0 });
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await parcelService.getParcels({ limit: 5, page: 1 });
      setParcels(data.parcels || []);

      if (isLoggedIn && user?._id) {
        // ✅ passe user._id — parcelService.getMyParcels attend un userId
        const myData = await parcelService.getMyParcels(user._id);
        const list   = myData?.parcels || myData || [];
        const sent    = list.filter(p => p.expediteur?._id === user._id || p.expediteur === user._id).length;
        const carried = list.filter(p =>
          p.transporteurAccepte?._id === user._id || p.transporteurAccepte === user._id
        ).length;
        setStats({ sent, carried, offers: 0 });
      }
    } catch (e) {
      console.warn('HomeScreen fetchData:', e.message);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, user?._id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  function handleParcelPress(parcel) {
    if (!isLoggedIn) { navigation.navigate('Login'); return; }
    // ✅ Navigue directement sur le RootStack — ne touche pas l'onglet Annonces
    navigation.navigate('ParcelDetail', { parcelId: parcel._id });
  }

  const greeting = user ? `${t('home.welcome')}, ${user.prenom} 👋` : `${t('home.welcome')} 👋`;

  if (loading) return <Loader fullScreen />;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <LinearGradient colors={COLORS.gradientHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.headerSub}>{t('app.tagline')}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {isLoggedIn && (
          <View style={styles.statsRow}>
            {[
              { icon: 'send',         label: t('home.totalSent'),    value: stats.sent    },
              { icon: 'truck-fast',   label: t('home.totalCarried'), value: stats.carried },
              { icon: 'tag-multiple', label: t('home.activeOffers'), value: stats.offers  },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <MaterialCommunityIcons name={s.icon} size={20} color={COLORS.white} />
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {isLoggedIn && (user?.role === USER_ROLES.SENDER || user?.role === USER_ROLES.BOTH) && (
          <TouchableOpacity onPress={() => navigation.navigate('Créer')} style={styles.ctaBtn} activeOpacity={0.88}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.ctaText}>{t('home.publishParcel')}</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.recentParcels')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Annonces')}>
            <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
          </TouchableOpacity>
        </View>
        {parcels.length === 0 ? (
          <EmptyState icon="package-variant-closed" title={t('parcels.noResults')} description={t('parcels.noResultsDescription')} />
        ) : (
          parcels.map((parcel) => (
            <ParcelCard key={parcel._id} parcel={parcel} onPress={() => handleParcelPress(parcel)} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1, backgroundColor: COLORS.background },
  header:       { paddingHorizontal: 20, paddingBottom: 28 },
  headerRow:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  headerLeft:   { flex: 1 },
  greeting:     { fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  headerSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  notifBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge:        { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.white },
  badgeText:    { fontSize: 10, fontWeight: '800', color: COLORS.white },
  statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard:     { flex: 1, alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingVertical: 12 },
  statValue:    { fontSize: 20, fontWeight: '800', color: COLORS.white },
  statLabel:    { fontSize: 10, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  ctaBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.white, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24 },
  ctaText:      { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  section:      { padding: 20 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  seeAll:       { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});