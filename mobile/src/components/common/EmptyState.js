import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import Button from './Button';

/**
 * Composant état vide — affiché quand une liste est vide.
 */
export default function EmptyState({
  icon        = 'package-variant-closed',
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons name={icon} size={64} color={COLORS.border} />
      </View>
      {title ? (
        <Text style={styles.title}>{title}</Text>
      ) : null}
      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          size="md"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        32,
    minHeight:      280,
  },
  iconWrapper: {
    width:          100,
    height:         100,
    borderRadius:   50,
    backgroundColor: COLORS.inputBackground,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    24,
  },
  title: {
    fontSize:   18,
    fontWeight: '700',
    color:      COLORS.textPrimary,
    textAlign:  'center',
    marginBottom: 8,
  },
  description: {
    fontSize:   14,
    color:      COLORS.textSecondary,
    textAlign:  'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  action: { minWidth: 160 },
});
