import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import COLORS from '../../constants/colors';

/**
 * Photo de profil ronde avec initiales en fallback.
 * @param {string}  uri     - URL de la photo
 * @param {string}  name    - Nom (pour les initiales)
 * @param {number}  size    - Taille en px (défaut: 48)
 * @param {boolean} online  - Indicateur de présence en ligne
 */
export default function Avatar({ uri, name, size = 48, online = false, style }) {
  const initials = getInitials(name);
  const fontSize = size * 0.38;

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size / 2 },
        ]}>
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      )}
      {online && (
        <View style={[
          styles.onlineDot,
          {
            width:        size * 0.27,
            height:       size * 0.27,
            borderRadius: size * 0.135,
            bottom: 0,
            right:  0,
          },
        ]} />
      )}
    </View>
  );
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  image: {
    borderWidth:  2,
    borderColor:  COLORS.border,
  },
  placeholder: {
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2,
    borderColor:     COLORS.border,
  },
  initials: {
    color:      COLORS.white,
    fontWeight: '700',
  },
  onlineDot: {
    position:        'absolute',
    backgroundColor: COLORS.success,
    borderWidth:     2,
    borderColor:     COLORS.white,
  },
});
