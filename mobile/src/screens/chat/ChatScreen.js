import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, Text,
  TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }       from '../../context/AuthContext';
import { chatService }   from '../../services/chatService';
import { socketService } from '../../services/socketService';
import MessageBubble from '../../components/chat/MessageBubble';
import ChatInput     from '../../components/chat/ChatInput';
import Avatar        from '../../components/common/Avatar';
import Loader        from '../../components/common/Loader';
import ReportModal   from '../../components/common/ReportModal';
import COLORS        from '../../constants/colors';
import { t }         from '../../i18n/index';
import moment        from 'moment';

export default function ChatScreen({ navigation, route }) {
  const { conversationId, otherUser: otherUserParam } = route.params || {};
  const { user }    = useAuth();
  const insets      = useSafeAreaInsets();
  const flatRef     = useRef(null);

  const [otherUser,  setOtherUser]  = useState(otherUserParam || null);
  const [messages,   setMessages]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [page,       setPage]       = useState(1);
  const [hasMore,    setHasMore]    = useState(true);
  const [showReport, setShowReport] = useState(false);
  const shouldScrollRef = useRef(true);
  const handleMessagesRead = useCallback(() => {}, []);



  // ── Fetch messages ──────────────────────────────────────────
  const fetchMessages = useCallback(async (pg, reset = false) => {
    try {
      if (pg === 1) setLoading(true);
      const data = await chatService.getMessages(conversationId, pg);
      const msgs = data.messages || [];
      if (reset) {
        shouldScrollRef.current = true;
        setMessages(msgs);
        // Extraire otherUser depuis les messages si absent
        if (!otherUserParam && msgs.length > 0) {
          const other = msgs.map(m => m.auteur)
            .find(a => a && String(a._id) !== String(user?._id));
          if (other) setOtherUser(other);
        }

      } else {
        shouldScrollRef.current = false;
        setMessages(prev => [...msgs, ...prev]);
      }
      setHasMore(msgs.length === 30);
      setPage(pg);
    } catch (e) {
      console.warn('ChatScreen fetch:', e.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // ── Nouveau message reçu via socket ────────────────────────
  const handleNewMessage = useCallback((data) => {
    const msg = data?.message || data;
    const msgConvId = msg?.conversation?._id || msg?.conversation || msg?.conversationId;
    if (String(msgConvId) !== String(conversationId)) return;

    setMessages(prev => {
      if (prev.some(m => String(m._id) === String(msg._id))) return prev;
      return [...prev, msg];
    });
    shouldScrollRef.current = true;
    scrollToBottom();
    // Marquer comme lu seulement si le message vient de l'autre
    const senderId = msg?.auteur?._id || msg?.auteur;
    if (String(senderId) !== String(user?._id)) {
      chatService.markAsRead(conversationId).catch(() => {});
    }
  }, [conversationId, user?._id]);

  // ── Setup ───────────────────────────────────────────────────
  useEffect(() => {
    fetchMessages(1, true);
    chatService.markAsRead(conversationId).catch(() => {});

    // Charger otherUser si absent (navigation depuis notification)
    if (!otherUserParam) {
      chatService.getConversationById(conversationId)
        .then(conv => {
          const other = conv.participants?.find(p => String(p._id) !== String(user?._id));
          if (other) setOtherUser(other);
        }).catch(() => {});
    }

    async function setupSocket() {
      const socket = await socketService.connect();
      // ✅ Attacher les listeners AVANT join pour ne manquer aucun événement
      socket.on('new_message',   handleNewMessage);
      socket.on('messages_read', handleMessagesRead);
      socket.emit('join_conversation', conversationId);
    }
    setupSocket();

    return () => {
      // ✅ Marquer comme lu au démontage (quand B quitte la discussion)
      chatService.markAsRead(conversationId).catch(() => {});
      // ✅ Émettre localement pour reset optimiste immédiat dans ConversationsScreen
      // ✅ Stocker dans global pour que ConversationsScreen le lise au focus
      global.__lastReadConversationId = conversationId;
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('new_message',   handleNewMessage);
        socket.off('messages_read', handleMessagesRead);
      }
    };
  }, [conversationId, fetchMessages, handleNewMessage, handleMessagesRead]);

  // ── Envoi ───────────────────────────────────────────────────
  async function handleSend(text) {
    setSending(true);
    try {
      await chatService.sendMessage(conversationId, text);
    } catch (e) {
      console.warn('Send:', e.message);
    } finally {
      setSending(false);
    }
  }

  function scrollToBottom() {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  }

  function loadMore() {
    if (!hasMore || loading) return;
    fetchMessages(page + 1);
  }

  function formatDaySeparator(date) {
    const d = moment(date);
    if (d.isSame(moment(), 'day'))                    return "Aujourd'hui";
    if (d.isSame(moment().subtract(1, 'day'), 'day')) return 'Hier';
    return d.format('DD/MM/YYYY');
  }

  // ── Grouper par jour ────────────────────────────────────────
  const messagesWithSeparators = [];
  let lastDay = null;
  messages.forEach((msg) => {
    const day = moment(msg.createdAt).format('YYYY-MM-DD');
    if (day !== lastDay) {
      messagesWithSeparators.push({ _type: 'separator', id: `sep_${day}`, label: formatDaySeparator(msg.createdAt) });
      lastDay = day;
    }
    messagesWithSeparators.push({ _type: 'message', ...msg });
  });

  const otherName = otherUser
    ? `${otherUser.prenom} ${otherUser.nom}`
    : 'Chat';

  if (loading) return <Loader fullScreen />;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Messages', { screen: 'Conversations' })}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.7}
          onPress={() => otherUser?._id && navigation.navigate('UserProfile', {
            userId:   otherUser._id,
            userName: otherName,
          })}
        >
          <Avatar uri={otherUser?.photoProfil} name={otherName} size={38} />
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{otherName}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowReport(true)} style={styles.reportBtn}>
          <MaterialCommunityIcons name="flag-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatRef}
        data={messagesWithSeparators}
        keyExtractor={item => item.id || item._id || String(Math.random())}
        renderItem={({ item }) => {
          if (item._type === 'separator') {
            return (
              <View style={styles.daySep}>
                <Text style={styles.daySepTxt}>{item.label}</Text>
              </View>
            );
          }
          const isOwn = String(item.auteur?._id || item.auteur) === String(user?._id);

          return (
            <MessageBubble
              message={item}
              isOwn={isOwn}
            />
          );
        }}
        contentContainerStyle={styles.messageList}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.2}
        onContentSizeChange={() => {
          if (shouldScrollRef.current) {
            flatRef.current?.scrollToEnd({ animated: false });
          }
        }}
        showsVerticalScrollIndicator={false}
      />

      <ChatInput onSend={handleSend} sending={sending} />

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        type="message"
        cibleUser={otherUser?._id}
        cibleConversation={conversationId}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F2F2F7' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C7C7CC',
  },
  backBtn:      { paddingHorizontal: 4, paddingVertical: 6 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  headerName:   { fontSize: 16, fontWeight: '600', color: '#000' },
  reportBtn:    { padding: 8 },

  messageList: { paddingVertical: 8, paddingHorizontal: 0 },

  daySep:    { alignItems: 'center', marginVertical: 14 },
  daySepTxt: { fontSize: 12, color: '#8E8E93', fontWeight: '500', backgroundColor: '#F2F2F7', paddingHorizontal: 10 },
});