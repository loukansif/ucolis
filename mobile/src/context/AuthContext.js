import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { APP_CONFIG } from '../constants/config';

// ✅ SecureStore d'abord, AsyncStorage en fallback
const Storage = {
  async getItem(key) {
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(key);
    } catch (_e) { /* SecureStore non disponible */ }
    return AsyncStorage.getItem(key);
  },
  async setItem(key, value) {
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.setItemAsync(key, value);
    } catch (_e) { /* SecureStore non disponible */ }
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key) {
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.deleteItemAsync(key);
    } catch (_e) { /* SecureStore non disponible */ }
    return AsyncStorage.removeItem(key);
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token,     setToken]     = useState(null);
  const [isGuest,   setIsGuest]   = useState(false);

  const loadStoredAuth = useCallback(async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        Storage.getItem(APP_CONFIG.TOKEN_KEY),
        Storage.getItem(APP_CONFIG.USER_KEY),
      ]);
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (_e) { /* continue sans session */ }
    finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 3000);
    loadStoredAuth().then(() => clearTimeout(timeout));
    return () => clearTimeout(timeout);
  }, [loadStoredAuth]);

  async function login(email, motDePasse) {
    try {
      const data = await authService.login({ email, motDePasse });
      const { token: newToken, user: newUser } = data;
      await Storage.setItem(APP_CONFIG.TOKEN_KEY, newToken);
      await Storage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      setIsGuest(false);
      return { success: true };
    } catch (e) {
      const serverMessage = e.response?.data?.message;
      const code          = e.response?.data?.code;
      const status        = e.response?.status;

      // Messages précis selon le cas
      let errorTitle   = 'Connexion impossible';
      let errorMessage = serverMessage || 'Une erreur est survenue. Réessayez.';

      if (code === 'ACCOUNT_SUSPENDED' || status === 403) {
        errorTitle   = '🚫 Compte suspendu';
        errorMessage = "Votre compte a été suspendu par un administrateur. Contactez le support.";
      } else if (code === 'EMAIL_NOT_FOUND') {
        errorTitle   = 'Email introuvable';
        errorMessage = "Aucun compte associé à cet email. Vérifiez ou créez un compte.";
      } else if (code === 'WRONG_PASSWORD') {
        errorTitle   = 'Mot de passe incorrect';
        errorMessage = 'Le mot de passe saisi est incorrect. Utilisez "Mot de passe oublié" si besoin.';
      } else if (!e.response) {
        errorTitle   = 'Pas de connexion';
        errorMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion internet.';
      }

      return { success: false, errorTitle, error: errorMessage };
    }
  }

  async function register(payload) {
    try {
      const data = await authService.register(payload);
      const { token: newToken, user: newUser } = data;
      await Storage.setItem(APP_CONFIG.TOKEN_KEY, newToken);
      await Storage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      setIsGuest(false);
      return { success: true, user: newUser };
    } catch (e) {
      return {
        success: false,
        error: e.response?.data?.message || e.message || "Erreur lors de l'inscription",
      };
    }
  }

  async function logout() {
    try { await authService.logout(); } catch (_e) { /* ignore network error */ }
    try { await Storage.removeItem(APP_CONFIG.TOKEN_KEY); } catch (_e) { /* ignore */ }
    try { await Storage.removeItem(APP_CONFIG.USER_KEY); } catch (_e) { /* ignore */ }
    setToken(null);
    setUser(null);
    setIsGuest(false);
  }

  function continueAsGuest() {
    try { Storage.removeItem(APP_CONFIG.TOKEN_KEY); } catch (_e) { /* ignore */ }
    try { Storage.removeItem(APP_CONFIG.USER_KEY); } catch (_e) { /* ignore */ }
    setToken(null);
    setUser(null);
    setIsGuest(true);
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
    Storage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(updatedUser)).catch(() => { /* ignore */ });
  }

  /** Recharge le profil depuis le backend et met à jour le cache local */
  async function refreshUser() {
    try {
      const freshUser = await userService.getMe();
      if (freshUser) {
        setUser(freshUser);
        Storage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(freshUser)).catch(() => {});
      }
    } catch (_e) { /* on garde l'user en cache si offline */ }
  }

  const value = {
    user,
    token,
    isLoading,
    isGuest,
    isLoggedIn:   !!user && !!token,
    canAccessApp: !!user || isGuest,
    login,
    register,
    logout,
    continueAsGuest,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être dans un AuthProvider');
  return ctx;
}

export default AuthContext;