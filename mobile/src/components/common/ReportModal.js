import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportService } from '../../services/reportService';
import COLORS from '../../constants/colors';

const REASONS = [
  { value: 'contenu_inapproprie', label: 'Contenu inapproprié' },
  { value: 'escroquerie',         label: 'Escroquerie / arnaque' },
  { value: 'fausse_annonce',      label: 'Fausse annonce' },
  { value: 'comportement_abusif', label: 'Comportement abusif' },
  { value: 'spam',                label: 'Spam' },
  { value: 'autre',               label: 'Autre' },
];

/**
 * Props:
 *  visible            : bool
 *  onClose            : () => void
 *  type               : 'utilisateur' | 'annonce' | 'avis' | 'message'
 *  cibleUser?         : string (userId)
 *  cibleParcel?       : string (parcelId)
 *  cibleAvis?         : string (reviewId)
 *  cibleConversation? : string (conversationId)
 */
export default function ReportModal({
  visible, onClose,
  type, cibleUser, cibleParcel, cibleAvis, cibleConversation,
}) {
  const [raison,      setRaison]      = useState('');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);

  async function submit() {
    if (!raison) { Alert.alert('', 'Veuillez choisir une raison'); return; }
    try {
      setLoading(true);
      await reportService.create({
        type, raison, description,
        cibleUser, cibleParcel, cibleAvis, cibleConversation,
      });
      Alert.alert('✅ Signalement envoyé', "Notre équipe va examiner ce signalement. Merci pour votre vigilance.");
      reset();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      if (msg?.includes('déjà signalé')) {
        Alert.alert('', 'Vous avez déjà signalé cet élément');
        onClose();
      } else {
        Alert.alert('Erreur', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function reset() { setRaison(''); setDescription(''); }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* ✅ KAV comme overlay → pousse le sheet vers le haut quand le clavier s'ouvre */}
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Zone vide cliquable pour fermer */}
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { reset(); onClose(); }} />

        <View style={styles.sheet}>
          {/* Header fixe, hors du scroll */}
          <View style={styles.header}>
            <Text style={styles.title}>🚩 Signaler</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ✅ ScrollView avec contentContainerStyle → paddingBottom géré proprement */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.label}>Raison du signalement</Text>

            {REASONS.map(r => (
              <TouchableOpacity
                key={r.value}
                style={[styles.reasonItem, raison === r.value && styles.reasonSelected]}
                onPress={() => setRaison(r.value)}
              >
                <View style={[styles.radio, raison === r.value && styles.radioSelected]}>
                  {raison === r.value && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.reasonText, raison === r.value && styles.reasonTextSelected]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 12 }]}>Détails supplémentaires (optionnel)</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Décrivez le problème..."
              placeholderTextColor={COLORS.placeholder}
              value={description}
              onChangeText={setDescription}
              maxLength={500}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitBtn, !raison && styles.submitBtnDisabled]}
              onPress={submit}
              disabled={!raison || loading}
            >
              <Ionicons name="flag" size={16} color="#fff" />
              <Text style={styles.submitText}>{loading ? 'Envoi...' : 'Envoyer le signalement'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:             { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
                       padding: 20, paddingBottom: 0, maxHeight: '85%' },
  scrollContent:     { paddingBottom: 36 },
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:             { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  label:             { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  reasonItem:        { flexDirection: 'row', alignItems: 'center', gap: 12,
                       paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  reasonSelected:    { backgroundColor: COLORS.primary + '12' },
  radio:             { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border,
                       alignItems: 'center', justifyContent: 'center' },
  radioSelected:     { borderColor: COLORS.primary },
  radioDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  reasonText:        { fontSize: 14, color: COLORS.textPrimary },
  reasonTextSelected:{ fontWeight: '600', color: COLORS.primary },
  input:             { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10,
                       padding: 10, fontSize: 14, color: COLORS.textPrimary,
                       minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                       gap: 8, backgroundColor: COLORS.error, borderRadius: 12, padding: 14 },
  submitBtnDisabled: { opacity: 0.4 },
  submitText:        { color: '#fff', fontWeight: '700', fontSize: 15 },
});