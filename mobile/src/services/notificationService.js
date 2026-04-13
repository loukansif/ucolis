import api from './api';
import { ENDPOINTS } from '../constants/api';

/**
 * Récupère les notifications de l'utilisateur
 * @param {object} params - { page, limit }
 * @returns {Promise<object>} { notifications, unreadCount }
 */
async function getNotifications(params = {}) {
  const response = await api.get(ENDPOINTS.NOTIFICATIONS, { params });
  const data = response.data;
  // Backend retourne nonLues, frontend attend unreadCount
  return {
    ...data,
    unreadCount: data.nonLues ?? data.unreadCount ?? 0,
  };
}

/**
 * Marque une notification comme lue
 * @param {string} notifId
 * @returns {Promise<object>}
 */
async function markAsRead(notifId) {
  const response = await api.patch(ENDPOINTS.MARK_NOTIF_READ(notifId)); // ✅ CORRIGÉ : NOTIF_MARK_READ → MARK_NOTIF_READ
  return response.data;
}

/**
 * Marque toutes les notifications comme lues
 * @returns {Promise<object>}
 */
async function markAllAsRead() {
  const response = await api.patch(ENDPOINTS.MARK_ALL_READ); // ✅ CORRIGÉ : NOTIF_MARK_ALL_READ → MARK_ALL_READ
  return response.data;
}

export const notificationService = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};

export default notificationService;