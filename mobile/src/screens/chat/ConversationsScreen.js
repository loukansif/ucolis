import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatService }   from '../../services/chatService';
import { socketService } from '../../services/socketService';
import { useAuth }     from '../../context/AuthContext';
import Avatar     from '../../components/common/Avatar';
import EmptyState from '../../components/common/EmptyState';
import Loader     from '../../components/common/Loader';
import COLORS     from '../../constants/colors';
import { t }      from '../../i18n/index';
import moment     from 'moment';

export default function ConversationsScreen({ navigation }) {
  const { user }   = useAuth();
  const insets     = useSafeAreaInsets();
  const [convs,    setConvs]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [refreshing,setRefreshing]=useState(false);

  // ✅ Vérifier si une conversation a été lue (via global)
  useFocusEffect(useCallback(() => {
    const convId = global.__lastReadConversationId;
    if (convId) {
      global.__lastReadConversationId = null;
      // Reset optimiste immédiat
      setConvs(prev => prev.map(conv =>
        String(conv._id) === String(convId)
          ? { ...conv, unreadCount: (conv.unreadCount || []).map(u =>
              String(u.user?._id || u.user) === String(user?._id)
                ? { ...u, count: 0 }
                : u
            )}
          : conv
      ));
      // ✅ Attendre que markAsRead soit terminé en DB avant de recharger
      setTimeout(() => fetchConvs(), 600);
    } else {
      fetchConvs();
    }
  }, [user?._id]));

  // ✅ Rafraîchir la liste en temps réel quand on reçoit un nouveau message
  useEffect(() => {
    async function setupSocket() {
      const socket = await socketService.connect();
      // ✅ Rejoindre la room userId pour recevoir new_notification ciblées
      if (user?._id) socketService.joinUserRoom(user?._id);

      function handleNewMessage() {
        fetchConvs();
      }

      function handleMessagesRead({ conversationId: convId, readBy }) {
        // ✅ Reset optimiste immédiat si c'est moi qui lis
        if (String(readBy) === String(user?._id)) {
          setConvs(prev => prev.map(conv =>
            String(conv._id) === String(convId)
              ? { ...conv, unreadCount: (conv.unreadCount || []).map(u =>
                  String(u.user?._id || u.user) === String(user?._id)
                    ? { ...u, count: 0 }
                    : u
                )}
              : conv
          ));
        } else {
          fetchConvs();
        }
      }



      socket.on('new_notification', handleNewMessage);
      socket.on('messages_read',    handleMessagesRead);
      socket.on('new_message',      handleNewMessage);
      return () => {
        socket.off('new_notification',  handleNewMessage);
        socket.off('messages_read',     handleMessagesRead);
        socket.off('new_message',       handleNewMessage);
      };
    }

    let cleanup;
    setupSocket().then(fn => { cleanup = fn; });
    return () => { cleanup?.(); };
  }, [user?._id]);

  async function fetchConvs() {
    try {
      setLoading(true);
      const data = await chatService.getConversations();
      const sorted = (data || []).sort((a, b) => {
        const dateA = a.dernierMessage?.createdAt || a.updatedAt || 0;
        const dateB = b.dernierMessage?.createdAt || b.updatedAt || 0;
        return new Date(dateB) - new Date(dateA);
      });
      setConvs(sorted);
    } catch (e) {
      console.warn('Conversations:', e.message);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConvs();
    setRefreshing(false);
  }, []);

  function getOtherUser(conv) {
    return conv.participants?.find(p => p._id !== user?._id);
  }

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('chat.conversations')}</Text>
      </View>
      <FlatList
        data={convs}
        keyExtractor={item => item._id}
        renderItem={({ item }) => {
          const other = getOtherUser(item);
          const name  = other ? `${other.prenom} ${other.nom}` : '—';
          const unread = item.unreadCount?.find(u =>
            String(u.user?._id || u.user) === String(user?._id)
          )?.count || 0;
          return (
            <TouchableOpacity
              onPress={() => {
                // Optimistic reset du badge avant navigation
                setConvs(prev => prev.map(conv =>
                  conv._id === item._id
                    ? { ...conv, unreadCount: (conv.unreadCount || []).map(u =>
                        String(u.user?._id || u.user) === String(user?._id)
                          ? { ...u, count: 0 }
                          : u
                      )}
                    : conv
                ));
                navigation.push('Chat', {
                  conversationId: item._id,
                  otherUser: other,
                });
              }}
              style={[styles.convItem, unread > 0 && styles.convItemUnread]}
              activeOpacity={0.8}
            >
              <TouchableOpacity
                onPress={() => other?._id && navigation.navigate('UserProfile', {
                  userId: other._id, userName: name,
                })}
                activeOpacity={0.8}
              >
                <Avatar uri={other?.photoProfil} name={name} size={52} />
              </TouchableOpacity>
              <View style={styles.convInfo}>
                <View style={styles.convTop}>
                  <Text style={[styles.convName, unread > 0 && styles.convNameUnread]}>{name}</Text>
                  <Text style={[styles.convTime, unread > 0 && styles.convTimeUnread]}>
                    {item.dernierMessage?.createdAt
                      ? moment(item.dernierMessage.createdAt).fromNow()
                      : item.updatedAt ? moment(item.updatedAt).fromNow() : ''}
                  </Text>
                </View>
                <View style={styles.convBottom}>
                  <Text
                    style={[styles.lastMsg, unread > 0 && styles.lastMsgUnread]}
                    numberOfLines={1}
                  >
                    {item.dernierMessage?.contenu || '...'}
                  </Text>
                  {unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadTxt}>{unread > 99 ? '99+' : unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="message-text-outline"
            title={t('chat.noConversations')}
            description={t('chat.noConversationsDescription')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:  { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  list:   { paddingBottom: 24 },
  convItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  convItemUnread: {
    backgroundColor: COLORS.primary + '08',
  },
  convInfo:   { flex: 1 },
  convTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  convName:        { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  convNameUnread:  { color: COLORS.textPrimary },
  convTime:        { fontSize: 11, color: COLORS.placeholder },
  convTimeUnread:  { color: COLORS.primary, fontWeight: '600' },
  convBottom:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lastMsg:       { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  lastMsgUnread: { color: COLORS.textPrimary, fontWeight: '600' },
  unreadBadge:   {
    backgroundColor: COLORS.primary,
    borderRadius: 12, minWidth: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});