import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../constants/config';
import { BASE_URL } from '../constants/api';

// ✅ Même helper que AuthContext — SecureStore d'abord, AsyncStorage en fallback
const Storage = {
  async getItem(key) {
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    } catch (_e) { /* SecureStore non disponible */ }
    return AsyncStorage.getItem(key);
  },
  async removeItem(key) {
    try {
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
    } catch (_e) { /* SecureStore non disponible */ }
    try {
      await AsyncStorage.removeItem(key);
    } catch (_e) { /* ignore */ }
  },
};

// navigationRef injecté depuis AppNavigator pour rediriger en cas de 401
let _navigationRef = null;
export function setNavigationRef(ref) {
  _navigationRef = ref;
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Intercepteur requête : injecte le token JWT ──────────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await Storage.getItem(APP_CONFIG.TOKEN_KEY);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (_e) { /* ignore */ }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Intercepteur réponse : gère les erreurs globales ────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (__DEV__) {
      console.warn(`❌ API [${status}] ${error.config?.url} — ${message}`);
    }

    // Session expirée → nettoyer et rediriger vers Login
    // ✅ Exclure les routes auth : un 401 sur /login est une erreur de saisie,
    //    pas une session expirée — laisser AuthContext la gérer sans interférence
    const requestUrl = error.config?.url || '';
    const isAuthRoute = requestUrl.includes('/auth/login') ||
                        requestUrl.includes('/auth/register') ||
                        requestUrl.includes('/auth/forgot');

    if (status === 401 && !isAuthRoute) {
      await Storage.removeItem(APP_CONFIG.TOKEN_KEY);
      await Storage.removeItem(APP_CONFIG.USER_KEY);

      if (_navigationRef?.isReady?.()) {
        _navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }

    return Promise.reject(error);
  }
);

export default api;