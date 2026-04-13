import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import Avatar  from '../../components/common/Avatar';
import Input   from '../../components/common/Input';
import Button  from '../../components/common/Button';
import Loader  from '../../components/common/Loader';
import COLORS  from '../../constants/colors';
import { t }   from '../../i18n/index';
import { getWilayaNames, getCommunesByWilaya } from '../../utils/wilayas';
import { USER_ROLES, USER_TYPES } from '../../constants/config';

// ── PickerModal ────────────────────────────────────────────────
function PickerModal({ visible, title, data, selected, onSelect, onClose }) {
  if (!visible) return null;
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
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
            keyExtractor={(item, index) => `${item}-${index}`}
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

// ── EditProfileScreen ──────────────────────────────────────────
export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const insets  = useSafeAreaInsets();
  const wilayas = getWilayaNames();

  const [form, setForm] = useState({
    prenom:    user?.prenom    || '',
    nom:       user?.nom       || '',
    telephone: user?.telephone || '',
    wilaya:    user?.wilaya    || '',
    ville:     user?.ville     || '',
    bio:       user?.bio       || '',
    role:      user?.role      || USER_ROLES.SENDER,
    typeCompte: user?.typeCompte || USER_TYPES.PARTICULIER,
  });
  const [errors,          setErrors]          = useState({});
  const [loading,         setLoading]         = useState(false);
  const [photo,           setPhoto]           = useState(null);
  const [showWilayaModal, setShowWilayaModal] = useState(false);
  const [showVilleModal,  setShowVilleModal]  = useState(false);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  }

  function toggleRole(value) {
    const current = form.role;
    let next;
    if (value === USER_ROLES.SENDER) {
      if (current === USER_ROLES.SENDER)       next = USER_ROLES.SENDER;
      else if (current === USER_ROLES.CARRIER) next = USER_ROLES.BOTH;
      else if (current === USER_ROLES.BOTH)    next = USER_ROLES.CARRIER;
      else                                     next = USER_ROLES.SENDER;
    } else {
      if (current === USER_ROLES.CARRIER)      next = USER_ROLES.CARRIER;
      else if (current === USER_ROLES.SENDER)  next = USER_ROLES.BOTH;
      else if (current === USER_ROLES.BOTH)    next = USER_ROLES.SENDER;
      else                                     next = USER_ROLES.CARRIER;
    }
    update('role', next);
  }

  function selectWilaya(w) {
    setForm((prev) => ({ ...prev, wilaya: w, ville: '' })); // reset ville
    setErrors((prev) => ({ ...prev, wilaya: null, ville: null }));
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:    0.85,
      allowsEditing: true,
      aspect:     [1, 1],
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  }

  async function handleSave() {
    const newErrors = {};
    if (!form.prenom.trim()) newErrors.prenom = 'errors.required';
    if (!form.nom.trim())    newErrors.nom    = 'errors.required';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // ✅ PUT /users/profile  (corrigé via ENDPOINTS.UPDATE_PROFILE)
      const updated = await userService.updateProfile(form);

      if (photo) {
        const fd = new FormData();
        fd.append('photo', {
          uri:  photo.uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });
        // ✅ PUT /users/profile/photo  (corrigé via ENDPOINTS.UPLOAD_PHOTO)
        const withPhoto = await userService.uploadProfilePhoto(fd);
        updateUser(withPhoto);
      } else {
        updateUser(updated);
      }

      Alert.alert('', t('profile.updateSuccess'));
      navigation.goBack();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loader fullScreen message={t('common.loading')} />;

  const photoUri = photo?.uri || user?.photoProfil;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.editProfile')}</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Photo de profil */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Avatar
              uri={photoUri}
              name={`${user?.prenom} ${user?.nom}`}
              size={100}
            />
            <TouchableOpacity onPress={pickPhoto} style={styles.cameraBtn}>
              <Ionicons name="camera" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.changePhotoText}>{t('profile.changePhoto')}</Text>
        </View>

        <View style={styles.form}>

          {/* Prénom + Nom */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label={t('auth.firstName')}
                value={form.prenom}
                onChangeText={(v) => update('prenom', v)}
                autoCapitalize="words"
                error={errors.prenom ? t(errors.prenom) : null}
              />
            </View>
            <View style={styles.half}>
              <Input
                label={t('auth.lastName')}
                value={form.nom}
                onChangeText={(v) => update('nom', v)}
                autoCapitalize="words"
                error={errors.nom ? t(errors.nom) : null}
              />
            </View>
          </View>

          {/* Téléphone */}
          <Input
            label={t('auth.phone')}
            value={form.telephone}
            onChangeText={(v) => update('telephone', v)}
            keyboardType="phone-pad"
            leftIcon={
              <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
            }
          />

          {/* Wilaya — PickerModal ✅ */}
          <Text style={styles.fieldLabel}>{t('auth.wilaya')}</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setShowWilayaModal(true)}
            activeOpacity={0.7}
          >
            <Text style={form.wilaya ? styles.selectValue : styles.selectPlaceholder}>
              {form.wilaya || t('parcels.selectWilaya')}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Ville — PickerModal ✅ */}
          <Text style={styles.fieldLabel}>{t('auth.city') || 'Ville'}</Text>
          <TouchableOpacity
            style={[styles.selectBtn, !form.wilaya && styles.selectBtnDisabled]}
            onPress={() => {
              if (!form.wilaya) {
                Alert.alert('', "Choisissez d'abord votre wilaya");
                return;
              }
              setShowVilleModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={form.ville ? styles.selectValue : styles.selectPlaceholder}>
              {form.ville
                ? form.ville
                : form.wilaya
                  ? 'Sélectionner une ville'
                  : "Choisissez d'abord la wilaya"}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Bio */}
          <Input
            label={t('profile.bio')}
            placeholder="Décrivez-vous en quelques mots..."
            value={form.bio}
            onChangeText={(v) => update('bio', v)}
            multiline
            numberOfLines={3}
          />

          {/* ── Rôle ── */}
          <Text style={styles.fieldLabel}>Rôle</Text>
          <View style={styles.rolesRow}>
            <TouchableOpacity
              onPress={() => toggleRole(USER_ROLES.SENDER)}
              style={[styles.roleBtn, (form.role === USER_ROLES.SENDER || form.role === USER_ROLES.BOTH) && styles.roleBtnActive]}
            >
              <MaterialCommunityIcons
                name="package-variant"
                size={16}
                color={(form.role === USER_ROLES.SENDER || form.role === USER_ROLES.BOTH) ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.roleTxt, (form.role === USER_ROLES.SENDER || form.role === USER_ROLES.BOTH) && styles.roleTxtActive]}>
                Expéditeur
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleRole(USER_ROLES.CARRIER)}
              style={[styles.roleBtn, (form.role === USER_ROLES.CARRIER || form.role === USER_ROLES.BOTH) && styles.roleBtnActive]}
            >
              <MaterialCommunityIcons
                name="truck-delivery"
                size={16}
                color={(form.role === USER_ROLES.CARRIER || form.role === USER_ROLES.BOTH) ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.roleTxt, (form.role === USER_ROLES.CARRIER || form.role === USER_ROLES.BOTH) && styles.roleTxtActive]}>
                Transporteur
              </Text>
            </TouchableOpacity>
          </View>
          {form.role === USER_ROLES.BOTH && (
            <View style={styles.bothNote}>
              <MaterialCommunityIcons name="check-decagram" size={13} color={COLORS.primary} />
              <Text style={styles.bothNoteText}>Expéditeur et transporteur</Text>
            </View>
          )}

          {/* ── Type de compte ── */}
          <Text style={styles.fieldLabel}>Type de compte</Text>
          <View style={styles.rolesRow}>
            {[
              { value: USER_TYPES.PARTICULIER,   label: 'Particulier' },
              { value: USER_TYPES.PROFESSIONNEL,  label: 'Professionnel' },
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

          {/* Bouton Enregistrer */}
          <Button
            title={t('common.save')}
            onPress={handleSave}
            variant="primary"
            size="lg"
            loading={loading}
            style={{ marginTop: 8 }}
            leftIcon={
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.white} />
            }
          />
        </View>
      </ScrollView>

      {/* Modal Wilaya */}
      <PickerModal
        visible={showWilayaModal}
        title={t('parcels.selectWilaya') || 'Sélectionner une wilaya'}
        data={wilayas}
        selected={form.wilaya}
        onSelect={selectWilaya}
        onClose={() => setShowWilayaModal(false)}
      />

      {/* Modal Ville */}
      <PickerModal
        visible={showVilleModal}
        title={form.wilaya ? `Ville — ${form.wilaya}` : 'Sélectionner une ville'}
        data={getCommunesByWilaya(form.wilaya)}
        selected={form.ville}
        onSelect={(v) => update('ville', v)}
        onClose={() => setShowVilleModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },

  header: {
    backgroundColor: COLORS.secondary,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             14,
    paddingHorizontal: 16,
    paddingBottom:   16,
  },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },

  scroll: { padding: 24 },

  avatarSection:   { alignItems: 'center', marginBottom: 28 },
  avatarWrapper:   { position: 'relative', marginBottom: 8 },
  cameraBtn: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2.5,
    borderColor:     COLORS.white,
  },
  changePhotoText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  form: { gap: 0 },
  row:  { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  // Champs select (Wilaya / Ville)
  fieldLabel: {
    fontSize:    13,
    fontWeight:  '600',
    color:       COLORS.textPrimary,
    marginBottom: 6,
    marginTop:   4,
  },
  selectBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    borderWidth:     1.5,
    borderColor:     COLORS.border,
    borderRadius:    12,
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom:    16,
  },
  selectBtnDisabled: {
    opacity: 0.5,
  },
  selectValue: {
    fontSize: 15,
    color:    COLORS.textPrimary,
    flex:     1,
  },
  selectPlaceholder: {
    fontSize: 15,
    color:    COLORS.textSecondary,
    flex:     1,
  },

  // ── Rôle / Type compte ──────────────────────────────────────
  rolesRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.inputBackground,
  },
  roleBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  roleTxt:       { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  roleTxtActive: { color: COLORS.primary },
  bothNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary + '10',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, marginBottom: 12,
  },
  bothNoteText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
});

const modalStyles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor:    COLORS.card,
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    maxHeight:          '75%',
    paddingBottom:      20,
  },
  header: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    padding:           20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title:            { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  item:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  itemSelected:     { backgroundColor: COLORS.primary + '12' },
  itemText:         { fontSize: 15, color: COLORS.textPrimary },
  itemTextSelected: { color: COLORS.primary, fontWeight: '700' },
  separator:        { height: 1, backgroundColor: COLORS.border + '40', marginHorizontal: 16 },
});