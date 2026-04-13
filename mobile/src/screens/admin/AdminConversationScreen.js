import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminService } from '../../services/adminService';
import Avatar  from '../../components/common/Avatar';
import Loader  from '../../components/common/Loader';
import COLORS  from '../../constants/colors';
import moment  from 'moment';

export default function AdminConversationScreen({ navigation, route }) {
  const { conversationId, participants = [] } = route.params;
  const insets  = useSafeAreaInsets();
  const flatRef = useRef(null);

  const [messages,  setMessages]  = useState([]);
  const [convInfo,  setConvInfo]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await adminService.getConversationMessages(conversationId, { limit: 200 });
      setMessages(data.messages || []);
      setConvInfo(data.conversation || null);
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      '🗑 Supprimer la conversation',
      'Tous les messages seront définitivement supprimés. Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: deleteConv },
      ]
    );
  }

  async function deleteConv() {
    try {
      setDeleting(true);
      await adminService.deleteConversation(conversationId);
      Alert.alert('✅ Supprimée', 'La conversation a été supprimée.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || e.message);
    } finally {
      setDeleting(false);
    }
  }

  const parts = convInfo?.participants || participants;
  const names = parts.map(p => `${p.prenom} ${p.nom}`).join(' · ');

  // Construire un map userId → participant pour identifier les bulles
  const participantMap = {};
  parts.forEach(p => { participantMap[p._id] = p; });
  const firstId = parts[0]?._id;

  function renderMessage({ item }) {
    const isLeft = item.auteur?._id === firstId || item.auteur === firstId;
    const author = item.auteur;
    const name   = author ? `${author.prenom} ${author.nom}` : '?';
    const time   = moment(item.createdAt).format('HH:mm');

    return (
      <View style={[styles.msgRow, isLeft ? styles.msgLeft : styles.msgRight]}>
        {isLeft && (
          <Avatar uri={author?.photoProfil} name={name} size={28} />
        )}
        <View style={[styles.bubble, isLeft ? styles.bubbleLeft : styles.bubbleRight]}>
          <Text style={[styles.bubbleAuthor, !isLeft && { color: 'rgba(255,255,255,0.8)' }]}>
            {name}
          </Text>
          <Text style={[styles.bubbleText, !isLeft && { color: '#fff' }]}>
            {item.contenu}
          </Text>
          <Text style={[styles.bubbleTime, !isLeft && { color: 'rgba(255,255,255,0.65)' }]}>
            {time}
          </Text>
        </View>
        {!isLeft && (
          <Avatar uri={author?.photoProfil} name={name} size={28} />
        )}
      </View>
    );
  }

  // Séparateurs de date
  const messagesWithDates = [];
  let lastDate = null;
  messages.forEach(msg => {
    const d = moment(msg.createdAt).format('DD MMMM YYYY');
    if (d !== lastDate) {
      messagesWithDates.push({ _id: `sep-${d}`, type: 'sep', label: d });
      lastDate = d;
    }
    messagesWithDates.push(msg);
  });

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>{names}</Text>
          <Text style={styles.subtitle}>{messages.length} messages · lecture seule</Text>
        </View>
        <TouchableOpacity
          onPress={confirmDelete}
          style={styles.deleteBtn}
          disabled={deleting}
        >
          {deleting
            ? <ActivityIndicator size="small" color={COLORS.error} />
            : <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          }
        </TouchableOpacity>
      </View>

      {/* Avatars des participants */}
      <View style={styles.participantsBar}>
        {parts.map(p => (
          <TouchableOpacity
            key={p._id}
            style={styles.participantChip}
            onPress={() => navigation.navigate('UserProfile', {
              userId: p._id,
              userName: `${p.prenom} ${p.nom}`,
            })}
          >
            <Avatar uri={p.photoProfil} name={`${p.prenom} ${p.nom}`} size={32} />
            <Text style={styles.participantName}>{p.prenom} {p.nom}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Messages */}
      <FlatList
        ref={flatRef}
        data={messagesWithDates}
        keyExtractor={item => item._id}
        renderItem={({ item }) => {
          if (item.type === 'sep') {
            return (
              <View style={styles.dateSep}>
                <Text style={styles.dateSepText}>{item.label}</Text>
              </View>
            );
          }
          return renderMessage({ item });
        }}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyText}>Aucun message</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:             { flex: 1, backgroundColor: COLORS.background },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingHorizontal: 16, paddingVertical: 12,
                      borderBottomWidth: 1, borderBottomColor: COLORS.border,
                      backgroundColor: COLORS.card },
  backBtn:          { padding: 4 },
  headerInfo:       { flex: 1 },
  title:            { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  subtitle:         { fontSize: 11, color: COLORS.placeholder, marginTop: 1 },
  deleteBtn:        { padding: 8, backgroundColor: COLORS.error + '15', borderRadius: 10 },
  participantsBar:  { flexDirection: 'row', gap: 12, padding: 12,
                      backgroundColor: COLORS.card,
                      borderBottomWidth: 1, borderBottomColor: COLORS.border },
  participantChip:  { flexDirection: 'row', alignItems: 'center', gap: 6,
                      backgroundColor: COLORS.background, borderRadius: 20,
                      paddingHorizontal: 10, paddingVertical: 4 },
  participantName:  { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  list:             { paddingHorizontal: 12, paddingTop: 12, gap: 4 },
  msgRow:           { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 },
  msgLeft:          { justifyContent: 'flex-start' },
  msgRight:         { justifyContent: 'flex-end' },
  bubble:           { maxWidth: '72%', padding: 10, borderRadius: 16, gap: 2 },
  bubbleLeft:       { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
                      borderBottomLeftRadius: 4 },
  bubbleRight:      { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleAuthor:     { fontSize: 10, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  bubbleText:       { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  bubbleTime:       { fontSize: 10, color: COLORS.placeholder, alignSelf: 'flex-end', marginTop: 2 },
  dateSep:          { alignItems: 'center', marginVertical: 12 },
  dateSepText:      { fontSize: 11, color: COLORS.placeholder, backgroundColor: COLORS.border + '50',
                      paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  empty:            { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText:        { fontSize: 15, color: COLORS.placeholder },
});