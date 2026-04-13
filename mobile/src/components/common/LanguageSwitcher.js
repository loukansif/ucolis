import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../i18n/index';
import COLORS from '../../constants/colors';

/**
 * Toggle FR / AR — réservé à l'écran Profil.
 * Un reload est suggéré après changement pour activer le RTL.
 */
export default function LanguageSwitcher() {
  const { currentLang, changeLanguage } = useLanguage();

  async function handleChange(lang) {
    if (lang === currentLang) return;
    await changeLanguage(lang);
    Alert.alert(
      t('profile.language'),
      lang === 'ar'
        ? 'يرجى إعادة تشغيل التطبيق لتطبيق اللغة العربية بالكامل.'
        : 'Veuillez relancer l\'application pour appliquer la langue française.',
      [{ text: 'OK' }]
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => handleChange('fr')}
        style={[styles.btn, currentLang === 'fr' && styles.active]}
      >
        <Text style={[styles.label, currentLang === 'fr' && styles.activeLabel]}>
          🇫🇷  Français
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleChange('ar')}
        style={[styles.btn, currentLang === 'ar' && styles.active]}
      >
        <Text style={[styles.label, currentLang === 'ar' && styles.activeLabel]}>
          🇩🇿  عربي
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    backgroundColor: COLORS.inputBackground,
    borderRadius:   12,
    padding:        4,
    gap:            4,
  },
  btn: {
    flex:           1,
    paddingVertical: 10,
    alignItems:     'center',
    borderRadius:   10,
  },
  active: {
    backgroundColor: COLORS.primary,
    shadowColor:     COLORS.primary,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.3,
    shadowRadius:    4,
    elevation:       3,
  },
  label: {
    fontSize:   14,
    fontWeight: '600',
    color:      COLORS.textSecondary,
  },
  activeLabel: {
    color: COLORS.white,
  },
});
