import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }  from '../../context/AuthContext';
import Input   from '../../components/common/Input';
import Button  from '../../components/common/Button';
import COLORS  from '../../constants/colors';
import { t }   from '../../i18n/index';
import { validateLoginForm } from '../../utils/validators';

export default function LoginScreen({ navigation }) {
  const { login, continueAsGuest } = useAuth();
  const insets = useSafeAreaInsets();

  const [form,    setForm]    = useState({ email: '', motDePasse: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [secure,  setSecure]  = useState(true);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  }

  async function handleLogin() {
    const { isValid, errors: formErrors } = validateLoginForm(form);
    if (!isValid) { setErrors(formErrors); return; }

    setLoading(true);
    try {
      const result = await login(form.email.trim(), form.motDePasse);
      if (result.success) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        // ✅ Afficher l'erreur inline sur le champ concerné quand c'est précis
        if (result.errorTitle === 'Email introuvable') {
          setErrors(prev => ({ ...prev, email: result.error }));
        } else if (result.errorTitle === 'Mot de passe incorrect') {
          setErrors(prev => ({ ...prev, motDePasse: result.error }));
        } else {
          // Compte suspendu, erreur réseau, etc. → alerte globale
          Alert.alert(result.errorTitle || 'Erreur', result.error);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // ✅ continueAsGuest + navigation explicite vers Main
  function handleGuestMode() {
    continueAsGuest();
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }

  // ✅ navigate fonctionne car ForgotPassword est dans le même stack unique
  function handleForgotPassword() {
    navigation.navigate('ForgotPassword');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header gradient */}
        <LinearGradient
          colors={COLORS.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.header, { paddingTop: insets.top + 32 }]}
        >
          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="truck-fast" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>UCOLIS</Text>
          <Text style={styles.tagline}>{t('app.tagline')}</Text>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.title}>{t('auth.login')}</Text>
          <Text style={styles.subtitle}>Bon retour 👋</Text>

          <Input
            label={t('auth.email')}
            placeholder="exemple@email.com"
            value={form.email}
            onChangeText={(v) => update('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email ? t(errors.email) : null}
            leftIcon={<Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />}
          />

          <Input
            label={t('auth.password')}
            placeholder="••••••••"
            value={form.motDePasse}
            onChangeText={(v) => update('motDePasse', v)}
            secureTextEntry={secure}
            error={errors.motDePasse ? t(errors.motDePasse) : null}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />}
            rightElement={
              <TouchableOpacity onPress={() => setSecure(s => !s)}>
                <Ionicons
                  name={secure ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            }
          />

          {/* Mot de passe oublié */}
          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>{t('auth.forgotPassword')} ?</Text>
          </TouchableOpacity>

          <Button
            title={t('auth.login')}
            onPress={handleLogin}
            variant="primary"
            size="lg"
            loading={loading}
            style={styles.loginBtn}
          />

          {/* Séparateur */}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>{t('common.or')}</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Continuer sans compte */}
          <TouchableOpacity
            onPress={handleGuestMode}
            style={styles.guestBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.guestText}>{t('auth.continueAsGuest')}</Text>
          </TouchableOpacity>

          {/* Lien inscription */}
          <View style={styles.registerRow}>
            <Text style={styles.registerLabel}>{t('auth.noAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>{t('auth.register')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: COLORS.background },
  scroll:    { flexGrow: 1 },
  header:    { alignItems: 'center', paddingBottom: 40, paddingHorizontal: 24 },
  logoBox:   {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  appName:   { fontSize: 32, fontWeight: '900', color: COLORS.white, letterSpacing: 4 },
  tagline:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  body:      { padding: 24, paddingTop: 32 },
  title:     { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  subtitle:  { fontSize: 15, color: COLORS.textSecondary, marginBottom: 28 },
  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 8, marginBottom: 4 },
  forgotText:{ fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  loginBtn:  { marginTop: 8 },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  separatorLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  separatorText: { fontSize: 13, color: COLORS.textSecondary },
  guestBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14,
    paddingVertical: 14, backgroundColor: COLORS.card, marginBottom: 20,
  },
  guestText:     { fontSize: 15, color: COLORS.textSecondary, fontWeight: '600' },
  registerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  registerLabel: { fontSize: 14, color: COLORS.textSecondary },
  registerLink:  { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
});