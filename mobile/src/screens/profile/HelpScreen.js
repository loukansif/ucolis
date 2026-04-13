import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../constants/colors';

const FAQ = [
  {
    q: 'Comment créer une annonce de colis ?',
    a: 'Appuyez sur le bouton "+" en bas de l\'écran, remplissez les informations de votre colis (départ, arrivée, poids, prix) puis publiez votre annonce.',
  },
  {
    q: 'Comment fonctionne le système d\'offres ?',
    a: 'Les transporteurs voient vos annonces et vous soumettent des offres de prix. Vous pouvez accepter ou refuser chaque offre depuis l\'écran de détail du colis.',
  },
  {
    q: 'Mon annonce n\'apparaît pas dans la liste. Pourquoi ?',
    a: 'Vérifiez que votre annonce est bien au statut "Disponible". Si elle est en négociation ou annulée, elle n\'apparaît pas dans les résultats publics.',
  },
  {
    q: 'Comment contacter un transporteur ?',
    a: 'Depuis la page de détail d\'une offre, utilisez le bouton "Message" pour ouvrir une conversation privée avec le transporteur.',
  },
  {
    q: 'Comment valider mes documents ?',
    a: 'Rendez-vous dans Profil → Mes Documents, uploadez vos justificatifs. Notre équipe les vérifie sous 24–48h.',
  },
  {
    q: 'Je n\'arrive pas à me connecter. Que faire ?',
    a: 'Vérifiez votre connexion Internet, puis essayez de réinitialiser votre mot de passe via "Mot de passe oublié" sur l\'écran de connexion.',
  },
];

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setOpen((v) => !v)}
      style={styles.faqItem}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQ}>{item.q}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.primary}
        />
      </View>
      {open && <Text style={styles.faqA}>{item.a}</Text>}
    </TouchableOpacity>
  );
}

export default function HelpScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={[styles.navHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Aide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View style={styles.introBox}>
          <View style={styles.iconCircle}>
            <Ionicons name="help-circle" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.introTitle}>Comment pouvons-nous vous aider ?</Text>
          <Text style={styles.introSub}>
            Retrouvez les réponses aux questions les plus fréquentes ci-dessous.
          </Text>
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>Questions fréquentes</Text>
        <View style={styles.card}>
          {FAQ.map((item, i) => (
            <View key={i}>
              <FaqItem item={item} />
              {i < FAQ.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Contact */}
        <Text style={styles.sectionTitle}>Nous contacter</Text>
        <View style={styles.card}>
          {[
            {
              icon: 'mail-outline',
              label: 'Email',
              value: 'support@ucolis.dz',
              onPress: () => Linking.openURL('mailto:support@ucolis.dz'),
            },
            {
              icon: 'logo-whatsapp',
              label: 'WhatsApp',
              value: '+213 555 000 000',
              onPress: () => Linking.openURL('https://wa.me/213555000000'),
            },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={i}
              onPress={item.onPress}
              activeOpacity={0.7}
              style={[styles.contactItem, i < arr.length - 1 && styles.divider]}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name={item.icon} size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>{item.label}</Text>
                <Text style={styles.contactValue}>{item.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  introBox: {
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFF3EE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  introTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 },
  introSub:   { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },

  sectionTitle: {
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

  faqItem:   { padding: 16 },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  faqQ:      { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 20 },
  faqA:      { marginTop: 10, fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },

  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  menuIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center',
  },
  contactLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  contactValue: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
});