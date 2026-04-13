import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';

const SECTIONS = [
  {
    icon: 'person-circle-outline',
    title: 'Données collectées',
    content:
      "Nous collectons uniquement les données nécessaires au fonctionnement du service : nom, prénom, adresse e-mail, numéro de téléphone, wilaya de résidence et, si vous êtes transporteur, les documents d'identité requis par la loi.",
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Utilisation de vos données',
    content:
      'Vos données sont utilisées exclusivement pour : l\'authentification à votre compte, la mise en relation entre expéditeurs et transporteurs, l\'envoi de notifications liées à vos colis, et la conformité aux obligations légales algériennes.',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Sécurité',
    content:
      'Toutes les communications entre l\'application et nos serveurs sont chiffrées via HTTPS/TLS. Les mots de passe sont stockés sous forme de hash (bcrypt) et ne sont jamais accessibles en clair, même par notre équipe.',
  },
  {
    icon: 'share-social-outline',
    title: 'Partage avec des tiers',
    content:
      'Nous ne vendons ni ne louons vos données personnelles à des tiers. Vos informations peuvent être partagées uniquement avec l\'autre partie d\'une transaction (nom et téléphone) après acceptation d\'une offre, ou si la loi l\'exige.',
  },
  {
    icon: 'location-outline',
    title: 'Données de localisation',
    content:
      'La localisation GPS est utilisée uniquement pour détecter votre wilaya et pré-remplir les champs de départ/arrivée. Elle n\'est jamais stockée de façon continue ni partagée en temps réel.',
  },
  {
    icon: 'trash-outline',
    title: 'Suppression de vos données',
    content:
      'Vous pouvez demander la suppression de votre compte et de toutes vos données associées à tout moment en contactant notre support. La suppression est effective sous 30 jours, sous réserve des obligations légales de conservation.',
  },
  {
    icon: 'refresh-outline',
    title: 'Mises à jour de cette politique',
    content:
      'Cette politique de confidentialité peut être mise à jour. Vous serez notifié par e-mail ou via l\'application en cas de modification substantielle. La date de dernière mise à jour est indiquée en bas de cette page.',
  },
];

function Section({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setOpen((v) => !v)}
      style={styles.sectionItem}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.menuIconBox}>
          <Ionicons name={item.icon} size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.sectionItemTitle}>{item.title}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.textSecondary}
        />
      </View>
      {open && <Text style={styles.sectionContent}>{item.content}</Text>}
    </TouchableOpacity>
  );
}

export default function PrivacyScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={[styles.navHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Confidentialité</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introBox}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.introTitle}>Politique de confidentialité</Text>
          <Text style={styles.introSub}>
            Chez UCOLIS, la protection de vos données personnelles est une priorité.
            Cette politique explique quelles données nous collectons et comment nous les utilisons.
          </Text>
        </View>

        {/* Sections accordéon */}
        <Text style={styles.listSectionTitle}>Vos droits et nos engagements</Text>
        <View style={styles.card}>
          {SECTIONS.map((item, i) => (
            <View key={i}>
              <Section item={item} />
              {i < SECTIONS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Contact DPO */}
        <Text style={styles.listSectionTitle}>Contact & exercice de vos droits</Text>
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:privacy@ucolis.dz')}
            activeOpacity={0.7}
            style={styles.contactItem}
          >
            <View style={styles.menuIconBox}>
              <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Responsable protection des données</Text>
              <Text style={styles.contactValue}>privacy@ucolis.dz</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Dernière mise à jour : janvier 2025{'\n'}
          Conformément à la législation algérienne en vigueur.
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

  introBox: {
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFF3EE',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  introTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 },
  introSub:   { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },

  listSectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginHorizontal: 16, marginBottom: 8, marginTop: 4,
  },
  card: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: COLORS.border },

  sectionItem:   { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center',
  },
  sectionItemTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  sectionContent:   { marginTop: 12, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  contactItem:  { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  contactLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  contactValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },

  footer: {
    textAlign: 'center', fontSize: 12, color: COLORS.placeholder,
    marginTop: 8, lineHeight: 20,
  },
});