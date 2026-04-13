import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { socketService } from '../services/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TASK_NAME = 'ucolis-carrier-location';

// Enregistrer la tâche — doit être appelé au niveau global (hors composant)
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[LocationTask] Erreur:', error.message);
    return;
  }

  if (!data?.locations?.length) return;

  const { latitude, longitude } = data.locations[0].coords;

  try {
    // Récupérer le parcelId sauvegardé
    const parcelId = await AsyncStorage.getItem('ucolis_tracking_parcelId');
    if (!parcelId) return;

    // Émettre via socket
    const socket = socketService.getSocket();
    if (socket?.connected) {
      socketService.emitLocation(parcelId, latitude, longitude);
    } else {
      // Si socket déconnecté, se reconnecter
      await socketService.connect();
      socketService.joinTracking(parcelId);
      socketService.emitLocation(parcelId, latitude, longitude);
    }
  } catch (e) {
    console.warn('[LocationTask] Erreur émission:', e.message);
  }
});

/**
 * Démarre le tracking en arrière-plan
 */
export async function startBackgroundTracking(parcelId) {
  try {
    // Sauvegarder le parcelId pour la tâche
    await AsyncStorage.setItem('ucolis_tracking_parcelId', parcelId);

    // Demander la permission background
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[LocationTask] Permission background refusée');
      return false;
    }

    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (isRunning) return true;

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy:              Location.Accuracy.Balanced,
      timeInterval:          6000,   // toutes les 6s
      distanceInterval:      15,     // ou tous les 15m
      showsBackgroundLocationIndicator: true, // indicateur iOS
      foregroundService: {           // Android — notification obligatoire
        notificationTitle:   'UCOLIS — Livraison en cours',
        notificationBody:    'Votre position est partagée avec l\'expéditeur.',
        notificationColor:   '#FF6B35',
      },
    });

    console.log('[LocationTask] Background tracking démarré ✅');
    return true;
  } catch (e) {
    console.warn('[LocationTask] Erreur démarrage:', e.message);
    return false;
  }
}

/**
 * Arrête le tracking en arrière-plan
 */
export async function stopBackgroundTracking() {
  try {
    await AsyncStorage.removeItem('ucolis_tracking_parcelId');
    const isRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('[LocationTask] Background tracking arrêté');
    }
  } catch (e) {
    console.warn('[LocationTask] Erreur arrêt:', e.message);
  }
}