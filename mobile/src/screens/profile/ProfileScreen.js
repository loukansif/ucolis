import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect }    from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { useAuth }     from '../../context/AuthContext';
import Avatar           from '../../components/common/Avatar';
import Badge            from '../../components/common/Badge';
import LanguageSwitcher from '../../components/common/LanguageSwitcher';
import Button           from '../../components/common/Button';
import COLORS           from '../../constants/colors';
import { t }            from '../../i18n/index';
import { USER_ROLES, USER_TYPES } from '../../constants/config';

export default function ProfileScreen({ navigation }) {
  const { user, logout, isLoggedIn, refreshUser } = useAuth();

  // ✅ Recharger le profil à chaque fois qu'on arrive sur l'écran Profil
  useFocusEffect(useCallback(() => {
    if (isLoggedIn) refreshUser();
  }, [isLoggedIn]));
  const insets                       = useSafeAreaInsets();

  const [notifEnabled, setNotifEnabled] = useState(true);

  async function handleLogout() {
    Alert.alert(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      [
        { text: t('common.cancel'),  style: 'cancel' },
        {
          text:  t('profile.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            // Navigation gérée par AppNavigator
          },
        },
      ]
    );
  }

  if (!isLoggedIn || !user) {
    return (
      <View style={[styles.guestContainer, { paddingTop: insets.top + 24 }]}>
        <MaterialCommunityIcons name="account-circle-outline" size={80} color={COLORS.border} />
        <Text style={styles.guestTitle}>{t('profile.guestMode')}</Text>
        <Text style={styles.guestDesc}>{t('auth.guestMessage')}</Text>
        <Button
          title={t('auth.login')}
          onPress={() => navigation.navigate('Login')}
          variant="primary"
          size="lg"
          style={styles.guestBtn}
        />
        <Button
          title={t('auth.register')}
          onPress={() => navigation.navigate('Register')}
          variant="outline"
          size="lg"
          style={styles.guestBtn}
        />
      </View>
    );
  }

  const fullName = `${user.prenom} ${user.nom}`;
  const roleLabel = {
    [USER_ROLES.SENDER]:  t('auth.roleSender'),
    [USER_ROLES.CARRIER]: t('auth.roleCarrier'),
    [USER_ROLES.BOTH]:    t('auth.roleBoth'),
  }[user.role] || user.role;

  const MENU_SECTIONS = [
    {
      title: t('profile.account'),
      items: [
        { icon: 'person-outline',       label: t('profile.editProfile'),    onPress: () => navigation.navigate('EditProfile') },
        { icon: 'lock-closed-outline',  label: t('profile.changePassword'), onPress: () => navigation.navigate('ChangePassword') },
        { icon: 'document-text-outline',label: t('profile.myDocuments'),    onPress: () => navigation.navigate('Documents'),
          badge: user.documentValidation === 'en_attente' ? '!' : null },
      ],
    },
    {
      title: t('profile.activity'),
      items: [
        { icon: 'cube-outline',       label: t('parcels.myParcels'), onPress: () => navigation.navigate('MesColis') },
        { icon: 'pricetag-outline',   label: t('offers.title'),      onPress: () => navigation.navigate('CarrierOffers', {}) },
        { icon: 'star-outline',       label: t('profile.myRatings'), onPress: () => navigation.navigate('Ratings') },
      ],
    },
    {
      title: t('profile.preferences'),
      items: [
        { icon: 'language-outline', label: t('profile.language'), custom: <LanguageSwitcher /> },
        {
          icon: 'notifications-outline',
          label: t('profile.notifications'),
          // ✅ 'switch' = rendu inline à droite du label (pas en bloc)
          switch: (
            <Switch
              value={notifEnabled}
              onValueChange={setNotifEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          ),
        },
      ],
    },
    ...(user.isAdmin ? [{
      title: '🛡️ Administration',
      items: [
        { icon: 'speedometer-outline', label: 'Dashboard admin',   onPress: () => navigation.navigate('AdminDashboard') },
        { icon: 'people-outline',      label: 'Utilisateurs',      onPress: () => navigation.navigate('AdminUsers') },
        { icon: 'cube-outline',        label: 'Annonces',          onPress: () => navigation.navigate('AdminParcels') },
        { icon: 'document-text-outline', label: 'Documents',       onPress: () => navigation.navigate('AdminDocuments') },
        { icon: 'star-outline',        label: 'Avis utilisateurs', onPress: () => navigation.navigate('AdminReviews') },
        { icon: 'flag-outline',          label: 'Signalements',      onPress: () => navigation.navigate('AdminSignalements') },
      ],
    }] : []),
    {
      title: t('profile.support'),
      items: [
        { icon: 'help-circle-outline', label: t('profile.help'),           onPress: () => navigation.navigate('Help') },
        { icon: 'information-circle-outline', label: t('profile.about'),   onPress: () => navigation.navigate('About') },
        { icon: 'shield-checkmark-outline',   label: t('profile.privacy'), onPress: () => navigation.navigate('Privacy') },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header gradient */}
      <LinearGradient
        colors={COLORS.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <Avatar
          uri={user.photoProfil}
          name={fullName}
          size={88}
          online
          style={styles.avatar}
        />
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.email}>{user.email}</Text>

        <View style={styles.badgesRow}>
          <Badge type={user.role} label={roleLabel} />
          {user.type === USER_TYPES.PROFESSIONNEL && (
            <Badge type="pro" style={styles.ml} />
          )}
          {user.documentValidation === 'valide' && (
            <Badge
              label="✓ Vérifié"
              color={COLORS.success}
              textColor={COLORS.white}
              style={styles.ml}
            />
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: t('home.totalSent'),    value: user.statistiques?.colisPublies    || 0 },
            { label: t('home.totalCarried'), value: user.statistiques?.colisLivres     || 0 },
            { label: 'Note',                 value: user.moyenne?.toFixed(1) || (user.totalAvis > 0 ? '0.0' : '—') },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Bouton modifier profil */}
        <TouchableOpacity
          onPress={() => navigation.navigate('EditProfile')}
          style={styles.editBtn}
        >
          <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
          <Text style={styles.editBtnText}>{t('profile.editProfile')}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Menu */}
      {MENU_SECTIONS.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCard}>
            {section.items.map((item, ii) => (
              // ✅ CORRIGÉ — LanguageSwitcher (item.custom) rendu en bloc sous le label,
              //    pas écrasé dans menuRight qui est trop étroit pour le afficher
              <View
                key={ii}
                style={ii < section.items.length - 1 ? styles.menuItemBorder : null}
              >
                <TouchableOpacity
                  onPress={item.custom ? undefined : item.onPress}
                  activeOpacity={item.custom ? 1 : 0.7}
                  style={styles.menuItem}
                >
                  <View style={styles.menuIconBox}>
                    <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.badge && (
                    <View style={styles.alertDot}>
                      <Text style={styles.alertDotText}>{item.badge}</Text>
                    </View>
                  )}
                  {!item.custom && (
                    <View style={styles.menuRight}>
                      {item.switch
                        ? item.switch
                        : <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                      }
                    </View>
                  )}
                </TouchableOpacity>
                {item.custom && (
                  <View style={styles.customWidget}>{item.custom}</View>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Déconnexion */}
      <View style={styles.logoutWrapper}>
        <Button
          title={t('profile.logout')}
          onPress={handleLogout}
          variant="danger"
          size="lg"
          leftIcon={<Ionicons name="log-out-outline" size={20} color={COLORS.white} />}
        />
      </View>

      {/* Version */}
      <Text style={styles.version}>UCOLIS v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: COLORS.background },
  header: {
    alignItems:     'center',
    paddingHorizontal: 24,
    paddingBottom:  32,
  },
  avatar:   { marginBottom: 14 },
  name:     { fontSize: 22, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  email:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 14 },
  badgesRow:{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  ml:       { marginLeft: 4 },
  statsRow: { flexDirection: 'row', gap: 32, marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statValue:{ fontSize: 22, fontWeight: '800', color: COLORS.white },
  statLabel:{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.white, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 20,
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  section:      { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard:  { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
  menuRight: { alignItems: 'flex-end' },
  // ✅ AJOUT — zone pour les widgets custom (LanguageSwitcher) affichés sous le menu item
  customWidget: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    marginTop: -4,
  },
  alertDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center',
    marginRight: 4,
  },
  alertDotText: { fontSize: 11, fontWeight: '800', color: COLORS.white },
  logoutWrapper: { paddingHorizontal: 16, marginTop: 24 },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.placeholder, marginTop: 16 },
  guestContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: COLORS.background },
  guestTitle:  { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginTop: 20, marginBottom: 8 },
  guestDesc:   { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  guestBtn:    { marginBottom: 12, alignSelf: 'stretch' },
});