import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';
import { t } from '../../i18n/index';

/**
 * Champ de saisie du chat avec bouton envoyer.
 * @param {Function} onSend  - appelé avec le texte du message
 * @param {boolean}  sending - désactive le bouton pendant l'envoi
 */
export default function ChatInput({ onSend, sending = false }) {
  const [text,    setText]    = useState('');
  const insets = useSafeAreaInsets();

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    onSend(trimmed);
    setText('');
  }

  const canSend = text.trim().length > 0 && !sending;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('chat.typeMessage')}
          placeholderTextColor={COLORS.placeholder}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSend}
          style={[styles.sendBtn, canSend && styles.sendBtnActive]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="send"
            size={20}
            color={canSend ? COLORS.white : COLORS.placeholder}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderTopWidth:  1,
    borderTopColor:  COLORS.border,
    paddingHorizontal: 12,
    paddingTop:        10,
  },
  inputRow: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    gap:            8,
  },
  input: {
    flex:            1,
    backgroundColor: COLORS.inputBackground,
    borderRadius:    24,
    paddingHorizontal: 16,
    paddingVertical:   10,
    fontSize:        15,
    color:           COLORS.textPrimary,
    maxHeight:       120,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  sendBtn: {
    width:          44,
    height:         44,
    borderRadius:   22,
    backgroundColor: COLORS.border,
    alignItems:     'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: COLORS.primary,
  },
});
