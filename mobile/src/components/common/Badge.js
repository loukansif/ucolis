import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';

/**
 * Badge générique — affiche un texte dans une pastille colorée.
 * @param {string} type - 'particulier' | 'pro' | 'disponible' | 'en_negociation' |
 *                        'accepte' | 'en_livraison' | 'livre' | 'annule' |
 *                        'en_attente' | 'valide' | 'refuse' | custom
 * @param {string} label - texte à afficher (override automatique si type reconnu)
 * @param {string} color - couleur de fond custom
 * @param {string} textColor - couleur du texte custom
 */
export default function Badge({ type, label, color, textColor, style }) {
  const config = getBadgeConfig(type);

  return (
    <View style={[
      styles.badge,
      { backgroundColor: color || config.bg },
      style,
    ]}>
      <Text style={[styles.text, { color: textColor || config.text }]}>
        {label || config.label}
      </Text>
    </View>
  );
}

function getBadgeConfig(type) {
  const map = {
    particulier:    { bg: '#EEF2FF', text: '#4338CA', label: 'Particulier' },
    pro:            { bg: '#FFF7ED', text: '#C2410C', label: 'Pro' },
    disponible:     { bg: '#DCFCE7', text: '#166534', label: 'Disponible' },
    en_negociation: { bg: '#FEF9C3', text: '#854D0E', label: 'En négociation' },
    accepte:        { bg: '#DBEAFE', text: '#1E40AF', label: 'Accepté' },
    en_livraison:   { bg: '#F3E8FF', text: '#7E22CE', label: 'En livraison' },
    livre:          { bg: '#DCFCE7', text: '#166534', label: 'Livré' },
    annule:         { bg: '#FEE2E2', text: '#991B1B', label: 'Annulé' },
    en_attente:     { bg: '#FEF3C7', text: '#92400E', label: 'En attente' },
    valide:         { bg: '#DCFCE7', text: '#166534', label: 'Validé' },
    refuse:         { bg: '#FEE2E2', text: '#991B1B', label: 'Refusé' },
  };
  return map[type] || { bg: COLORS.inputBackground, text: COLORS.textSecondary, label: type || '' };
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      20,
    alignSelf:         'flex-start',
  },
  text: {
    fontSize:   11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
