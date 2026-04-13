import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, TextInput, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminService } from '../../services/adminService';
import Avatar  from '../../components/common/Avatar';
import Loader  from '../../components/common/Loader';
import COLORS  from '../../constants/colors';
import moment  from 'moment';

export default function AdminConversationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [search,        setSearch]        = useState('');

  useFocusEffect(useCallback(() => { load(); }, [])); // eslint-disable-line

  async function load(isRefresh = false) {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const data = await adminService.getConversations({ limit: 100 });
      setConversations(data.conversations || []);
    } catch (e) {
      console.warn('AdminConversations:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filtered = search.trim()
    ? conversations.filter(conv =>
        conv.participants.some(p =>
          `${p.prenom} ${p.nom}`.toLowerCase().includes(search.toLowerCase())
        )
      )
    : conversations;

  function renderItem({ item }) {
    const names = item.participants.map(p => `${p.prenom} ${p.nom}`).join(' · ');
    const last  = item.dernierMessage?.contenu || '—';
    const date  = item.updatedAt ? moment(item.updatedAt).format('DD/MM HH:mm') : '';

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('AdminConversation', {
          conversationId: item._id,
          participants:   item.participants,
        })}
        activeOpacity={0.75}
      >
        <View style={styles.avatars}>
          {item.participants.slice(0, 2).map((p, i) => (
            <Avatar
              key={p._id}
              uri={p.photoProfil}
              name={`${p.prenom} ${p.nom}`}
              size={40}
              style={i === 1 ? styles.avatarOverlap : null}
            />
          ))}
        </View>
        <View style={styles.info}>
          <Text style={styles.names} numberOfLines={1}>{names}</Text>
          <Text style={styles.lastMsg} numberOfLines={1}>{last}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.date}>{date}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.placeholder} />
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Conversations</Text>
        <Text style={styles.count}>{filtered.length}</Text>
      </View>

      {/* Recherche */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.placeholder} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un participant..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.placeholder} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>Aucune conversation</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:          { flex: 1, backgroundColor: COLORS.background },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12,
                   paddingHorizontal: 16, paddingVertical: 12,
                   borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn:       { padding: 4 },
  title:         { flex: 1, fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  count:         { fontSize: 13, color: COLORS.placeholder, fontWeight: '600' },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', gap: 8,
                   margin: 12, paddingHorizontal: 12, paddingVertical: 10,
                   backgroundColor: COLORS.card, borderRadius: 12,
                   borderWidth: 1, borderColor: COLORS.border },
  searchInput:   { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  row:           { flexDirection: 'row', alignItems: 'center', gap: 12,
                   paddingHorizontal: 16, paddingVertical: 14,
                   borderBottomWidth: 1, borderBottomColor: COLORS.border,
                   backgroundColor: COLORS.card },
  avatars:       { flexDirection: 'row', width: 52 },
  avatarOverlap: { marginLeft: -14 },
  info:          { flex: 1, gap: 3 },
  names:         { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  lastMsg:       { fontSize: 12, color: COLORS.textSecondary },
  right:         { alignItems: 'flex-end', gap: 4 },
  date:          { fontSize: 11, color: COLORS.placeholder },
  empty:         { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText:     { fontSize: 15, color: COLORS.placeholder },
});