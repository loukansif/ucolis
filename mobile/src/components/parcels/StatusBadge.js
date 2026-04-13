import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import { t } from '../../i18n/index';

const STATUS_CONFIG = {
  disponible:     { color: COLORS.success,       icon: 'check-circle-outline',    bg: '#DCFCE7' },
  en_negociation: { color: COLORS.warning,       icon: 'handshake-outline',       bg: '#FEF9C3' },
  accepte:        { color: '#3B82F6',            icon: 'thumb-up-outline',        bg: '#DBEAFE' },
  en_livraison:   { color: '#9333EA',            icon: 'truck-fast-outline',      bg: '#F3E8FF' },
  livre:          { color: COLORS.success,       icon: 'package-variant-closed',  bg: '#DCFCE7' },
  annule:         { color: COLORS.error,         icon: 'close-circle-outline',    bg: '#FEE2E2' },
};

/**
 * Badge statut colis avec icône.
 */
export default function StatusBadge({ statut, size = 'md' }) {
  const config = STATUS_CONFIG[statut] || STATUS_CONFIG.disponible;
  const isLarge = size === 'lg';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <MaterialCommunityIcons
        name={config.icon}
        size={isLarge ? 18 : 14}
        color={config.color}
      />
      <Text style={[styles.text, { color: config.color, fontSize: isLarge ? 13 : 11 }]}>
        {t(`status.${statut}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             5,
    paddingHorizontal: 10,
    paddingVertical:  5,
    borderRadius:    20,
    alignSelf:       'flex-start',
  },
  text: { fontWeight: '700', letterSpacing: 0.2 },
});
