import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminService } from '../../services/adminService';
import Loader  from '../../components/common/Loader';
import COLORS  from '../../constants/colors';

function StatCard({ icon, label, value, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Ionicons name={icon} size={28} color={color} />
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const PARCEL_STATUS_LABELS = {
  disponible:     'Disponibles',
  en_negociation: 'En négo.',
  accepte:        'Acceptés',
  en_livraison:   'En route',
  livre:          'Livrés',
  annule:         'Annulés',
};

export default function AdminDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [stats,     setStats]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    try {
      setLoading(true);
      const data = await adminService.getStats();
      setStats(data);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  if (loading) return <Loader fullScreen />;

  const ps = stats?.parcels?.parStatus || {};

  return (
    <ScrollView
      style={[styles.flex, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={26} color={COLORS.primary} />
        <Text style={styles.title}>Administration</Text>
      </View>

      {/* ── Utilisateurs ── */}
      <Text style={styles.sectionTitle}>👥 Utilisateurs</Text>
      <View style={styles.grid}>
        <StatCard icon="people"            label="Total"    value={stats?.users?.total}        color={COLORS.primary}
          onPress={() => navigation.navigate('AdminUsers')} />
        <StatCard icon="checkmark-circle"  label="Actifs"   value={stats?.users?.actifs}       color={COLORS.success} />
        <StatCard icon="ban"               label="Bannis"   value={stats?.users?.bannis}       color={COLORS.error} />
        <StatCard icon="person-add"        label="Ce mois"  value={stats?.users?.newThisMonth} color={COLORS.warning} />
      </View>

      {/* ── Colis ── */}
      <Text style={styles.sectionTitle}>📦 Annonces</Text>
      <View style={styles.grid}>
        <StatCard icon="cube"           label="Total"     value={stats?.parcels?.total}        color={COLORS.primary}
          onPress={() => navigation.navigate('AdminParcels')} />
        <StatCard icon="add-circle"     label="Ce mois"   value={stats?.parcels?.newThisMonth} color={COLORS.success} />
        <StatCard icon="navigate"       label="En route"  value={ps.en_livraison || 0}         color="#F59E0B" />
        <StatCard icon="checkmark-done" label="Livrés"    value={ps.livre        || 0}         color={COLORS.success} />
      </View>

      {/* ── Status détail ── */}
      <Text style={styles.sectionTitle}>📊 Statuts des annonces</Text>
      <View style={styles.statusCard}>
        {Object.entries(PARCEL_STATUS_LABELS).map(([key, label]) => (
          <View key={key} style={styles.statusRow}>
            <Text style={styles.statusLabel}>{label}</Text>
            <Text style={styles.statusCount}>{ps[key] || 0}</Text>
          </View>
        ))}
      </View>

      {/* ── Accès rapide ── */}
      <Text style={styles.sectionTitle}>⚡ Accès rapide</Text>
      <View style={styles.quickLinks}>
        {[
          { icon: 'people-outline',        label: 'Utilisateurs',  screen: 'AdminUsers',     color: COLORS.primary },
          { icon: 'cube-outline',           label: 'Annonces',      screen: 'AdminParcels',   color: '#8B5CF6' },
          { icon: 'document-text-outline',  label: 'Documents',     screen: 'AdminDocuments', color: '#F59E0B',
            badge: stats?.docs?.enAttente },
          { icon: 'star-outline',           label: 'Avis',          screen: 'AdminReviews',       color: '#EC4899' },
          { icon: 'flag-outline',            label: 'Signalements',  screen: 'AdminSignalements',  color: '#EF4444',
            badge: stats?.signalements?.enAttente },
          { icon: 'chatbubbles-outline',      label: 'Conversations', screen: 'AdminConversations', color: '#6366F1' },
        ].map(item => (
          <TouchableOpacity
            key={item.screen}
            style={styles.quickCard}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
              {item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.quickLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:        { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
                  paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  statCard:     { flex: 1, minWidth: '44%', backgroundColor: COLORS.card, borderRadius: 12,
                  padding: 14, alignItems: 'center', gap: 4,
                  borderLeftWidth: 4, elevation: 1 },
  statValue:    { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  statLabel:    { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  statusCard:   { marginHorizontal: 16, backgroundColor: COLORS.card, borderRadius: 12, overflow: 'hidden' },
  statusRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statusLabel:  { fontSize: 14, color: COLORS.textPrimary },
  statusCount:  { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  quickLinks:   { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  quickCard:    { flex: 1, minWidth: '44%', backgroundColor: COLORS.card, borderRadius: 14,
                  padding: 18, alignItems: 'center', gap: 8, elevation: 1 },
  quickIcon:    { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  quickLabel:   { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  badge:        { position: 'absolute', top: -4, right: -4,
                  backgroundColor: COLORS.error, borderRadius: 10, minWidth: 18, height: 18,
                  alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText:    { color: '#fff', fontSize: 10, fontWeight: '700' },
});