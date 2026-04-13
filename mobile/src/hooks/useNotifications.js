import { useNotifications as useNotifContext } from '../context/NotificationContext';

/**
 * Hook raccourci pour accéder au contexte des notifications.
 * Expose : notifications, unreadCount, isLoading,
 *          fetchNotifications(), markAsRead(), markAllAsRead()
 */
export function useNotifications() {
  return useNotifContext();
}

export default useNotifications;
