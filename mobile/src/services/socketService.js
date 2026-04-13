import { io } from 'socket.io-client';
import { SOCKET_URL } from '../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../constants/config';

// Même helper que api.js — SecureStore avec fallback AsyncStorage
async function getToken() {
  try {
    const SecureStore = require('expo-secure-store');
    const val = await SecureStore.getItemAsync(APP_CONFIG.TOKEN_KEY);
    if (val) return val;
  } catch (_e) { /* SecureStore non dispo */ }
  try {
    return await AsyncStorage.getItem(APP_CONFIG.TOKEN_KEY);
  } catch (_e) { /* ignore */ }
  return null;
}

let socket = null;

/**
 * Initialise et retourne la connexion Socket.IO
 * @returns {Socket}
 */
async function connect() {
  if (socket && socket.connected) return socket;

  // Si socket existe mais pas encore connecté, attendre
  if (socket && !socket.connected) {
    return new Promise((resolve) => {
      socket.once('connect', () => resolve(socket));
      setTimeout(() => resolve(socket), 5000);
    });
  }

  const token = await getToken();

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connecté:', socket.id);
  });
  socket.on('disconnect', (reason) => {
    console.log('[Socket] Déconnecté:', reason);
  });
  socket.on('connect_error', (error) => {
    console.warn('[Socket] Erreur de connexion:', error.message);
  });

  // ✅ Attendre la vraie connexion avant de retourner
  return new Promise((resolve) => {
    if (socket.connected) { resolve(socket); return; }
    socket.once('connect', () => resolve(socket));
    setTimeout(() => resolve(socket), 5000); // timeout sécurité
  });
}

/**
 * Déconnecte le socket
 */
function disconnect() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Retourne le socket actif (ou null)
 * @returns {Socket|null}
 */
function getSocket() {
  return socket;
}

/**
 * Rejoint la room d'une wilaya (pour les transporteurs)
 * @param {string} userId
 * @param {string} wilaya
 */
/**
 * Rejoindre la room personnelle de l'utilisateur (pour notifications ciblées)
 */
function joinUserRoom(userId) {
  if (socket && userId) {
    socket.emit('join_user', userId);
  }
}

function joinWilaya(userId, wilaya) {
  if (socket) {
    socket.emit('join', { userId, wilaya });
  }
}

/**
 * Émet un message dans une conversation
 * @param {string} conversationId
 * @param {string} contenu
 * @param {string} expediteurId
 */
function sendMessage(conversationId, contenu, expediteurId) {
  if (socket) {
    socket.emit('sendMessage', { conversationId, contenu, expediteurId });
  }
}

/**
 * Émet l'événement "en train d'écrire"
 * @param {string} conversationId
 * @param {string} userId
 */
function emitTyping(conversationId, userId) {
  if (socket) {
    socket.emit('typing', { conversationId, userId });
  }
}

/**
 * Écoute un événement socket
 * @param {string} event
 * @param {Function} callback
 */
function on(event, callback) {
  if (socket) {
    socket.on(event, callback);
  }
}

/**
 * Supprime un listener d'événement socket
 * @param {string} event
 * @param {Function} callback
 */
function off(event, callback) {
  if (socket) {
    socket.off(event, callback);
  }
}

/**
 * Émet la position GPS du transporteur
 */
function emitLocation(parcelId, lat, lng) {
  if (socket) {
    socket.emit('carrier_location', { parcelId, lat, lng });
  }
}

/**
 * Rejoint la room de tracking d'un colis
 */
function joinTracking(parcelId) {
  if (socket) {
    socket.emit('join_tracking', { parcelId });
  }
}

/**
 * Quitte la room de tracking d'un colis
 */
function leaveTracking(parcelId) {
  if (socket) {
    socket.emit('leave_tracking', { parcelId });
  }
}

export const socketService = {
  connect,
  disconnect,
  getSocket,
  joinWilaya,
  sendMessage,
  emitTyping,
  on,
  off,
  emitLocation,
  joinTracking,
  leaveTracking,
  joinUserRoom,
};

export default socketService;