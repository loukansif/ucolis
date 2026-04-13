import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationService } from '../services/notificationService';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import api from '../services/api';
import { ENDPOINTS } from '../constants/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

const initialState = {
  notifications: [],
  unreadCount:   0,
  isLoading:     false,
};

function notifReducer(state, action) {
  switch (action.type) {
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload.notifications,
        unreadCount:   action.payload.unreadCount,
        isLoading:     false,
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount:   state.unreadCount + 1,
      };
    case 'MARK_READ':
      return {
        ...state,
        // ✅ champ DB : lu (pas lue)
        notifications: state.notifications.map(n =>
          n._id === action.payload ? { ...n, lu: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    case 'MARK_ALL_READ':
      return {
        ...state,
        // ✅ champ DB : lu (pas lue)
        notifications: state.notifications.map(n => ({ ...n, lu: true })),
        unreadCount: 0,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [state, dispatch]    = useReducer(notifReducer, initialState);
  const { user, isLoggedIn } = useAuth();
  const notificationListener = useRef();
  const responseListener     = useRef();

  // ✅ useCallback pour stabiliser la référence — évite la boucle infinie
  // dans les useEffect des screens qui en dépendent
  const fetchNotifications = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const data = await notificationService.getNotifications({ page: 1, limit: 50 });
      dispatch({
        type:    'SET_NOTIFICATIONS',
        payload: { notifications: data.notifications, unreadCount: data.nonLues ?? data.unreadCount ?? 0 },
      });
    } catch (e) {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []); // pas de dépendances : dispatch est stable

  useEffect(() => {
    if (isLoggedIn && user) {
      registerForPushNotifications();
      fetchNotifications();
      setupSocketListeners();
    }
    return () => {
      if (notificationListener.current)
        Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current)
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user]);

  async function registerForPushNotifications() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const tokenData     = await Notifications.getExpoPushTokenAsync();
      const expoPushToken = tokenData.data;
      await api.post(ENDPOINTS.USER_PUSH_TOKEN, { expoPushToken });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name:             'default',
          importance:       Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor:       '#FF6B35',
        });
      }

      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          const data = notification.request.content.data;
          if (data) dispatch({ type: 'ADD_NOTIFICATION', payload: data });
        }
      );

      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (_response) => {
          // Navigation gérée depuis AppNavigator via deep links
        }
      );
    } catch (e) {
      console.warn('[Push] Erreur enregistrement:', e.message);
    }
  }

  function setupSocketListeners() {
    async function init() {
      const socket = await socketService.connect();

      const joinRoom = () => {
        if (user?._id) {
          socket.emit('join_user', user._id.toString());
        }
      };

      // ✅ Rejoindre immédiatement + à chaque (re)connexion
      joinRoom();
      socket.off('connect',   joinRoom);
      socket.on('connect',    joinRoom);
      socket.on('reconnect',  joinRoom);

      const refresh = () => fetchNotifications();

      // ✅ Nettoyer les anciens listeners avant d'en ajouter
      socket.off('new_notification');
      socket.off('notification');
      socket.off('new_offer');
      socket.off('offer_accepted');
      socket.off('parcel_status');

      socket.on('new_notification', () => {
        console.log('[NotifContext] new_notification reçu → refresh');
        refresh();
      });
      socket.on('notification',   (notif) => dispatch({ type: 'ADD_NOTIFICATION', payload: notif }));
      socket.on('new_offer',      refresh);
      socket.on('offer_accepted', refresh);
      socket.on('parcel_status',  refresh);
    }
    init();
  }

  async function markAsRead(notifId) {
    try {
      await notificationService.markAsRead(notifId);
      dispatch({ type: 'MARK_READ', payload: notifId });
    } catch (e) {
      console.warn('[Notif] markAsRead error:', e.message);
    }
  }

  async function markAllAsRead() {
    try {
      await notificationService.markAllAsRead();
      dispatch({ type: 'MARK_ALL_READ' });
    } catch (e) {
      console.warn('[Notif] markAllAsRead error:', e.message);
    }
  }

  const value = { ...state, fetchNotifications, markAsRead, markAllAsRead };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}