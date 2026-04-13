import { useEffect, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';

const USER_ROLES = { CARRIER: 'carrier', BOTH: 'both' };

function isCarrierRole(role) {
  return role === USER_ROLES.CARRIER || role === USER_ROLES.BOTH;
}

export function useLocationPermission() {
  const { user, isLoggedIn } = useAuth();

  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  const requestForeground = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') return true;

    // Expliquer avant de demander
    await new Promise(resolve =>
      Alert.alert(
        '📍 Localisation requise',
        'En tant que transporteur, UCOLIS a besoin de votre position pour partager votre localisation avec les expéditeurs pendant les livraisons.',
        [{ text: 'Continuer', onPress: resolve }]
      )
    );

    const { status: newStatus } = await Location.requestForegroundPermissionsAsync();

    if (newStatus !== 'granted') {
      Alert.alert(
        'Permission refusée',
        'Sans accès à votre localisation, vous ne pourrez pas effectuer de livraisons. Activez-la dans les paramètres.',
        [
          { text: 'Paramètres', onPress: openSettings },
          { text: 'Plus tard', style: 'cancel' },
        ]
      );
      return false;
    }
    return true;
  }, [openSettings]);

  const requestBackground = useCallback(async () => {
    const { status: fg } = await Location.getForegroundPermissionsAsync();
    if (fg !== 'granted') return false;

    const { status } = await Location.getBackgroundPermissionsAsync();
    if (status === 'granted') return true;

    await new Promise(resolve =>
      Alert.alert(
        '📍 Localisation en arrière-plan',
        Platform.OS === 'ios'
          ? 'Sélectionnez "Toujours" pour partager votre position même quand vous utilisez d\'autres applications (GPS, etc.).'
          : 'Autorisez "Tout le temps" pour que votre position soit partagée même quand UCOLIS est en arrière-plan.',
        [{ text: 'Continuer', onPress: resolve }]
      )
    );

    const { status: newStatus } = await Location.requestBackgroundPermissionsAsync();

    if (newStatus !== 'granted') {
      Alert.alert(
        'Localisation arrière-plan refusée',
        'Votre position ne sera partagée que quand UCOLIS est ouvert. Pour une meilleure expérience, activez "Toujours" dans les paramètres.',
        [
          { text: 'Paramètres', onPress: openSettings },
          { text: 'OK', style: 'cancel' },
        ]
      );
      return false;
    }
    return true;
  }, [openSettings]);

  // Demander automatiquement à la connexion si transporteur
  useEffect(() => {
    if (!isLoggedIn || !user) return;
    if (!isCarrierRole(user.role)) return;

    async function checkAndRequest() {
      const { status: fg } = await Location.getForegroundPermissionsAsync();

      // Foreground refusé ou non demandé
      if (fg !== 'granted') {
        await requestForeground();
        return;
      }

      // Background non demandé encore
      const { status: bg } = await Location.getBackgroundPermissionsAsync();
      if (bg !== 'granted') {
        // Petit délai pour ne pas agresser l'utilisateur au démarrage
        setTimeout(() => requestBackground(), 2000);
      }
    }

    checkAndRequest();
  }, [isLoggedIn, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  return { requestForeground, requestBackground };
}