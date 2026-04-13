import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { adminService } from '../../services/adminService';
import Avatar     from '../../components/common/Avatar';
import Loader     from '../../components/common/Loader';
import COLORS     from '../../constants/colors';
import moment     from 'moment';

const ROLE_FILTERS = [
  { label: 'Tous',       value: '' },
  { label: 'Expéditeur', value: 'sender' },
  { label: 'Transporteur', value: 'carrier' },
  { label: 'Les deux',   value: 'both' },
];

export default function AdminUsersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [role,       setRole]       = useState('');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore,setLoadingMore]= useState(false);
  const searchTimer = useRef(null);

  useFocusEffect(useCallback(() => { load(1, true); }, []));

  async function load(p = 1, reset = false) {
    try {
      if (reset) setLoading(true);
      const data = await adminService.getUsers({ page: p, limit: 20, search, role });
      setUsers(prev => reset ? data.users : [...prev, ...data.users]);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(1, true);
    setRefreshing(false);
  }, [search, role]);

  function onSearchChange(text) {
    setSearch(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, true), 500);
  }

  function onRoleFilter(val) {
    setRole(val);
    setTimeout(() => load(1, true), 100);
  }

  function loadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    load(page + 1);
  }

  function confirmToggleBan(user) {
    const action = user.isActif ? 'suspendre' : 'réactiver';
    Alert.alert(
      `${user.isActif ? 'Suspendre' : 'Réactiver'} ce compte`,
      `Voulez-vous vraiment ${action} ${user.prenom} ${user.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: user.isActif ? 'Suspendre' : 'Réactiver', style: user.isActif ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const result = await adminService.toggleBan(user._id);
              setUsers(prev => prev.map(u =>
                u._id === user._id ? { ...u, isActif: !u.isActif } : u
              ));
              Alert.alert('✅', result.message);
            } catch (e) { Alert.alert('Erreur', e.message); }
          },
        },
      ]
    );
  }

  function confirmDelete(user) {
    Alert.alert(
      '⚠️ Suppression définitive',
      `Supprimer le compte de ${user.prenom} ${user.nom} ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteUser(user._id);
              setUsers(prev => prev.filter(u => u._id !== user._id));
            } catch (e) { Alert.alert('Erreur', e.message); }
          },
        },
      ]
    );
  }

  function renderUser({ item }) {
    const name = `${item.prenom} ${item.nom}`;
    return (
      <TouchableOpacity
        style={[styles.userCard, !item.isActif && styles.bannedCard]}
        onPress={() => navigation.navigate('UserProfile', { userId: item._id, userName: `${item.prenom} ${item.nom}` })}
        activeOpacity={0.8}
      >
        <Avatar uri={item.photoProfil} name={name} size={46} />
        <View style={styles.userInfo}>
          <View style={styles.userTop}>
            <Text style={styles.userName}>{name}</Text>
            {!item.isActif && <Text style={styles.bannedBadge}>Suspendu</Text>}
            {item.isAdmin  && <Text style={styles.adminBadge}>Admin</Text>}
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userMeta}>
            {item.role} · {item.wilaya} · {moment(item.createdAt).format('DD/MM/YYYY')}
          </Text>
        </View>
        <View style={styles.userActions}>
          <TouchableOpacity onPress={() => confirmToggleBan(item)} style={styles.actionBtn}>
            <Ionicons name={item.isActif ? 'ban-outline' : 'checkmark-circle-outline'}
              size={22} color={item.isActif ? COLORS.error : COLORS.success} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Utilisateurs</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={COLORS.placeholder} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher nom, email, tél..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={onSearchChange}
        />
        {search ? (
          <TouchableOpacity onPress={() => { setSearch(''); load(1, true); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.placeholder} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filters}>
        {ROLE_FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            onPress={() => onRoleFilter(f.value)}
            style={[styles.filterChip, role === f.value && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, role === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item._id}
        renderItem={renderUser}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: COLORS.background },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:      { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  searchBox:  { flexDirection: 'row', alignItems: 'center', gap: 8,
                margin: 12, paddingHorizontal: 12, paddingVertical: 10,
                backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput:{ flex: 1, fontSize: 14, color: COLORS.textPrimary },
  filters:    { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText:       { fontSize: 12, color: COLORS.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  userCard:   { flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 16, paddingVertical: 12,
                borderBottomWidth: 1, borderBottomColor: COLORS.border,
                backgroundColor: COLORS.card },
  bannedCard: { opacity: 0.6, backgroundColor: '#FEF2F2' },
  userInfo:   { flex: 1 },
  userTop:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  bannedBadge:{ fontSize: 10, color: COLORS.error, fontWeight: '700',
                backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  adminBadge: { fontSize: 10, color: COLORS.primary, fontWeight: '700',
                backgroundColor: COLORS.primary + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  userEmail:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  userMeta:   { fontSize: 11, color: COLORS.placeholder, marginTop: 2 },
  userActions:{ flexDirection: 'row', gap: 4 },
  actionBtn:  { padding: 6 },
});