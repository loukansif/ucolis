import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../context/NotificationContext';
import EmptyState from '../../components/common/EmptyState';
import Loader     from '../../components/common/Loader';
import COLORS     from '../../constants/colors';
import { t }      from '../../i18n/index';
import { formatRelativeDate } from '../../utils/formatters';
import { NOTIF_TYPES } from '../../constants/config';

const NOTIF_ICONS = {
  [NOTIF_TYPES.NOUVELLE_ANNONCE]:  { icon: 'package-variant',        color: COLORS.primary  },
  [NOTIF_TYPES.NOUVELLE_OFFRE]:    { icon: 'tag-outline',             color: COLORS.warning  },
  [NOTIF_TYPES.OFFRE_ACCEPTEE]:    { icon: 'check-circle-outline',    color: COLORS.success  },
  [NOTIF_TYPES.OFFRE_REFUSEE]:     { icon: 'close-circle-outline',    color: COLORS.error    },
  [NOTIF_TYPES.NOUVEAU_MESSAGE]:   { icon: 'message-text-outline',    color: '#9333EA'       },
  [NOTIF_TYPES.STATUT_LIVRAISON]:  { icon: 'truck-fast-outline',      color: COLORS.accent   },
  [NOTIF_TYPES.DOCUMENT_VALIDE]:   { icon: 'shield-check-outline',    color: COLORS.success  },
  [NOTIF_TYPES.DOCUMENT_REFUSE]:   { icon: 'shield-off-outline',      color: COLORS.error    },
};

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    notifications, unreadCount, isLoading,
    fetchNotifications, markAsRead, markAllAsRead,
  } = useNotifications();

  // fetchNotifications est stable (useCallback dans le contexte) — pas de boucle infinie
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  function handlePress(notif) {
    if (!notif.lu) markAsRead(notif._id);

    const data = notif.data;

    // ✅ Messages → Chat
    if (notif.type === 'nouveau_message' && data?.conversationId) {
      navigation.navigate('Messages', {
        screen: 'Chat',
        params: { conversationId: data.conversationId },
      });
      return;
    }
    if (data?.conversationId) {
      navigation.navigate('Messages', {
        screen: 'Chat',
        params: { conversationId: data.conversationId },
      });
      return;
    }

    if (data?.parcelId) {
      const parcelId = data.parcelId?._id ?? data.parcelId;
      // ✅ Livraison confirmée → ouvrir ParcelDetail et déclencher le modal de notation
      // ✅ Toujours naviguer vers l'annonce — le bouton notation est sur la page
      navigation.navigate('ParcelDetail', { parcelId: String(parcelId) });
    }
  }

  if (isLoading) return <Loader fullScreen />;

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('notifications.title')}</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAll}>{t('notifications.markAllRead')}</Text>
          </TouchableOpacity>
        )}
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        renderItem={({ item }) => {
          const cfg = NOTIF_ICONS[item.type] || { icon: 'bell-outline', color: COLORS.primary };
          // ✅ champ DB : lu (pas lue)
          const isUnread = !item.lu;
          return (
            <TouchableOpacity
              onPress={() => handlePress(item)}
              style={[styles.notifItem, isUnread && styles.unread]}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: cfg.color + '20' }]}>
                <MaterialCommunityIcons name={cfg.icon} size={24} color={cfg.color} />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{item.titre}</Text>
                <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text>
                <Text style={styles.notifTime}>{formatRelativeDate(item.createdAt)}</Text>
              </View>
              {isUnread && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="bell-off-outline"
            title={t('notifications.noNotifications')}
            description={t('notifications.noNotificationsDescription')}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: COLORS.background },
  header:    { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title:        { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  markAll:      { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  list:         { paddingBottom: 32 },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  unread:       { backgroundColor: '#FFF8F5' },
  iconBox: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  notifMsg:     { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 4 },
  notifTime:    { fontSize: 11, color: COLORS.placeholder },
  unreadDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.primary, marginTop: 4, flexShrink: 0,
  },
});