import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, KeyboardAvoidingView, Platform,
  TouchableOpacity, Alert, RefreshControl, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { adminService } from '../../services/adminService';
import Avatar  from '../../components/common/Avatar';
import Loader  from '../../components/common/Loader';
import COLORS  from '../../constants/colors';
import moment  from 'moment';

const STATUS_FILTERS = [
  { label: '⏳ En attente', value: 'en_attente' },
  { label: '✅ Traités',     value: 'traite' },
  { label: '🙈 Ignorés',    value: 'ignore' },
  { label: 'Tous',           value: '' },
];

const REASON_LABELS = {
  contenu_inapproprie: 'Contenu inapproprié',
  escroquerie:         'Escroquerie',
  fausse_annonce:      'Fausse annonce',
  comportement_abusif: 'Comportement abusif',
  spam:                'Spam',
  autre:               'Autre',
};

const TYPE_ICONS = {
  utilisateur: 'person-outline',
  annonce:     'cube-outline',
  avis:        'star-outline',
  message:     'chatbubble-outline',
};

export default function AdminSignalementsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statut,     setStatut]     = useState('en_attente');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal,      setModal]      = useState(null);   // report sélectionné
  const [noteAdmin,  setNoteAdmin]  = useState('');

  useFocusEffect(useCallback(() => { load(1, true); }, [statut]));

  async function load(p = 1, reset = false) {
    try {
      if (reset) setLoading(true);
      const data = await adminService.getReports({ page: p, limit: 20, statut });
      setReports(prev => reset ? data.reports : [...prev, ...data.reports]);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setLoading(false); }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(1, true); setRefreshing(false);
  }, [statut]);

  async function handle(report, newStatut) {
    try {
      await adminService.handleReport(report._id, newStatut, noteAdmin);
      setReports(prev => prev.filter(r => r._id !== report._id));
      setModal(null);
      setNoteAdmin('');
      Alert.alert('✅', newStatut === 'traite' ? 'Signalement marqué traité' : 'Signalement ignoré');
    } catch (e) { Alert.alert('Erreur', e.message); }
  }

  function confirmDelete(report) {
    Alert.alert('Supprimer', 'Supprimer ce signalement définitivement ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await adminService.deleteReport(report._id);
          setReports(prev => prev.filter(r => r._id !== report._id));
        } catch (e) { Alert.alert('Erreur', e.message); }
      }},
    ]);
  }

  function getCibleText(report) {
    if (report.cibleUser)         return `${report.cibleUser.prenom} ${report.cibleUser.nom}`;
    if (report.cibleParcel)       return report.cibleParcel.titre || `${report.cibleParcel.villeDepart} → ${report.cibleParcel.villeArrivee}`;
    if (report.cibleAvis)         return `Avis ${report.cibleAvis.note}★`;
    if (report.cibleConversation) return 'Conversation signalée';
    return '—';
  }

  function renderReport({ item }) {
    const auteurName = `${item.auteur?.prenom || ''} ${item.auteur?.nom || ''}`.trim();
    const isNew = item.statut === 'en_attente';

    return (
      <View style={[styles.card, isNew && styles.cardNew]}>
        {/* ── En-tête type + raison ── */}
        <View style={styles.cardTop}>
          <View style={styles.typeTag}>
            <Ionicons name={TYPE_ICONS[item.type] || 'alert-circle-outline'} size={14} color={COLORS.primary} />
            <Text style={styles.typeText}>{item.type}</Text>
          </View>
          <View style={[styles.raisonTag, { backgroundColor: isNew ? '#FEF3C7' : COLORS.border }]}>
            <Text style={styles.raisonText}>{REASON_LABELS[item.raison] || item.raison}</Text>
          </View>
          <Text style={styles.date}>{moment(item.createdAt).format('DD/MM/YY HH:mm')}</Text>
        </View>

        {/* ── Auteur → Cible ── */}
        <View style={styles.usersRow}>
          <TouchableOpacity
            style={styles.userBlock}
            activeOpacity={item.auteur?._id ? 0.7 : 1}
            onPress={() => item.auteur?._id && navigation.navigate('UserProfile', {
              userId: item.auteur._id,
              userName: auteurName,
            })}
          >
            <Avatar uri={item.auteur?.photoProfil} name={auteurName} size={32} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.userLabel}>Signalé par → voir</Text>
              <Text style={styles.userName} numberOfLines={1}>{auteurName || '—'}</Text>
            </View>
          </TouchableOpacity>
          <Ionicons name="arrow-forward" size={16} color={COLORS.placeholder} />
          <TouchableOpacity
            style={styles.userBlock}
            activeOpacity={item.cibleParcel || item.cibleUser ? 0.7 : 1}
            onPress={() => {
              if (item.cibleParcel?._id) {
                navigation.navigate('ParcelDetail', { parcelId: item.cibleParcel._id });
              } else if (item.cibleUser?._id) {
                navigation.navigate('UserProfile', {
                  userId: item.cibleUser._id,
                  userName: `${item.cibleUser.prenom} ${item.cibleUser.nom}`,
                });
              }
            }}
          >
            <Ionicons name="alert-circle-outline" size={32} color={COLORS.error} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.userLabel}>
                Cible {(item.cibleParcel || item.cibleUser) ? '→ voir' : ''}
              </Text>
              <Text style={styles.userName} numberOfLines={1}>{getCibleText(item)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Bouton conversation (type message) ── */}
        {item.type === 'message' && (
          <TouchableOpacity
            style={styles.convBtn}
            activeOpacity={0.75}
            onPress={async () => {
              // Cas 1 : cibleConversation directement disponible
              const convId = item.cibleConversation?._id || item.cibleConversation;
              const parts  = item.cibleConversation?.participants || [];
              if (convId) {
                navigation.navigate('AdminConversation', { conversationId: convId, participants: parts });
                return;
              }
              // Cas 2 (fallback) : retrouver la conv entre auteur et cibleUser
              const u1 = item.auteur?._id || item.auteur;
              const u2 = item.cibleUser?._id || item.cibleUser;
              if (!u1 || !u2) return;
              try {
                const res = await adminService.getConversationBetween(u1, u2);
                const conv = res.conversation;
                navigation.navigate('AdminConversation', {
                  conversationId: conv._id,
                  participants:   conv.participants || [],
                });
              } catch {
                Alert.alert('Introuvable', "Aucune conversation entre ces deux utilisateurs.");
              }
            }}
          >
            <Ionicons name="chatbubbles-outline" size={16} color={COLORS.primary} />
            <Text style={styles.convBtnText}>Lire la conversation</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* ── Description ── */}
        {item.description ? (
          <Text style={styles.description}>« {item.description} »</Text>
        ) : null}

        {/* ── Note admin si traité ── */}
        {item.noteAdmin ? (
          <Text style={styles.noteAdmin}>📝 {item.noteAdmin}</Text>
        ) : null}

        {/* ── Actions ── */}
        <View style={styles.actions}>
          {isNew && (
            <>
              <TouchableOpacity
                style={[styles.btn, styles.btnTraite]}
                onPress={() => { setModal(item); setNoteAdmin(''); }}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.btnText}>Traiter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnIgnore]}
                onPress={() => handle(item, 'ignore')}
              >
                <Ionicons name="eye-off-outline" size={16} color="#fff" />
                <Text style={styles.btnText}>Ignorer</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: COLORS.border, flex: isNew ? 0 : 1 }]}
            onPress={() => confirmDelete(item)}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) return <Loader fullScreen />;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Signalements</Text>
      </View>

      <View style={styles.filters}>
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setStatut(f.value)}
            style={[styles.chip, statut === f.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, statut === f.value && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={reports}
        keyExtractor={item => item._id}
        renderItem={renderReport}
        onEndReached={() => { if (page < totalPages) load(page + 1); }}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={<Text style={styles.empty}>Aucun signalement</Text>}
      />

      {/* ── Modal traitement avec note ── */}
      <Modal visible={!!modal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={20}
        >
          <ScrollView
            contentContainerStyle={styles.modalOverlay}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Traiter le signalement</Text>
              <Text style={styles.modalSub}>
                {modal ? `${modal.type} · ${REASON_LABELS[modal.raison]}` : ''}
              </Text>
              <Text style={styles.modalLabel}>Note interne (optionnel)</Text>
              <TextInput
                style={styles.noteInput}
                multiline
                numberOfLines={4}
                placeholder="Action prise, décision, contexte..."
                placeholderTextColor={COLORS.placeholder}
                value={noteAdmin}
                onChangeText={setNoteAdmin}
                textAlignVertical="top"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnTraite, { flex: 1 }]}
                  onPress={() => handle(modal, 'traite')}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.btnText}>Marquer traité</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { flex: 1, backgroundColor: COLORS.border }]}
                  onPress={() => setModal(null)}
                >
                  <Text style={[styles.btnText, { color: COLORS.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: COLORS.background },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12,
                 paddingHorizontal: 16, paddingVertical: 14,
                 borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:       { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  filters:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                 backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:    { fontSize: 12, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  card:        { backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
                 borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  cardNew:     { borderColor: '#F59E0B', borderWidth: 1.5 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  typeTag:     { flexDirection: 'row', alignItems: 'center', gap: 4,
                 backgroundColor: COLORS.primary + '15', borderRadius: 8,
                 paddingHorizontal: 8, paddingVertical: 3 },
  typeText:    { fontSize: 11, color: COLORS.primary, fontWeight: '700', textTransform: 'capitalize' },
  raisonTag:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  raisonText:  { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
  date:        { fontSize: 11, color: COLORS.placeholder, marginLeft: 'auto' },
  usersRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  convBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8,
                 backgroundColor: COLORS.primary + '15', borderRadius: 10,
                 paddingVertical: 10, paddingHorizontal: 14,
                 marginTop: 8, borderWidth: 1, borderColor: COLORS.primary + '30' },
  convBtnText: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.primary },
  userBlock:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  userLabel:   { fontSize: 10, color: COLORS.placeholder },
  userName:    { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1 },
  description: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic',
                 backgroundColor: COLORS.background, padding: 10, borderRadius: 8 },
  noteAdmin:   { fontSize: 12, color: COLORS.primary, backgroundColor: COLORS.primary + '10',
                 padding: 8, borderRadius: 8 },
  actions:     { flexDirection: 'row', gap: 8 },
  btn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                 gap: 5, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, flex: 1 },
  btnTraite:   { backgroundColor: COLORS.success },
  btnIgnore:   { backgroundColor: '#6B7280' },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty:       { textAlign: 'center', color: COLORS.placeholder, marginTop: 40, fontSize: 14 },
  modalOverlay:{ flexGrow: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox:    { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, gap: 12 },
  modalTitle:  { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  modalSub:    { fontSize: 13, color: COLORS.textSecondary },
  modalLabel:  { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  noteInput:   { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
                 padding: 10, fontSize: 14, color: COLORS.textPrimary,
                 minHeight: 80, textAlignVertical: 'top' },
  modalActions:{ flexDirection: 'row', gap: 8 },
});