import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { useAuth }          from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { chatService }      from '../services/chatService';
import { socketService }    from '../services/socketService';

import SplashScreen         from '../screens/auth/SplashScreen';
import OnboardingScreen     from '../screens/auth/OnboardingScreen';
import LoginScreen          from '../screens/auth/LoginScreen';
import RegisterScreen       from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import HomeScreen           from '../screens/home/HomeScreen';
import ParcelListScreen     from '../screens/parcels/ParcelListScreen';
import ParcelDetailScreen   from '../screens/parcels/ParcelDetailScreen';
import CreateParcelScreen   from '../screens/parcels/CreateParcelScreen';
import MyParcelsScreen      from '../screens/parcels/MyParcelsScreen';
import CarrierOffersScreen  from '../screens/parcels/CarrierOffersScreen';
import MapPickerScreen      from '../screens/map/MapPickerScreen';
import TrackingScreen            from '../screens/parcels/TrackingScreen';
import { useLocationPermission } from '../hooks/useLocationPermission';
import ConversationsScreen  from '../screens/chat/ConversationsScreen';
import ChatScreen           from '../screens/chat/ChatScreen';
import NotificationsScreen  from '../screens/notifications/NotificationsScreen';
import ProfileScreen        from '../screens/profile/ProfileScreen';
import EditProfileScreen    from '../screens/profile/EditProfileScreen';
import DocumentsScreen      from '../screens/profile/DocumentsScreen';
import RatingsScreen        from '../screens/profile/RatingsScreen';
import AdminDashboardScreen  from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen      from '../screens/admin/AdminUsersScreen';
import AdminDocumentsScreen  from '../screens/admin/AdminDocumentsScreen';
import AdminParcelsScreen    from '../screens/admin/AdminParcelsScreen';
import AdminReviewsScreen        from '../screens/admin/AdminReviewsScreen';
import AdminSignalementsScreen   from '../screens/admin/AdminSignalementsScreen';
import AdminConversationsScreen  from '../screens/admin/AdminConversationsScreen';
import AdminConversationScreen   from '../screens/admin/AdminConversationScreen';
import UserProfileScreen      from '../screens/profile/UserProfileScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import HelpScreen           from '../screens/profile/HelpScreen';
import AboutScreen          from '../screens/profile/AboutScreen';
import PrivacyScreen        from '../screens/profile/PrivacyScreen';

import COLORS from '../constants/colors';
import { t }  from '../i18n/index';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const SCREEN_OPTIONS = {
  headerShown: false,
  cardStyleInterpolator: ({ current }) => ({
    cardStyle: { opacity: current.progress },
  }),
};

// ─────────────────────────────────────────────────────────────
// Stacks

// ─────────────────────────────────────────────────────────────
// GuestScreen — affiché à la place de tout écran protégé
// ─────────────────────────────────────────────────────────────
function GuestScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center',
                   padding: 32, backgroundColor: COLORS.background,
                   paddingTop: insets.top + 24 }}>
      <MaterialCommunityIcons name="account-circle-outline" size={80} color={COLORS.border} />
      <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.textPrimary,
                     marginTop: 20, marginBottom: 8 }}>
        Mode invité
      </Text>
      <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center',
                     lineHeight: 24, marginBottom: 32 }}>
        Connectez-vous ou créez un compte pour accéder à toutes les fonctionnalités.
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14,
                 paddingHorizontal: 32, marginBottom: 12, alignSelf: 'stretch',
                 alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Se connecter</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => navigation.navigate('Register')}
        style={{ borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12,
                 paddingVertical: 14, paddingHorizontal: 32, alignSelf: 'stretch',
                 alignItems: 'center' }}
      >
        <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 16 }}>Créer un compte</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
function AnnoncesStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="ParcelList"    component={ParcelListScreen} />
      {/* ParcelDetail est dans le RootStack — accessible depuis tous les onglets */}
      <Stack.Screen name="MapPicker"     component={MapPickerScreen} />
      <Stack.Screen name="CarrierOffers" component={CarrierOffersScreen} />
    </Stack.Navigator>
  );
}

