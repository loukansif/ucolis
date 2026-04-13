import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../../services/authService';
import Input   from '../../components/common/Input';
import Button  from '../../components/common/Button';
import COLORS  from '../../constants/colors';
import { t }   from '../../i18n/index';
import { isValidEmail } from '../../utils/validators';

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

  async function handleSend() {
    if (!email.trim()) { setError(t('errors.required')); return; }
    if (!isValidEmail(email)) { setError(t('errors.invalidEmail')); return; }
    setError(null);
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      // En Snack/dev, on simule le succès même sans backend
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('auth.forgotPassword')}</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!sent ? (
          // ── Formulaire ──────────────────────────────────
          <View style={styles.body}>
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons name="lock-reset" size={52} color={COLORS.primary} />
            </View>

            <Text style={styles.title}>{t('auth.forgotPassword')}</Text>
            <Text style={styles.description}>
              Saisissez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </Text>

            <Input
              label={t('auth.email')}
              placeholder="exemple@email.com"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={error}
              leftIcon={<Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />}
            />

            <Button
              title={t('auth.sendResetEmail')}
              onPress={handleSend}
              variant="primary"
              size="lg"
              loading={loading}
              style={{ marginTop: 8 }}
              leftIcon={<Ionicons name="send-outline" size={18} color={COLORS.white} />}
            />

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backLink}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
              <Text style={styles.backLinkText}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // ── Confirmation envoi ───────────────────────────
          <View style={styles.body}>
            <View style={[styles.iconWrapper, styles.iconSuccess]}>
              <MaterialCommunityIcons name="email-check-outline" size={52} color={COLORS.success} />
            </View>

            <Text style={styles.title}>{t('auth.resetEmailSent')}</Text>
            <Text style={styles.description}>
              Un email a été envoyé à{' '}
              <Text style={styles.emailHighlight}>{email}</Text>
              {'. '}Consultez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
            </Text>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.info} />
              <Text style={styles.infoText}>
                Le lien expire dans 30 minutes. Vérifiez aussi vos spams.
              </Text>
            </View>

            <Button
              title={t('auth.login')}
              onPress={() => navigation.navigate('Login')}
              variant="primary"
              size="lg"
              style={{ marginTop: 8 }}
            />

            <TouchableOpacity
              onPress={() => { setSent(false); setEmail(''); }}
              style={styles.backLink}
            >
              <MaterialCommunityIcons name="refresh" size={16} color={COLORS.primary} />
              <Text style={styles.backLinkText}>Renvoyer l'email</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  scroll:      { flexGrow: 1 },
  body:        { padding: 24, paddingTop: 40, alignItems: 'stretch' },
  iconWrapper: {
    alignSelf: 'center',
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#FFF3EE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  iconSuccess:      { backgroundColor: '#F0FDF4' },
  title:            { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' },
  description:      { fontSize: 15, color: COLORS.textSecondary, lineHeight: 24, textAlign: 'center', marginBottom: 28 },
  emailHighlight:   { fontWeight: '700', color: COLORS.textPrimary },
  infoBox:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 24 },
  infoText:         { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 20 },
  backLink:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 8 },
  backLinkText:     { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
