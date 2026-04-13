import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Image,
  TouchableOpacity, Alert, RefreshControl, Modal, TextInput,
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
  { label: 'En attente', value: 'en_attente' },
  { label: 'Validés',    value: 'valide' },
  { label: 'Refusés',    value: 'refuse' },
];

const DOC_LABELS = {
  carteIdentite:  "Carte d'identité",
  permisConduire: 'Permis de conduire',
  carteGrise:     'Carte grise',
  assurance:      'Assurance',
};

export default function AdminDocumentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statut,     setStatut]     = useState('en_attente');
  const [refusModal, setRefusModal] = useState(null);   // userId en cours de refus
  const [motif,      setMotif]      = useState('');
  const [imgModal,   setImgModal]   = useState(null);   // url image plein écran

  useFocusEffect(useCallback(() => { load(); }, [statut]));

  async function load() {
    try {
      setLoading(true);
      const data = await adminService.getDocuments({ statut });
      setUsers(data.users || []);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setLoading(false); }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [statut]);

  async function validate(userId) {
    try {
      await adminService.validateDocs(userId, 'valide');
      setUsers(prev => prev.filter(u => u._id !== userId));
      Alert.alert('✅', 'Documents validés');
    } catch (e) { Alert.alert('Erreur', e.message); }
  }

  async function refuse() {
    try {
      await adminService.validateDocs(refusModal, 'refuse', motif);
      setUsers(prev => prev.filter(u => u._id !== refusModal));
      setRefusModal(null);
      setMotif('');
      Alert.alert('✅', 'Documents refusés');
    } catch (e) { Alert.alert('Erreur', e.message); }
  }

  function renderUser({ item }) {
    const name = `${item.prenom} ${item.nom}`;
    const docs = item.documents || {};
    const docKeys = ['carteIdentite', 'permisConduire', 'carteGrise', 'assurance']
      .filter(k => docs[k]);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Avatar uri={item.photoProfil} name={name} size={44} />
          <View style={styles.info}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.meta}>{item.telephone} · {item.wilaya}</Text>
            <Text style={styles.date}>Inscrit le {moment(item.createdAt).format('DD/MM/YYYY')}</Text>
          </View>
        </View>

        <View style={styles.docRow}>
          {docKeys.map(key => (
            <TouchableOpacity key={key} onPress={() => setImgModal(docs[key])} style={styles.docThumb}>
              <Image source={{ uri: docs[key] }} style={styles.docImg} />
              <Text style={styles.docLabel}>{DOC_LABELS[key]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {statut === 'en_attente' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnRefuse]}
              onPress={() => { setRefusModal(item._id); setMotif(''); }}
            >
              <Ionicons name="close-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnValid]}
              onPress={() => validate(item._id)}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Valider</Text>
            </TouchableOpacity>
          </View>
        )}
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
        <Text style={styles.title}>Documents</Text>
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
        data={users}
        keyExtractor={item => item._id}
        renderItem={renderUser}
        contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun document {statut === 'en_attente' ? 'en attente' : statut}</Text>
        }
      />

      {/* ── Modal motif de refus ── */}
      <Modal visible={!!refusModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Motif du refus (optionnel)</Text>
            <TextInput
              style={styles.motifInput}
              multiline
              numberOfLines={3}
              placeholder="Document illisible, photo floue..."
              placeholderTextColor={COLORS.placeholder}
              value={motif}
              onChangeText={setMotif}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.btnRefuse, { flex: 1 }]} onPress={refuse}>
                <Text style={styles.btnText}>Confirmer le refus</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: COLORS.border }]}
                onPress={() => setRefusModal(null)}>
                <Text style={[styles.btnText, { color: COLORS.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal image plein écran ── */}
      <Modal visible={!!imgModal} transparent animationType="fade">
        <TouchableOpacity style={styles.imgOverlay} onPress={() => setImgModal(null)} activeOpacity={1}>
          {imgModal && <Image source={{ uri: imgModal }} style={styles.imgFull} resizeMode="contain" />}
          <Ionicons name="close-circle" size={36} color="#fff" style={styles.closeBtn} />
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1, backgroundColor: COLORS.background },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 16, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:      { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  filters:    { flexDirection: 'row', gap: 8, padding: 12 },
  chip:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:   { fontSize: 13, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  card:       { backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
                borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  info:       { flex: 1 },
  name:       { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  email:      { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  meta:       { fontSize: 11, color: COLORS.placeholder, marginTop: 1 },
  date:       { fontSize: 11, color: COLORS.placeholder },
  docRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  docThumb:   { alignItems: 'center', gap: 4 },
  docImg:     { width: 72, height: 56, borderRadius: 8, backgroundColor: COLORS.border },
  docLabel:   { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 72 },
  actions:    { flexDirection: 'row', gap: 8 },
  btn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingVertical: 10, borderRadius: 10 },
  btnValid:   { backgroundColor: COLORS.success },
  btnRefuse:  { backgroundColor: COLORS.error },
  btnText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty:      { textAlign: 'center', color: COLORS.placeholder, marginTop: 40, fontSize: 14 },
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modal:      { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, gap: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  motifInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
                padding: 10, fontSize: 14, color: COLORS.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 8 },
  imgOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  imgFull:    { width: '100%', height: '80%' },
  closeBtn:   { position: 'absolute', top: 50, right: 20 },
});