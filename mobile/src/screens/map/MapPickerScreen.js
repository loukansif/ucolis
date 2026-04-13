import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Button  from '../../components/common/Button';
import COLORS  from '../../constants/colors';

// ── Chargement conditionnel react-native-maps ──────────────────────
let MapView         = null;
let PROVIDER_GOOGLE = null;

try {
  const RNMaps    = require('react-native-maps');
  MapView         = RNMaps.default;
  PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE;
} catch (_e) {}

const TYPE_CONFIG = {
  depart:  { color: COLORS.primary, label: 'Point de départ',  icon: 'map-marker'       },
  arrivee: { color: COLORS.accent,  label: "Point d'arrivée",  icon: 'map-marker-check' },
};

function MapPickerFallback({ onGoBack }) {
  return (
    <View style={styles.fallbackFull}>
      <MaterialCommunityIcons name="map-off" size={56} color={COLORS.border} />
      <Text style={styles.fallbackTitle}>Carte non disponible</Text>
      <Text style={styles.fallbackDesc}>
        La sélection sur carte nécessite l'application mobile.{'\n'}
        Saisissez l'adresse manuellement dans le formulaire.
      </Text>
      <Button title="Retour" onPress={onGoBack} variant="primary" size="md" style={{ marginTop: 24 }} />
    </View>
  );
}

export default function MapPickerScreen({ navigation, route }) {
  const { type = 'depart', wilayaCoords, returnScreen = 'CreateParcel' } = route.params || {};
  const insets  = useSafeAreaInsets();
  const config  = TYPE_CONFIG[type] || TYPE_CONFIG.depart;

  const mapRef     = useRef(null);
  const pinAnim    = useRef(new Animated.Value(0)).current;
  const isDragging = useRef(false);

  const initialRegion = wilayaCoords
    ? { latitude: wilayaCoords.lat, longitude: wilayaCoords.lng, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : { latitude: 36.7372, longitude: 3.0866, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  // ✅ Initialiser region depuis wilayaCoords → bouton Confirmer actif dès l'ouverture
  const [region,    setRegion]    = useState(wilayaCoords ? initialRegion : null);
  const [address,   setAddress]   = useState('');
  const [geoCity,   setGeoCity]   = useState('');
  const [geoRegion, setGeoRegion] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const geocodeTimer = useRef(null);

  useEffect(() => {
    if (!wilayaCoords) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const reg = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
          setRegion(reg);
          mapRef.current?.animateToRegion(reg, 800);
        } catch (_e) {}
      })();
    }
  }, []);

  const reverseGeocode = useCallback(async (lat, lng) => {
    setGeocoding(true);
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results?.length > 0) {
        const r = results[0];
        const parts = [r.streetNumber, r.street, r.district, r.city, r.region].filter(Boolean);
        setAddress(parts.length > 0 ? parts.join(', ') : 'Point sélectionné sur la carte');
        setGeoCity(r.city || r.district || r.subregion || '');
        setGeoRegion(r.region || '');
      } else {
        setAddress('Point sélectionné sur la carte');
      }
    } catch (_e) {
      setAddress('Point sélectionné sur la carte');
    } finally {
      setGeocoding(false);
    }
  }, []);

  function onRegionChange() {
    if (!isDragging.current) {
      isDragging.current = true;
      Animated.spring(pinAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 7 }).start();
    }
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
  }

  function onRegionChangeComplete(reg) {
    isDragging.current = false;
    setRegion(reg);
    Animated.spring(pinAnim, { toValue: 0, useNativeDriver: true, tension: 120, friction: 7 }).start();
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => reverseGeocode(reg.latitude, reg.longitude), 300);
  }

  async function goToMyLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 600);
    } catch (_e) {}
  }

  function handleConfirm() {
    if (!region) return;
    const addr = address || 'Point sélectionné sur la carte';
    const result = { type, lat: region.latitude, lng: region.longitude, address: addr, city: geoCity, region: geoRegion };
    // merge:true préserve les params existants (ex: parcelId)
    navigation.navigate({
      name: returnScreen,
      params: { mapResult: result },
      merge: true,
    });
  }

  const pinTranslateY = pinAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const shadowScale   = pinAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });
  const shadowOpacity = pinAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.15] });

  if (!MapView) return <MapPickerFallback onGoBack={() => navigation.goBack()} />;

  return (
    <View style={styles.flex}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        mapPadding={{ bottom: 160 }}
      />

      <View style={styles.pinContainer} pointerEvents="none">
        <Animated.View style={[styles.pinShadow, { transform: [{ scaleX: shadowScale }], opacity: shadowOpacity, backgroundColor: config.color }]} />
        <Animated.View style={{ transform: [{ translateY: pinTranslateY }] }}>
          <View style={[styles.pinHead, { backgroundColor: config.color }]}>
            <MaterialCommunityIcons name={config.icon} size={20} color={COLORS.white} />
          </View>
          <View style={[styles.pinTail, { borderTopColor: config.color }]} />
        </Animated.View>
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.typeChip, { backgroundColor: config.color }]}>
          <MaterialCommunityIcons name={config.icon} size={14} color={COLORS.white} />
          <Text style={styles.typeChipText}>{config.label}</Text>
        </View>
        <TouchableOpacity style={styles.topBtn} onPress={goToMyLocation} activeOpacity={0.85}>
          <Ionicons name="locate" size={22} color={config.color} />
        </TouchableOpacity>
      </View>

      {!address && !geocoding && (
        <View style={styles.tooltip} pointerEvents="none">
          <Ionicons name="hand-left-outline" size={15} color={COLORS.textSecondary} />
          <Text style={styles.tooltipText}>Déplacez la carte pour positionner le point</Text>
        </View>
      )}

      <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.addressRow}>
          <View style={[styles.addressDot, { backgroundColor: config.color }]} />
          <View style={styles.addressTextWrap}>
            {geocoding ? (
              <View style={styles.geocodingRow}>
                <ActivityIndicator size="small" color={config.color} />
                <Text style={styles.geocodingText}>Recherche de l'adresse...</Text>
              </View>
            ) : address ? (
              <>
                <Text style={styles.addressLabel}>Adresse sélectionnée</Text>
                <Text style={styles.addressValue} numberOfLines={2}>{address}</Text>
              </>
            ) : (
              <Text style={styles.addressPlaceholder}>Aucune position sélectionnée</Text>
            )}
          </View>
        </View>
        <Button
          title="Confirmer ce point"
          onPress={handleConfirm}
          variant="primary"
          size="lg"
          disabled={!region}
          leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={!region ? COLORS.textSecondary : COLORS.white} />}
          style={[styles.confirmBtn, region ? { backgroundColor: config.color } : {}]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pinContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 160, alignItems: 'center', justifyContent: 'center' },
  pinHead: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
  pinTail: { alignSelf: 'center', width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 12, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  pinShadow: { position: 'absolute', bottom: -18, width: 20, height: 6, borderRadius: 3 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 10 },
  topBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  typeChipText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  tooltip: { position: 'absolute', bottom: 200, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3 },
  tooltipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addressDot: { width: 12, height: 12, borderRadius: 6, marginTop: 5, flexShrink: 0 },
  addressTextWrap: { flex: 1 },
  addressLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  addressValue: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '600', lineHeight: 22 },
  addressPlaceholder: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  geocodingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  geocodingText: { fontSize: 14, color: COLORS.textSecondary },
  confirmBtn: { borderRadius: 14 },
  fallbackFull: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.background },
  fallbackTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 16 },
  fallbackDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8 },
});