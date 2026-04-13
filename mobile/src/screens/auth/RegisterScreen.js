import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, Alert, Modal, FlatList, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth }   from '../../context/AuthContext';
import Input         from '../../components/common/Input';
import Button        from '../../components/common/Button';
import COLORS        from '../../constants/colors';
import { t }         from '../../i18n/index';
import { validateRegisterForm }         from '../../utils/validators';
import { getWilayaNames, getCommunesByWilaya } from '../../utils/wilayas';
import { USER_ROLES, USER_TYPES }       from '../../constants/config';
import { userService }                  from '../../services/userService';

// ── PickerModal ───────────────────────────────────────────────
function PickerModal({ visible, title, data, selected, onSelect, onClose }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item, i) => `${item}-${i}`}
            renderItem={({ item }) => {
              const isSelected = selected === item;
              return (
                <TouchableOpacity
                  style={[modalStyles.item, isSelected && modalStyles.itemSelected]}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[modalStyles.itemText, isSelected && modalStyles.itemTextSelected]}>
                    {item}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={modalStyles.separator} />}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── SelectField ───────────────────────────────────────────────
function SelectField({ label, value, placeholder, onPress, error, disabled }) {
  return (
    <View style={styles.fieldWrapper}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TouchableOpacity
        style={[
          styles.selectBtn,
          error    && styles.selectBtnError,
          disabled && styles.selectBtnDisabled,
        ]}
        onPress={onPress}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.selectText, (!value || disabled) && styles.selectPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={disabled ? COLORS.border : COLORS.textSecondary} />
      </TouchableOpacity>
      {error ? <Text style={styles.errTxt}>{error}</Text> : null}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const { register, isLoading } = useAuth();
  const insets  = useSafeAreaInsets();
  const wilayas = getWilayaNames();

  const [form, setForm] = useState({
    nom:               '',
    prenom:            '',
    email:             '',
    telephone:         '',
    motDePasse:        '',
    confirmMotDePasse: '',
    wilaya:            '',
    ville:             '',
    role:              USER_ROLES.SENDER,
    typeCompte:        USER_TYPES.PARTICULIER,
  });
  const [errors,      setErrors]      = useState({});
  const [photo,       setPhoto]       = useState(null);
  const [showWilayas, setShowWilayas] = useState(false);
  const [showVilles,  setShowVilles]  = useState(false);
  // ✅ FIX 3 : état local pour bloquer les doubles clics
  const [submitting,  setSubmitting]  = useState(false);

  // ── Helpers ─────────────────────────────────────────────────
  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  }

  function selectWilaya(w) {
    setForm(prev => ({ ...prev, wilaya: w, ville: '' }));
    setErrors(prev => ({ ...prev, wilaya: null, ville: null }));
  }

  // ✅ FIX 2 : Rôle multi-select — Expéditeur + Transporteur → 'both'
  function toggleRole(value) {
    const current = form.role;
    let next;
    if (value === USER_ROLES.SENDER) {
      // Expéditeur cliqué
      if (current === USER_ROLES.SENDER)       next = USER_ROLES.SENDER;  // seul actif → on garde
      else if (current === USER_ROLES.CARRIER) next = USER_ROLES.BOTH;    // ajouter
      else if (current === USER_ROLES.BOTH)    next = USER_ROLES.CARRIER; // retirer
      else                                     next = USER_ROLES.SENDER;
    } else {
      // Transporteur cliqué
      if (current === USER_ROLES.CARRIER)      next = USER_ROLES.CARRIER; // seul actif → on garde
      else if (current === USER_ROLES.SENDER)  next = USER_ROLES.BOTH;    // ajouter
      else if (current === USER_ROLES.BOTH)    next = USER_ROLES.SENDER;  // retirer
      else                                     next = USER_ROLES.CARRIER;
    }
    update('role', next);
  }

  const isSenderActive  = form.role === USER_ROLES.SENDER  || form.role === USER_ROLES.BOTH;
  const isCarrierActive = form.role === USER_ROLES.CARRIER || form.role === USER_ROLES.BOTH;

  // ── Sélection photo ─────────────────────────────────────────
  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', 'Permission requise pour accéder à la galerie');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:    ImagePicker.MediaTypeOptions.Images,
      quality:       0.85,
      allowsEditing: true,
      aspect:        [1, 1],
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', 'Permission requise pour accéder à la caméra');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality:       0.85,
      allowsEditing: true,
      aspect:        [1, 1],
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  }

  function showPhotoOptions() {
    Alert.alert('Photo de profil', 'Choisir une source', [
      { text: '📷 Caméra',         onPress: takePhoto },
      { text: '🖼️ Galerie',        onPress: pickPhoto },
      photo
        ? { text: '🗑️ Supprimer',  onPress: () => setPhoto(null), style: 'destructive' }
        : null,
      { text: 'Annuler',           style: 'cancel' },
    ].filter(Boolean));
  }

  // ── Soumission ──────────────────────────────────────────────
  async function handleRegister() {
    // ✅ FIX 3 : bloquer double clic
    if (submitting || isLoading) return;

    const { isValid, errors: formErrors } = validateRegisterForm(form);
    if (!isValid) {
      setErrors(formErrors);
      Alert.alert('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires (*)');
      return;
    }

    try {
      setSubmitting(true);
      const result = await register(form);

      if (!result) {
        Alert.alert('Erreur', 'Aucune réponse du serveur');
        return;
      }

      if (result.success) {
        // ✅ FIX 1 : upload photo après inscription avec le bon token
        if (photo) {
          try {
            const fd = new FormData();
            fd.append('photo', {
              uri:  photo.uri,
              type: photo.mimeType || 'image/jpeg',
              name: 'profile.jpg',
            });
            await userService.uploadProfilePhoto(fd);
          } catch (photoErr) {
            console.warn('Upload photo profil:', photoErr.message);
          }
        }
        Alert.alert('✅ Bienvenue sur UCOLIS !', t('auth.registerSuccess'), [
          {
            text: 'Commencer',
            onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }),
          },
        ]);
      } else {
        Alert.alert('Erreur inscription', result.error || t('errors.generic'));
      }
    } catch (e) {
      Alert.alert('Erreur', e.message || t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────
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
        {/* ── Header ── */}
        <LinearGradient
          colors={COLORS.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('auth.register')}</Text>
          <Text style={styles.headerSub}>UCOLIS</Text>
        </LinearGradient>

        <View style={styles.form}>

          {/* ── Photo de profil ── */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={showPhotoOptions} activeOpacity={0.8} style={styles.avatarWrapper}>
              {photo ? (
                <Image source={{ uri: photo.uri }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={COLORS.border} />
                </View>
              )}
              <View style={styles.cameraBtn}>
                <Ionicons name="camera" size={16} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarLabel}>
              {photo ? 'Changer la photo' : 'Ajouter une photo'}{' '}
              <Text style={styles.avatarOptional}>(optionnel)</Text>
            </Text>
          </View>

          {/* ── Nom + Prénom ── */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label={`${t('auth.lastName')} *`}
                placeholder="Dupont"
                value={form.nom}
                onChangeText={(v) => update('nom', v)}
                autoCapitalize="words"
                error={errors.nom ? t(errors.nom) : null}
              />
            </View>
            <View style={styles.half}>
              <Input
                label={`${t('auth.firstName')} *`}
                placeholder="Mohamed"
                value={form.prenom}
                onChangeText={(v) => update('prenom', v)}
                autoCapitalize="words"
                error={errors.prenom ? t(errors.prenom) : null}
              />
            </View>
          </View>

          {/* ── Email ── */}
          <Input
            label={`${t('auth.email')} *`}
            placeholder="exemple@email.com"
            value={form.email}
            onChangeText={(v) => update('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email ? t(errors.email) : null}
            leftIcon={<Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} />}
          />

          {/* ── Téléphone ── */}
          <Input
            label={`${t('auth.phone')} *`}
            placeholder="0555 123 456"
            value={form.telephone}
            onChangeText={(v) => update('telephone', v)}
            keyboardType="phone-pad"
            error={errors.telephone ? t(errors.telephone) : null}
            leftIcon={<Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />}
          />

          {/* ── Wilaya ── */}
          <SelectField
            label={`${t('auth.wilaya')} *`}
            value={form.wilaya}
            placeholder="Sélectionner votre wilaya"
            onPress={() => setShowWilayas(true)}
            error={errors.wilaya ? t(errors.wilaya) : null}
          />

          {/* ── Ville ── */}
          <SelectField
            label="Ville / Commune *"
            value={form.ville}
            placeholder={form.wilaya ? 'Sélectionner votre ville' : "Choisissez d'abord la wilaya"}
            onPress={() => {
              if (!form.wilaya) {
                Alert.alert('', "Choisissez d'abord votre wilaya");
                return;
              }
              setShowVilles(true);
            }}
            error={errors.ville ? t(errors.ville) : null}
            disabled={!form.wilaya}
          />

          {/* ✅ FIX 2 : Rôle — 2 chips indépendantes, sélection multiple → 'both' */}
          <Text style={styles.fieldLabel}>{t('auth.role')} *</Text>
          <View style={styles.rolesRow}>
            <TouchableOpacity
              onPress={() => toggleRole(USER_ROLES.SENDER)}
              style={[styles.roleBtn, isSenderActive && styles.roleBtnActive]}
            >
              <MaterialCommunityIcons
                name="package-variant"
                size={18}
                color={isSenderActive ? COLORS.primary : COLORS.textSecondary}
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.roleTxt, isSenderActive && styles.roleTxtActive]}>
                Expéditeur
              </Text>
              {isSenderActive && (
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} style={{ marginTop: 2 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleRole(USER_ROLES.CARRIER)}
              style={[styles.roleBtn, isCarrierActive && styles.roleBtnActive]}
            >
              <MaterialCommunityIcons
                name="truck-delivery"
                size={18}
                color={isCarrierActive ? COLORS.primary : COLORS.textSecondary}
                style={{ marginBottom: 4 }}
              />
              <Text style={[styles.roleTxt, isCarrierActive && styles.roleTxtActive]}>
                Transporteur
              </Text>
              {isCarrierActive && (
                <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} style={{ marginTop: 2 }} />
              )}
            </TouchableOpacity>
          </View>
          {form.role === USER_ROLES.BOTH && (
            <View style={styles.bothNote}>
              <MaterialCommunityIcons name="check-decagram" size={14} color={COLORS.primary} />
              <Text style={styles.bothNoteText}>Vous pouvez envoyer et transporter des colis</Text>
            </View>
          )}

          {/* ── Type compte ── */}
          <Text style={styles.fieldLabel}>{t('auth.accountType')} *</Text>
          <View style={styles.rolesRow}>
            {[
              { value: USER_TYPES.PARTICULIER,   label: t('auth.particulier') },
              { value: USER_TYPES.PROFESSIONNEL,  label: t('auth.professionnel') },
            ].map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => update('typeCompte', r.value)}
                style={[styles.roleBtn, form.typeCompte === r.value && styles.roleBtnActive]}
              >
                <Text style={[styles.roleTxt, form.typeCompte === r.value && styles.roleTxtActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {form.typeCompte === USER_TYPES.PROFESSIONNEL && (
            <View style={styles.proNote}>
              <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.warning} />
              <Text style={styles.proNoteText}>{t('auth.validationPendingMessage')}</Text>
            </View>
          )}

          {/* ── Mot de passe ── */}
          <Input
            label={`${t('auth.password')} *`}
            placeholder="Minimum 8 caractères"
            value={form.motDePasse}
            onChangeText={(v) => update('motDePasse', v)}
            secureTextEntry
            error={errors.motDePasse ? t(errors.motDePasse) : null}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />}
          />

          <Input
            label={`${t('auth.confirmPassword')} *`}
            placeholder="••••••••"
            value={form.confirmMotDePasse}
            onChangeText={(v) => update('confirmMotDePasse', v)}
            secureTextEntry
            error={errors.confirmMotDePasse ? t(errors.confirmMotDePasse) : null}
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} />}
          />

          {/* ✅ FIX 3 : bouton désactivé pendant soumission */}
          <Button
            title={submitting ? 'Inscription en cours...' : t('auth.register')}
            onPress={handleRegister}
            variant="primary"
            size="lg"
            loading={submitting || isLoading}
            disabled={submitting || isLoading}
            style={{ marginTop: 8 }}
            leftIcon={<Ionicons name="person-add-outline" size={20} color={COLORS.white} />}
          />

          {/* ── Lien connexion ── */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>{t('auth.hasAccount')} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{t('auth.login')}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* ── Modal Wilaya ── */}
      <PickerModal
        visible={showWilayas}
        title="Sélectionner votre wilaya"
        data={wilayas}
        selected={form.wilaya}
        onSelect={selectWilaya}
        onClose={() => setShowWilayas(false)}
      />

      {/* ── Modal Ville ── */}
      <PickerModal
        visible={showVilles}
        title={`Ville — ${form.wilaya}`}
        data={getCommunesByWilaya(form.wilaya)}
        selected={form.ville}
        onSelect={(v) => update('ville', v)}
        onClose={() => setShowVilles(false)}
      />

    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1 },

  header: {
    paddingHorizontal: 24,
    paddingBottom:     32,
  },
  backBtn:     { marginBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  headerSub:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  form: {
    backgroundColor:      COLORS.background,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    marginTop: -20,
    padding:   24,
    paddingTop: 32,
    flex: 1,
  },

  // ── Avatar ──
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrapper: { position: 'relative', marginBottom: 8 },
  avatarImg: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 3, borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: COLORS.white,
  },
  avatarLabel:    { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  avatarOptional: { color: COLORS.textSecondary, fontWeight: '400' },

  // ── Fields ──
  row:  { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  fieldWrapper: { marginBottom: 16 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: COLORS.inputBackground,
  },
  selectBtnError:    { borderColor: COLORS.error },
  selectBtnDisabled: { opacity: 0.5 },
  selectText:        { fontSize: 15, color: COLORS.textPrimary, flex: 1 },
  selectPlaceholder: { color: COLORS.textSecondary },
  errTxt:            { fontSize: 12, color: COLORS.error, marginTop: 4 },

  // ── Rôles ──
  rolesRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center', borderWidth: 1.5,
    borderColor: COLORS.border, backgroundColor: COLORS.inputBackground,
  },
  roleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  roleTxt:       { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  roleTxtActive: { color: COLORS.primary },

  // ── Both note ──
  bothNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, marginBottom: 16,
  },
  bothNoteText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  // ── Pro note ──
  proNote: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#FFFBEB', padding: 12,
    borderRadius: 10, marginBottom: 16,
    borderWidth: 1, borderColor: '#FCD34D',
  },
  proNoteText: { flex: 1, fontSize: 12, color: COLORS.warning, lineHeight: 18 },

  // ── Bas de page ──
  loginRow:  { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText: { fontSize: 14, color: COLORS.textSecondary },
  loginLink: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%', paddingBottom: 20,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title:            { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  item:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  itemSelected:     { backgroundColor: COLORS.primary + '12' },
  itemText:         { fontSize: 15, color: COLORS.textPrimary },
  itemTextSelected: { color: COLORS.primary, fontWeight: '700' },
  separator:        { height: 1, backgroundColor: COLORS.border + '40', marginHorizontal: 16 },
});