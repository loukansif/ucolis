import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import COLORS from '../../constants/colors';

/**
 * Carte conteneur réutilisable avec ombre douce.
 * @param {boolean} pressable - Si true, la carte est cliquable
 */
export default function Card({
  children,
  style,
  onPress,
  pressable = false,
  padding   = 16,
  radius    = 16,
}) {
  const cardStyle = [
    styles.card,
    { padding, borderRadius: radius },
    style,
  ];

  if (pressable || onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.92}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius:    16,
    padding:         16,
    shadowColor:     COLORS.secondary,
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.08,
    shadowRadius:    8,
    elevation:       4,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
});
