import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../constants/colors';
import { t } from '../../i18n/index';
import { formatPrice, formatDistance } from '../../utils/formatters';

/**
 * Affiche le détail du calcul de prix (distance, poids, volume, total).
 */
export default function PriceCalculator({ distance, poids, volume, prix, coefficients }) {
  const coeff = coefficients || { PRIX_PAR_KM: 12, PRIX_PAR_KG: 50, PRIX_PAR_M3: 200 };

  const items = [
    {
      icon:  'road-variant',
      label: `${formatDistance(distance)} × ${coeff.PRIX_PAR_KM} DZD/km`,
      value: Math.round((distance || 0) * coeff.PRIX_PAR_KM),
    },
    {
      icon:  'weight-kilogram',
      label: `${poids || 0} kg × ${coeff.PRIX_PAR_KG} DZD/kg`,
      value: Math.round((poids || 0) * coeff.PRIX_PAR_KG),
    },
    {
      icon:  'cube-outline',
      label: `${volume || 0} m³ × ${coeff.PRIX_PAR_M3} DZD/m³`,
      value: Math.round((volume || 0) * coeff.PRIX_PAR_M3),
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('parcels.estimatedPrice')}</Text>

      {items.map((item, i) => (
        <View key={i} style={styles.row}>
          <MaterialCommunityIcons name={item.icon} size={16} color={COLORS.textSecondary} />
          <Text style={styles.itemLabel}>{item.label}</Text>
          <Text style={styles.itemValue}>{formatPrice(item.value)}</Text>
        </View>
      ))}

      <View style={styles.divider} />

      <LinearGradient
        colors={COLORS.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.totalRow}
      >
        <Text style={styles.totalLabel}>{t('parcels.estimatedPrice')}</Text>
        <Text style={styles.totalValue}>{formatPrice(prix)}</Text>
      </LinearGradient>

      <Text style={styles.formula}>{t('parcels.priceFormula')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius:    16,
    padding:         16,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  label:     { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  row:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  itemLabel: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  itemValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  divider:   { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  totalRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        14,
    borderRadius:   12,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  totalValue: { fontSize: 20, fontWeight: '800', color: COLORS.white },
  formula:    { fontSize: 11, color: COLORS.placeholder, marginTop: 10, textAlign: 'center' },
});
