import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { WILAYAS } from '../utils/wilayas';

/**
 * Hook de géolocalisation — détecte la wilaya de l'utilisateur.
 * @returns {{ location, wilaya, error, loading, requestLocation }}
 */
export function useLocation() {
  const [location, setLocation] = useState(null);
  const [wilaya,   setWilaya]   = useState(null);
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  async function requestLocation() {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('permission_denied');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc.coords);

      // Reverse geocoding pour obtenir la wilaya
      const geocode = await Location.reverseGeocodeAsync({
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode && geocode.length > 0) {
        const region = geocode[0].region || geocode[0].subregion || '';
        // Cherche la wilaya correspondante
        const matched = WILAYAS.find(w =>
          region.toLowerCase().includes(w.nom.toLowerCase()) ||
          w.nom.toLowerCase().includes(region.toLowerCase())
        );
        if (matched) setWilaya(matched.nom);
      }

      return loc.coords;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { location, wilaya, error, loading, requestLocation };
}

export default useLocation;
