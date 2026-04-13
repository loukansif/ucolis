import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { socketService } from '../../services/socketService';
import COLORS from '../../constants/colors';

let MapView, Marker, Polyline;
try {
  const Maps = require('react-native-maps');
  MapView  = Maps.default;
  Marker   = Maps.Marker;
  Polyline = Maps.Polyline;
} catch (_) {}

export default function TrackingScreen({ navigation, route }) {
  const { parcelId, parcel, isCarrier } = route.params || {};
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [carrierPos,   setCarrierPos]   = useState(null);
  const [myPos,        setMyPos]        = useState(null);
  const [connected,    setConnected]    = useState(false);
  const [lastUpdate,   setLastUpdate]   = useState(null);
  const mapRef = useRef(null);
  const locationSub = useRef(null);

  // ── Connexion socket + room tracking ──
  useEffect(() => {
    let mounted = true;
    async function setup() {
      const socket = await socketService.connect();
      if (!mounted) return;
      setConnected(socket.connected);
      socket.on('connect',    () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));

      socketService.joinTracking(parcelId);
      console.log('[TrackingScreen] Room rejointe:', parcelId);

      // Demander au transporteur de réémettre immédiatement
      if (!isCarrier) {
        setTimeout(() => {
          socket.emit('request_carrier_position', { parcelId });
          console.log('[TrackingScreen] Position demandée au transporteur');
        }, 1000);

        socket.on('carrier_position', ({ lat, lng, timestamp }) => {
          if (!mounted) return;
          setCarrierPos({ latitude: lat, longitude: lng });
          setLastUpdate(new Date(timestamp));
          mapRef.current?.animateToRegion({
            latitude: lat, longitude: lng,
            latitudeDelta: 0.05, longitudeDelta: 0.05,
          }, 800);
        });
      }
    }
    setup();
    return () => {
      mounted = false;
      socketService.leaveTracking(parcelId);
      const s = socketService.getSocket();
      if (s) s.off('carrier_position');
      if (locationSub.current) locationSub.current.remove();
    };
  }, [parcelId, isCarrier]);

  // ── Émission GPS (côté transporteur) ──
  useEffect(() => {
    if (!isCarrier) return;
    async function startEmitting() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return; // Silencieux — refus géré par le système
      locationSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        ({ coords }) => {
          setMyPos({ latitude: coords.latitude, longitude: coords.longitude });
          socketService.emitLocation(parcelId, coords.latitude, coords.longitude);
        }
      );
    }
    startEmitting();
    return () => { if (locationSub.current) locationSub.current.remove(); };
  }, [isCarrier, parcelId]);

  // ── Position initiale expéditeur ──
  useEffect(() => {
    if (isCarrier) return;
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({}).then(({ coords }) => {
        setMyPos({ latitude: coords.latitude, longitude: coords.longitude });
      }).catch(() => {});
    });
  }, [isCarrier]);

  const initialRegion = parcel?.latArrivee ? {
    latitude: parcel.latArrivee, longitude: parcel.lngArrivee,
    latitudeDelta: 0.3, longitudeDelta: 0.3,
  } : { latitude: 36.7372, longitude: 3.0866, latitudeDelta: 2, longitudeDelta: 2 };

  if (!MapView) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="map-outline" size={48} color={COLORS.border} />
        <Text style={styles.noMapText}>Carte non disponible</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isCarrier ? 'Partager ma position' : 'Suivi en temps réel'}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: connected ? COLORS.success : COLORS.error }]} />
            <Text style={styles.statusTxt}>{connected ? 'Connecté' : 'Déconnecté'}</Text>
          </View>
        </View>
      </View>

      {/* ── Carte ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Position transporteur */}
        {carrierPos && !isCarrier && (
          <Marker coordinate={carrierPos} title="Transporteur">
            <View style={styles.carrierMarker}>
              <MaterialCommunityIcons name="truck-delivery" size={22} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Ma position */}
        {myPos && (
          <Marker coordinate={myPos} title={isCarrier ? 'Ma position' : 'Vous'}>
            <View style={styles.myMarker}>
              <Ionicons name="person" size={16} color="#fff" />
            </View>
          </Marker>
        )}

        {/* Point d'arrivée */}
        {parcel?.latArrivee && (
          <Marker
            coordinate={{ latitude: parcel.latArrivee, longitude: parcel.lngArrivee }}
            title="Destination"
            pinColor={COLORS.success}
          />
        )}

        {/* Ligne transporteur → destination */}
        {carrierPos && parcel?.latArrivee && (
          <Polyline
            coordinates={[
              carrierPos,
              { latitude: parcel.latArrivee, longitude: parcel.lngArrivee },
            ]}
            strokeColor={COLORS.primary}
            strokeWidth={2}
            lineDashPattern={[6, 4]}
          />
        )}
      </MapView>

      {/* ── Infos bas ── */}
      <View style={[styles.infoBar, { paddingBottom: insets.bottom + 12 }]}>
        {isCarrier ? (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="broadcast" size={20} color={COLORS.primary} />
            <Text style={styles.infoTxt}>
              {myPos
                ? 'Votre position est partagée en temps réel'
                : 'Récupération de votre position...'}
            </Text>
          </View>
        ) : (
          <View style={styles.infoRow}>
            {carrierPos ? (
              <>
                <MaterialCommunityIcons name="truck-delivery" size={20} color={COLORS.primary} />
                <Text style={styles.infoTxt}>
                  Transporteur localisé
                  {lastUpdate ? ` · ${lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
                </Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.infoTxt}>En attente de la position du transporteur...</Text>
              </>
            )}
          </View>
        )}

        <Text style={styles.destTxt}>
          📍 Destination : {parcel?.villeArrivee || 'Non définie'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  noMapText: { fontSize: 16, color: COLORS.textSecondary },
  backBtn: { marginTop: 16 },
  map:    { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backIcon:     { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot:    { width: 7, height: 7, borderRadius: 4 },
  statusTxt:    { fontSize: 12, color: COLORS.textSecondary },

  carrierMarker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  myMarker: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  infoBar: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    gap: 6,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoTxt: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600', flex: 1 },
  destTxt: { fontSize: 12, color: COLORS.textSecondary },
});