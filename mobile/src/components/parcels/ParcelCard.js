import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';
import Badge  from '../common/Badge';
import { t }  from '../../i18n/index';
import { formatPrice, formatWeight, formatRelativeDate } from '../../utils/formatters';

export default function ParcelCard({ parcel, onPress }) {
  const {
    titre,
    poids,
    volume,
    prixDemande,
    wilayaDepart,   // ✅ champ plat
    villeDepart,    // ✅ champ plat
    wilayaArrivee,  // ✅ champ plat
    villeArrivee,   // ✅ champ plat
    distance,
    statut,
    expediteur,
    createdAt,
  } = parcel;

  // Wilaya à afficher dans l'en-tête — départ ou "inter-wilaya"
  const wilayaLabel =
    wilayaDepart === wilayaArrivee
      ? wilayaDepart
      : `${wilayaDepart} → ${wilayaArrivee}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={styles.card}
    >
      {/* En-tête : wilaya + badge statut */}
      <View style={styles.row}>
        <View style={styles.wilayaRow}>
          <MaterialCommunityIcons name="map-marker" size={14} color={COLORS.primary} />
          <Text style={styles.wilayaText} numberOfLines={1}>
            {wilayaLabel || '—'}
          </Text>
        </View>
        <Badge type={statut} label={t(`status.${statut}`)} />
      </View>

      {/* Titre */}
      {titre ? (
        <Text style={styles.titre} numberOfLines={1}>{titre}</Text>
      ) : null}

      {/* Départ → Arrivée */}
      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.cityText} numberOfLines={1}>
            {villeDepart || wilayaDepart || '—'}  {/* ✅ ville d'abord, wilaya en fallback */}
          </Text>
        </View>

        <View style={styles.routeLine}>
          <View style={styles.line} />
          <MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.textSecondary} />
        </View>

        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: COLORS.accent }]} />
          <Text style={styles.cityText} numberOfLines={1}>
            {villeArrivee || wilayaArrivee || '—'}  {/* ✅ ville d'abord, wilaya en fallback */}
          </Text>
        </View>
      </View>

      {/* Détails : poids, volume, distance, prix */}
      <View style={styles.detailsRow}>
        <View style={styles.detail}>
          <MaterialCommunityIcons name="weight-kilogram" size={14} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{formatWeight(poids)}</Text>
        </View>

        {volume ? (
          <View style={styles.detail}>
            <MaterialCommunityIcons name="cube-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{volume} m³</Text>
          </View>
        ) : null}

        {distance ? (
          <View style={styles.detail}>
            <MaterialCommunityIcons name="map-marker-distance" size={14} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{distance} km</Text>
          </View>
        ) : null}

        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatPrice(prixDemande)}</Text>
        </View>
      </View>

      {/* Pied : expéditeur + date */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Ionicons name="person-circle-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.footerText}>
            {expediteur?.prenom
              ? `${expediteur.prenom} ${expediteur.nom ?? ''}`
              : 'Expéditeur'}
          </Text>
          {expediteur?.typeCompte === 'professionnel' && (  // ✅ typeCompte pas type
            <Badge type="pro" style={styles.proB} />
          )}
        </View>
        <Text style={styles.date}>{formatRelativeDate(createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius:    16,
    padding:         16,
    marginBottom:    12,
    borderWidth:     1,
    borderColor:     COLORS.border,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.07,
    shadowRadius:    6,
    elevation:       3,
  },
  row:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  wilayaRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: 8 },
  wilayaText:   { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  titre:        { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  routeRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  routePoint:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  cityText:     { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  routeLine:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  line:         { width: 20, height: 1, backgroundColor: COLORS.border, marginRight: 4 },
  detailsRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12, flexWrap: 'wrap' },
  detail:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText:   { fontSize: 13, color: COLORS.textSecondary },
  priceContainer:{ marginLeft: 'auto' },
  price:        { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  footerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText:   { fontSize: 12, color: COLORS.textSecondary },
  date:         { fontSize: 11, color: COLORS.placeholder },
  proB:         { marginLeft: 4 },
});
