import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, Platform,
  TouchableOpacity, Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import COLORS from '../../constants/colors';

/**
 * Import react-native-maps de manière universellement défensive.
 * - Platform.OS check insuffisant en mode Bridgeless/Snack (TurboModule absent)
 * - Le try/catch attrape TOUTES les erreurs de chargement du module natif
 */
let MapView        = null;
let Marker         = null;
let Polyline       = null;
let PROVIDER_GOOGLE = null;

try {
  const RNMaps    = require('react-native-maps');
  MapView         = RNMaps.default;
  Marker          = RNMaps.Marker;
  Polyline        = RNMaps.Polyline;
  PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE;
} catch (_e) {
  // react-native-maps indisponible (Web, Snack, Bridgeless, TurboModule manquant)
  // MapView reste null → le composant affichera le fallback
}

// ──────────────────────────────────────────────────────────────
// Fallback visuel — tous environnements sans module natif
// ──────────────────────────────────────────────────────────────
function MapFallback({ depart, arrivee, height }) {
  const label = depart && arrivee
    ? `${depart.ville || depart.adresse || 'Départ'} → ${arrivee.ville || arrivee.adresse || 'Arrivée'}`
    : 'Itinéraire';

  function openInMaps() {
    if (!depart?.lat || !arrivee?.lat) return;
    const url = Platform.OS === 'ios'
      ? `maps://?saddr=${depart.lat},${depart.lng}&daddr=${arrivee.lat},${arrivee.lng}`
      : Platform.OS === 'android'
        ? `google.navigation:q=${arrivee.lat},${arrivee.lng}`
        : `https://www.google.com/maps/dir/${depart.lat},${depart.lng}/${arrivee.lat},${arrivee.lng}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <TouchableOpacity
      style={[styles.fallback, { height }]}
      onPress={openInMaps}
      activeOpacity={0.85}
    >
      {/* Grille décorative */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {[0,1,2,3,4,5].map(i => (
          <View key={`h${i}`} style={[styles.gridLine, styles.gridLineH, { top: `${(i + 1) * 14}%` }]} />
        ))}
        {[0,1,2,3,4,5,6,7].map(i => (
          <View key={`v${i}`} style={[styles.gridLine, styles.gridLineV, { left: `${(i + 1) * 11}%` }]} />
        ))}
      </View>

      <View style={styles.fallbackContent}>
        <View style={styles.mapIconBox}>
          <MaterialCommunityIcons name="map-outline" size={32} color={COLORS.primary} />
        </View>

        <Text style={styles.routeLabel} numberOfLines={2}>{label}</Text>

        {depart?.lat && arrivee?.lat && (
          <View style={styles.openRow}>
            <MaterialCommunityIcons name="open-in-new" size={14} color={COLORS.primary} />
            <Text style={styles.openText}>Ouvrir dans Maps</Text>
          </View>
        )}

        <View style={styles.pointsRow}>
          <View style={styles.pointItem}>
            <View style={[styles.pointDot, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.pointText} numberOfLines={1}>
              {depart?.ville || depart?.adresse || '—'}
            </Text>
          </View>
          <MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.textSecondary} />
          <View style={styles.pointItem}>
            <View style={[styles.pointDot, { backgroundColor: COLORS.accent }]} />
            <Text style={styles.pointText} numberOfLines={1}>
              {arrivee?.ville || arrivee?.adresse || '—'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────────
// Rendu natif — uniquement si MapView a été chargé
// ──────────────────────────────────────────────────────────────
function MapNative({ depart, arrivee, height, interactive }) {
  const region = useMemo(() => {
    if (!depart?.lat || !arrivee?.lat) return null;
    const minLat = Math.min(depart.lat, arrivee.lat);
    const maxLat = Math.max(depart.lat, arrivee.lat);
    const minLng = Math.min(depart.lng, arrivee.lng);
    const maxLng = Math.max(depart.lng, arrivee.lng);
    return {
      latitude:       (minLat + maxLat) / 2,
      longitude:      (minLng + maxLng) / 2,
      latitudeDelta:  (maxLat - minLat) * 1.4 || 0.1,
      longitudeDelta: (maxLng - minLng) * 1.4 || 0.1,
    };
  }, [depart, arrivee]);

  if (!region) return <MapFallback depart={depart} arrivee={arrivee} height={height} />;

  return (
    <MapView
      style={{ height }}
      provider={PROVIDER_GOOGLE}
      initialRegion={region}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      pitchEnabled={false}
      rotateEnabled={false}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
    >
      {depart?.lat && (
        <Marker
          coordinate={{ latitude: depart.lat, longitude: depart.lng }}
          title={depart.ville || 'Départ'}
          description={depart.adresse}
          pinColor={COLORS.primary}
        />
      )}
      {arrivee?.lat && (
        <Marker
          coordinate={{ latitude: arrivee.lat, longitude: arrivee.lng }}
          title={arrivee.ville || 'Arrivée'}
          description={arrivee.adresse}
          pinColor={COLORS.accent}
        />
      )}
      {depart?.lat && arrivee?.lat && (
        <Polyline
          coordinates={[
            { latitude: depart.lat,  longitude: depart.lng  },
            { latitude: arrivee.lat, longitude: arrivee.lng },
          ]}
          strokeColor={COLORS.primary}
          strokeWidth={3}
          lineDashPattern={[10, 6]}
        />
      )}
    </MapView>
  );
}

// ──────────────────────────────────────────────────────────────
// Export — MapView null → fallback garanti
// ──────────────────────────────────────────────────────────────
export default function SimpleMap({ depart, arrivee, height = 220, interactive = false }) {
  if (!MapView) {
    return <MapFallback depart={depart} arrivee={arrivee} height={height} />;
  }
  return <MapNative depart={depart} arrivee={arrivee} height={height} interactive={interactive} />;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#EEF2FF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLine:    { position: 'absolute', backgroundColor: '#6366F1', opacity: 0.15 },
  gridLineH:   { left: 0, right: 0, height: 1 },
  gridLineV:   { top: 0, bottom: 0, width: 1 },
  fallbackContent: { alignItems: 'center', gap: 10, paddingHorizontal: 24, zIndex: 1 },
  mapIconBox: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  routeLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  openRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FFF3EE', borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.primary,
  },
  openText:  { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  pointsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.white, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  pointItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  pointDot:  { width: 10, height: 10, borderRadius: 5 },
  pointText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600', flex: 1 },
});