// ✅ CreateStack : CreateParcelScreen + MapPicker dans le même Stack
// Ainsi navigation.navigate('MapPicker') + goBack() restent dans cet onglet
function CreateStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="CreateParcel" component={CreateParcelScreen} />
      <Stack.Screen name="MapPicker"    component={MapPickerScreen} />
    </Stack.Navigator>
  );
}

function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="Conversations" component={ConversationsScreen} />
      <Stack.Screen name="Chat"          component={ChatScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="ProfileMain"    component={ProfileScreen} />
      <Stack.Screen name="EditProfile"    component={EditProfileScreen} />
      <Stack.Screen name="Documents"      component={DocumentsScreen} />
      <Stack.Screen name="Ratings"        component={RatingsScreen} />
      <Stack.Screen name="AdminDashboard"  component={AdminDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminUsers"      component={AdminUsersScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="AdminDocuments"  component={AdminDocumentsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminParcels"    component={AdminParcelsScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="AdminReviews"       component={AdminReviewsScreen}        options={{ headerShown: false }} />
      <Stack.Screen name="AdminSignalements"   component={AdminSignalementsScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="AdminConversations"  component={AdminConversationsScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="AdminConversation"   component={AdminConversationScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="MesColis"       component={MyParcelsScreen} />
      <Stack.Screen name="CarrierOffers"    component={CarrierOffersScreen} />
      <Stack.Screen name="UserProfile"      component={UserProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Help"           component={HelpScreen} />
      <Stack.Screen name="About"          component={AboutScreen} />
      <Stack.Screen name="Privacy"        component={PrivacyScreen} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────
// Icône de tab standard
// ─────────────────────────────────────────────────────────────
function TabIcon({ iconLib, icon, iconFocused, label, focused, badge }) {
  const Icon = iconLib === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={tabStyles.tabItem}>
      <View style={[tabStyles.iconBg, focused && tabStyles.iconBgActive]}>
        <Icon
          name={focused && iconFocused ? iconFocused : icon}
          size={22}
          color={focused ? COLORS.primary : COLORS.tabInactive}
        />
        {badge > 0 && (
          <View style={tabStyles.badgeWrap}>
            <Text style={tabStyles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function PublierIcon({ focused }) {
  return (
    <View style={tabStyles.tabItem}>
      <View style={[tabStyles.iconBg, tabStyles.publishBg, focused && tabStyles.publishBgActive]}>
        <MaterialCommunityIcons
          name="plus-circle"
          size={22}
          color={focused ? COLORS.white : COLORS.tabInactive}
        />
      </View>
      <Text style={[tabStyles.label, tabStyles.publishLabel, focused && tabStyles.publishLabelActive]} numberOfLines={1}>
        {t('nav.create')}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Tab Navigator principal
// ─────────────────────────────────────────────────────────────
function MainTabs() {
  const { isGuest }    = useAuth();
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = React.useState(0);

  const refreshUnreadMessages = React.useCallback(async () => {
    if (!user) return;
    try {
      const convs = await chatService.getConversations();
      const total = (convs || []).reduce((sum, conv) => {
        const entry = (conv.unreadCount || []).find(
          u => String(u.user?._id || u.user) === String(user._id)
        );
        return sum + (entry?.count || 0);
      }, 0);
      setUnreadMessages(total);
    } catch (_) {}
  }, [user]);

  React.useEffect(() => {
    async function setupBadge() {
      const socket = await socketService.connect();
      if (user?._id) socketService.joinUserRoom(user._id);
      refreshUnreadMessages();
      socket.on('new_notification', refreshUnreadMessages);
      // ✅ messages_read = je viens de lire → reset optimiste immédiat
      socket.on('messages_read', ({ readBy }) => {
        if (String(readBy) === String(user?._id)) {
          setUnreadMessages(0);
          setTimeout(refreshUnreadMessages, 800);
        }
      });
      return () => {
        socket.off('new_notification', refreshUnreadMessages);
        socket.off('messages_read');
      };
    }
    let cleanup;
    setupBadge().then(fn => { cleanup = fn; });

    return () => { cleanup?.(); };
  }, [refreshUnreadMessages]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: tabStyles.bar,
        tabBarItemStyle: tabStyles.barItem,
        sceneContainerStyle: { paddingBottom: 80 },
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconLib="ion" icon="home-outline" iconFocused="home" label={t('nav.home')} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Annonces"
        component={isGuest ? GuestScreen : AnnoncesStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconLib="mci" icon="cube-outline" iconFocused="cube" label={t('nav.parcels')} focused={focused} />
          ),
        }}
      />
      {/* ✅ "Créer" utilise maintenant CreateStack au lieu de CreateParcelScreen directement */}
      <Tab.Screen
        name="Créer"
        component={isGuest ? GuestScreen : CreateStack}
        options={{
          tabBarIcon: ({ focused }) => <PublierIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={isGuest ? GuestScreen : MessagesStack}
        listeners={{ tabPress: () => setUnreadMessages(0) }}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconLib="ion" icon="chatbubble-outline" iconFocused="chatbubble" label={t('nav.messages')} focused={focused} badge={unreadMessages} />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={isGuest ? GuestScreen : NotificationsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconLib="ion" icon="notifications-outline" iconFocused="notifications" label={t('nav.notifications')} focused={focused} badge={unreadCount} />
          ),
        }}
      />
      <Tab.Screen
        name="Profil"
        component={isGuest ? GuestScreen : ProfileStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconLib="ion" icon="person-outline" iconFocused="person" label={t('nav.profile')} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const BAR_HEIGHT = 60;

const tabStyles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT + 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
  },
  barItem: {
    height: BAR_HEIGHT,
    paddingTop: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconBg: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBgActive:  { backgroundColor: '#FFF0EB' },
  label:         { fontSize: 10, fontWeight: '500', color: COLORS.tabInactive, letterSpacing: 0.1 },
  labelActive:   { color: COLORS.primary, fontWeight: '700' },
  badgeWrap: {
    position: 'absolute', top: -3, right: -6,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.error,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: COLORS.white,
  },
  badgeText:          { fontSize: 9, fontWeight: '800', color: COLORS.white },
  publishBg:          { width: 44, height: 30, borderRadius: 15 },
  publishBgActive:    { backgroundColor: COLORS.primary, borderStyle: 'solid', borderColor: COLORS.primary },
  publishLabel:       { color: COLORS.tabInactive, fontWeight: '600' },
  publishLabelActive: { color: COLORS.primary, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────
// Root Stack
// ─────────────────────────────────────────────────────────────
// ── Composant interne pour appeler le hook après AuthProvider ──
function LocationPermissionManager() {
  useLocationPermission();
  return null;
}

function RootStack() {
  const { canAccessApp, isLoading } = useAuth();
  const [minSplashDone, setMinSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !minSplashDone) return <SplashScreen />;

  return (
    <>
    <LocationPermissionManager />
    <Stack.Navigator
      screenOptions={SCREEN_OPTIONS}
      initialRouteName={canAccessApp ? 'Main' : 'Onboarding'}
    >
      <Stack.Screen name="Onboarding"     component={OnboardingScreen} />
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="Main"           component={MainTabs} />
      {/* ✅ Écrans accessibles depuis n'importe quel onglet sans polluer les stacks */}
      <Stack.Screen name="ParcelDetail"   component={ParcelDetailScreen} />
      <Stack.Screen name="MapPickerModal"  component={MapPickerScreen} />
      <Stack.Screen name="Tracking"        component={TrackingScreen} />
      <Stack.Screen name="CarrierOffers"    component={CarrierOffersScreen} />
      <Stack.Screen name="UserProfile"      component={UserProfileScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────
export default function AppNavigator({ navigationRef, onReady }) {
  const localRef = useRef(null);
  const ref = navigationRef || localRef;

  useEffect(() => {
    let sub;
    try {
      const Notifications = require('expo-notifications');
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        if (!ref.current || !data) return;
        if (data.parcelId) {
          // ✅ ParcelDetail est dans RootStack — pas besoin de passer par l'onglet Annonces
          ref.current.navigate('ParcelDetail', { parcelId: data.parcelId });
        } else if (data.conversationId) {
          ref.current.navigate('Messages', {
            screen: 'Chat',
            params: { conversationId: data.conversationId },
          });
        }
      });
    } catch (_e) { /* expo-notifications non disponible */ }
    return () => { if (sub) sub.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NavigationContainer ref={ref} onReady={onReady}>
      <RootStack />
    </NavigationContainer>
  );
}