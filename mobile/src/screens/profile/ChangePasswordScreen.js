import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userService } from '../../services/userService';
import Input   from '../../components/common/Input';
import Button  from '../../components/common/Button';
import COLORS  from '../../constants/colors';
import { t }   from '../../i18n/index';

export default function ChangePasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [form,    setForm]    = useState({ current: '', next: '', confirm: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  }

  function validate() {
    const e = {};
    if (!form.current)          e.current  = 'errors.required';
    if (form.next.length < 8)   e.next     = 'errors.passwordTooShort';
    if (form.next !== form.confirm) e.confirm = 'errors.passwordMismatch';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      await userService.changePassword({
        ancienMotDePasse: form.current,
        nouveauMotDePasse: form.next,
      });
      Alert.alert('', t('profile.passwordChanged'));
      navigation.goBack();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.changePassword')}</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconWrapper}>
          <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
        </View>

        <Input
          label={t('profile.currentPassword')}
          value={form.current}
          onChangeText={(v) => update('current', v)}
          secureTextEntry
          error={errors.current ? t(errors.current) : null}
          leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />}
        />
        <Input
          label={t('profile.newPassword')}
          value={form.next}
          onChangeText={(v) => update('next', v)}
          secureTextEntry
          error={errors.next ? t(errors.next) : null}
          leftIcon={<Ionicons name="lock-open-outline" size={18} color={COLORS.textSecondary} />}
        />
        <Input
          label={t('auth.confirmPassword')}
          value={form.confirm}
          onChangeText={(v) => update('confirm', v)}
          secureTextEntry
          error={errors.confirm ? t(errors.confirm) : null}
          leftIcon={<Ionicons name="lock-open-outline" size={18} color={COLORS.textSecondary} />}
        />

        <Button
          title={t('common.save')}
          onPress={handleSave}
          variant="primary"
          size="lg"
          loading={loading}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  scroll:      { padding: 24 },
  iconWrapper: {
    alignSelf: 'center', width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
});
