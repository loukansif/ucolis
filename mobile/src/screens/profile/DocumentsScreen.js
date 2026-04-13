import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker    from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }       from '../../context/AuthContext';
import { userService }   from '../../services/userService';
import Badge   from '../../components/common/Badge';
import Button  from '../../components/common/Button';
import Loader  from '../../components/common/Loader';
import COLORS  from '../../constants/colors';
import { t }   from '../../i18n/index';

const DOC_TYPES = [
  { key: 'carteIdentite',  icon: 'card-account-details-outline', label: t('docs.idCard')        },
  { key: 'permisConduire', icon: 'steering',                     label: t('docs.drivingLicense') },
  { key: 'carteGrise',     icon: 'file-document-outline',        label: t('docs.vehicleReg')     },
  { key: 'assurance',      icon: 'shield-check-outline',         label: t('docs.insurance')      },
];

export default function DocumentsScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const insets               = useSafeAreaInsets();
  const [docs,    setDocs]    = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null); // key du doc en cours

  useEffect(() => { fetchDocs(); }, []);

  async function fetchDocs() {
    try {
      setLoading(true);
      const data = await userService.getDocuments();
      setDocs(data || {});
    } catch (e) {
      console.warn('Documents:', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(docType) {
    Alert.alert(
      t('docs.upload'),
      t('docs.uploadDescription'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('docs.fromGallery'),
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return;
            const r = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.9,
            });
            if (!r.canceled && r.assets?.[0]) uploadFile(docType, r.assets[0]);
          },
        },
        {
          text: t('docs.fromFiles'),
          onPress: async () => {
            const r = await DocumentPicker.getDocumentAsync({
              type: ['image/*', 'application/pdf'],
              copyToCacheDirectory: true,
            });
            if (r.type !== 'cancel' && r.uri) uploadFile(docType, { uri: r.uri, name: r.name });
          },
        },
      ]
    );
  }

  async function uploadFile(docType, asset) {
    setUploading(docType);
    try {
      const fd = new FormData();
      fd.append('document', {
        uri:  asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.name    || `${docType}.jpg`,
      });
      fd.append('type', docType);
      const updated = await userService.uploadDocument(fd);
      setDocs(prev => ({ ...prev, [docType]: updated[docType] }));
      Alert.alert('', t('docs.uploadSuccess'));
    } catch (e) {
      Alert.alert('', e.response?.data?.message || t('errors.generic'));
    } finally {
      setUploading(null);
    }
  }

  if (loading) return <Loader fullScreen />;

  const globalStatus = user?.documentValidation || 'non_soumis';

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.myDocuments')}</Text>
        <Badge type={globalStatus} label={t(`docs.status.${globalStatus}`)} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information-outline" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>{t('docs.validationInfo')}</Text>
        </View>

        {DOC_TYPES.map((doc) => {
          const uploaded = docs[doc.key];
          const isUploading = uploading === doc.key;

          return (
            <View key={doc.key} style={styles.docCard}>
              <View style={styles.docHeader}>
                <View style={styles.docIconBox}>
                  <MaterialCommunityIcons name={doc.icon} size={24} color={COLORS.primary} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  {uploaded ? (
                    <Badge
                      type={uploaded.statut || 'en_attente'}
                      label={t(`docs.status.${uploaded.statut || 'en_attente'}`)}
                    />
                  ) : (
                    <Text style={styles.notUploaded}>{t('docs.notUploaded')}</Text>
                  )}
                </View>
              </View>

              <Button
                title={uploaded ? t('docs.replace') : t('docs.upload')}
                onPress={() => handleUpload(doc.key)}
                variant={uploaded ? 'outline' : 'primary'}
                size="sm"
                loading={isUploading}
                leftIcon={
                  <MaterialCommunityIcons
                    name={uploaded ? 'refresh' : 'upload'}
                    size={16}
                    color={uploaded ? COLORS.primary : COLORS.white}
                  />
                }
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backBtn: { padding: 4 },
  title:   { flex: 1, fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  scroll:  { padding: 16 },
  infoBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 20 },
  docCard: {
    backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, gap: 14,
  },
  docHeader:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  docIconBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center',
  },
  docInfo:    { flex: 1, gap: 4 },
  docLabel:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  notUploaded:{ fontSize: 12, color: COLORS.textSecondary },
});
