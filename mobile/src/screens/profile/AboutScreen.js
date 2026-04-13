import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Linking, Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';

const APP_VERSION = '1.0.0';

const LINKS = [
  {
    icon: 'globe-outline',
    label: 'Site web',
    value: 'www.ucolis.dz',
    onPress: () => Linking.openURL('https://ucolis.dz'),
  },
  {
    icon: 'logo-facebook',
    label: 'Facebook',
    value: 'facebook.com/ucolis',
    onPress: () => Linking.openURL('https://facebook.com/ucolis'),
  },
  {
    icon: 'logo-instagram',
    label: 'Instagram',
    value: '@ucolis.dz',
    onPress: () => Linking.openURL('https://instagram.com/ucolis.dz'),
  },
];

const STATS = [
  { icon: 'package-variant-closed', label: 'Wilayas couvertes', value: '58' },
  { icon: 'account-group-outline',  label: 'Utilisateurs',      value: '10K+' },
  { icon: 'truck-fast-outline',     label: 'Colis livrés',      value: '50K+' },
];

export default function AboutScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={[styles.navHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>À propos</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient */}
        <LinearGradient
          colors={COLORS.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="truck-delivery-outline" size={44} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>UCOLIS</Text>
          <Text style={styles.tagline}>La livraison entre particuliers en Algérie</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version {APP_VERSION}</Text>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((s, i) => (
            <View key={i} style={styles.statBox}>
              <MaterialCommunityIcons name={s.icon} size={24} color={COLORS.primary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Mission */}
        <Text style={styles.sectionTitle}>Notre mission</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            UCOLIS connecte les expéditeurs et les transporteurs à travers toute l'Algérie.
            Notre plateforme permet d'envoyer des colis de manière sûre, rapide et économique
            en s'appuyant sur des particuliers qui font déjà le trajet.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 12 }]}>
            Nous croyons en une économie collaborative qui profite à tous : l'expéditeur
            économise sur les frais d'envoi, le transporteur optimise son déplacement.
          </Text>
        </View>

        {/* Liens */}
        <Text style={styles.sectionTitle}>Retrouvez-nous</Text>
        <View style={styles.card}>
          {LINKS.map((item, i) => (
            <View key={i}>
              <TouchableOpacity
                onPress={item.onPress}
                activeOpacity={0.7}
                style={styles.linkItem}
              >
                <View style={styles.menuIconBox}>
                  <Ionicons name={item.icon} size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.linkLabel}>{item.label}</Text>
                  <Text style={styles.linkValue}>{item.value}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {i < LINKS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          © {new Date().getFullYear()} UCOLIS — Tous droits réservés{'\n'}
          Fait avec ❤️ en Algérie 🇩🇿
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },

  navHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  hero: {
    alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24,
  },
  logoCircle: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  appName:  { fontSize: 28, fontWeight: '900', color: COLORS.white, letterSpacing: 1 },
  tagline:  { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 6, textAlign: 'center' },
  versionBadge: {
    marginTop: 16, paddingHorizontal: 14, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
  },
  versionText: { fontSize: 13, color: COLORS.white, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    backgroundColor: COLORS.card,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 18,
  },
  statBox:   { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginHorizontal: 16, marginBottom: 8, marginTop: 20,
  },
  card: {
    marginHorizontal: 16,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  bodyText: {
    fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, padding: 16,
  },
  divider: { height: 1, backgroundColor: COLORS.border },
  linkItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center',
  },
  linkLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  linkValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },

  footer: {
    textAlign: 'center', fontSize: 12, color: COLORS.placeholder,
    marginTop: 28, lineHeight: 20,
  },
});