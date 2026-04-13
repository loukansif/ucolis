import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ratingService } from '../../services/ratingService';
import COLORS from '../../constants/colors';

const NOTE_LABELS = ['', 'Très mauvais 😞', 'Mauvais 😕', 'Correct 😐', 'Bien 🙂', 'Excellent 🌟'];

export default function RatingModal({ visible, onClose, onSuccess, colisId, destinataireNom }) {
  const insets = useSafeAreaInsets();
  const [note,        setNote]        = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [loading,     setLoading]     = useState(false);

  function handleClose() {
    setNote(0);
    setCommentaire('');
    onClose();
  }

  async function handleSubmit() {
    if (note === 0) {
      Alert.alert('', 'Veuillez sélectionner une note.');
      return;
    }
    setLoading(true);
    try {
      await ratingService.createRating({ colisId, note, commentaire: commentaire.trim() });
      Alert.alert('✅ Merci !', 'Votre avis a été envoyé.');
      setNote(0);
      setCommentaire('');
      onSuccess?.();
      onClose();
    } catch (e) {
      const msg = e.response?.data?.message || 'Une erreur est survenue.';
      Alert.alert('', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      {/* ✅ KeyboardAvoidingView remonte le sheet quand le clavier s'ouvre */}
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>

          {/* ── Poignée ── */}
          <View style={styles.handle} />

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              Noter {destinataireNom || 'l\'utilisateur'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ✅ ScrollView pour que le contenu reste accessible sous le clavier */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.subtitle}>Comment s'est passée cette livraison ?</Text>

            {/* ── Étoiles ── */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setNote(star)} style={styles.starBtn}>
                  <Ionicons
                    name={star <= note ? 'star' : 'star-outline'}
                    size={44}
                    color={star <= note ? '#F59E0B' : COLORS.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {note > 0 && (
              <Text style={styles.noteLabel}>{NOTE_LABELS[note]}</Text>
            )}

            {/* ── Commentaire ── */}
            <Text style={styles.fieldLabel}>Commentaire (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Décrivez votre expérience..."
              placeholderTextColor={COLORS.placeholder}
              value={commentaire}
              onChangeText={setCommentaire}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />

            <Text style={styles.charCount}>{commentaire.length}/500</Text>

            {/* ── Bouton ── */}
            <TouchableOpacity
              style={[styles.btn, (note === 0 || loading) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading || note === 0}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Envoyer mon avis</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 4,
  },
  title:    { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, flex: 1, marginRight: 8 },
  closeBtn: { padding: 4, marginTop: 2 },
  scrollContent: { paddingBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },

  // ── Étoiles ──────────────────────────────────────────────────
  starsRow:  { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 10 },
  starBtn:   { padding: 4 },
  noteLabel: {
    textAlign: 'center', fontSize: 15, fontWeight: '700',
    color: '#F59E0B', marginBottom: 20,
  },

  // ── Commentaire ──────────────────────────────────────────────
  fieldLabel: {
    fontSize: 13, fontWeight: '600',
    color: COLORS.textSecondary, marginBottom: 8,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
    fontSize: 14, color: COLORS.textPrimary,
    backgroundColor: COLORS.inputBackground,
    minHeight: 100,
  },
  charCount: {
    fontSize: 11, color: COLORS.placeholder,
    textAlign: 'right', marginTop: 4, marginBottom: 20,
  },

  // ── Bouton ───────────────────────────────────────────────────
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});