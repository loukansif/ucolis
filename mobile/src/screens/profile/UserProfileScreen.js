import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userService }   from '../../services/userService';
import { adminService }  from '../../services/adminService';
import { chatService }   from '../../services/chatService';
import { useAuth }       from '../../context/AuthContext';
import { ratingService } from '../../services/ratingService';
import Avatar     from '../../components/common/Avatar';
import Badge      from '../../components/common/Badge';
import Loader     from '../../components/common/Loader';
import COLORS     from '../../constants/colors';
import ReportModal from '../../components/common/ReportModal';
import { formatRelativeDate } from '../../utils/formatters';
import moment from 'moment';

function Stars({ note, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Ionicons key={i} name={i <= note ? 'star' : 'star-outline'}
          size={size} color={COLORS.warning} />
      ))}
    </View>
  );
}

function StatBox({ label, value, icon }) {
  return (
    <View style={styles.statBox}>
      <Ionicons name={icon} size={20} color={COLORS.primary} />
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function UserProfileScreen({ navigation, route }) {
  const { userId, userName } = route.params;
  const insets  = useSafeAreaInsets();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.isAdmin === true;

  const [user,         setUser]         = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [reportUser,   setReportUser]   = useState(false);
  const [reportAvis, setReportAvis] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => { load(); }, [userId]);

  async function load() {
    try {
      setLoading(true);
      const [userData, reviewData] = await Promise.all([
        userService.getUserById(userId),
        ratingService.getUserRatings(userId),
      ]);
      setUser(userData);
      setReviews(reviewData?.avis || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Loader fullScreen />;

  if (error || !user) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnAbs}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Ionicons name="person-circle-outline" size={64} color={COLORS.border} />
        <Text style={styles.errorText}>Profil introuvable</Text>
      </View>
    );
  }

  const fullName  = `${user.prenom} ${user.nom}`;

  async function handleToggleBan() {
    const action = user.isActif === false ? 'réactiver' : 'suspendre';
    Alert.alert(
      user.isActif === false ? 'Réactiver le compte' : 'Suspendre le compte',
      `Voulez-vous ${action} le compte de ${fullName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: user.isActif === false ? 'Réactiver' : 'Suspendre', style: 'destructive',
          onPress: async () => {
            try {
              setAdminLoading(true);
              await adminService.toggleBan(userId);
              await load();
            } catch (e) {
              Alert.alert('Erreur', e.message);
            } finally { setAdminLoading(false); }
          }
        },
      ]
    );
  }

  async function handleDeleteUser() {
    Alert.alert(
      'Supprimer le compte',
      `Cette action est irréversible. Supprimer le compte de ${fullName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              setAdminLoading(true);
              await adminService.deleteUser(userId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Erreur', e.message);
              setAdminLoading(false);
            }
          }
        },
      ]
    );
  }

  async function handleContactUser() {
    try {
      setAdminLoading(true);
      const conv = await chatService.createConversation(userId, null);
      const convId = conv?._id || conv?.conversationId || conv?.conversation?._id;
      navigation.navigate('Messages', {
        screen: 'Chat',
        params: { conversationId: convId, otherUser: user },
      });
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally { setAdminLoading(false); }
  }
  const roleLabel = { sender: 'Expéditeur', carrier: 'Transporteur', both: 'Expéditeur & Transporteur' }[user.role] || user.role;
  const memberSince = moment(user.createdAt).format('MMMM YYYY');

  return (
    <>
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header gradient ── */}
      <LinearGradient
        colors={COLORS.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { top: insets.top + 8 }]}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setReportUser(true)}
          style={[styles.reportBtn, { top: insets.top + 8 }]}
        >
          <Ionicons name="flag-outline" size={20} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>


        <Avatar uri={user.photoProfil} name={fullName} size={90} style={styles.avatar} />
        <Text style={styles.name}>{fullName}</Text>

        {user.ville || user.wilaya ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.location}>
              {[user.ville, user.wilaya].filter(Boolean).join(', ')}
            </Text>
          </View>
        ) : null}

        <View style={styles.badgesRow}>
          <Badge type={user.role} label={roleLabel} />
          {user.typeCompte === 'professionnel' && (
            <Badge type="pro" style={styles.ml} />
          )}
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <StatBox icon="cube-outline"         label="Publiés"  value={user.statistiques?.colisPublies ?? 0} />
          <View style={styles.statDivider} />
          <StatBox icon="checkmark-done-outline" label="Livrés" value={user.statistiques?.colisLivres  ?? 0} />
          <View style={styles.statDivider} />
          <StatBox icon="star-outline"           label="Note"   value={user.moyenne ? user.moyenne.toFixed(1) : '—'} />
        </View>
      </LinearGradient>

      {/* ── Bio ── */}
      {user.bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <View style={styles.card}>
            <Text style={styles.bioText}>{user.bio}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Infos ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.card}>
          <InfoRow icon="calendar-outline"     label="Membre depuis" value={memberSince} />
          <InfoRow icon="person-outline"       label="Type de compte" value={user.typeCompte === 'professionnel' ? 'Professionnel' : 'Particulier'} />
          {user.totalAvis > 0 && (
            <InfoRow icon="star-outline" label="Avis reçus" value={`${user.totalAvis} avis`} />
          )}
        </View>
      </View>

      {/* ── Avis ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Avis {reviews.length > 0 ? `(${reviews.length})` : ''}
          </Text>
          {user.moyenne > 0 && (
            <View style={styles.avgRow}>
              <Text style={styles.avgValue}>{user.moyenne.toFixed(1)}</Text>
              <Stars note={Math.round(user.moyenne)} size={14} />
            </View>
          )}
        </View>

        {reviews.length === 0 ? (
          <View style={styles.emptyReviews}>
            <Ionicons name="star-outline" size={32} color={COLORS.border} />
            <Text style={styles.emptyText}>Aucun avis pour l'instant</Text>
          </View>
        ) : (
          reviews.slice(0, 10).map(rv => {
            const auteurName = rv.auteur
              ? `${rv.auteur.prenom} ${rv.auteur.nom}`
              : 'Utilisateur';
            return (
              <View key={rv._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <TouchableOpacity
                    style={styles.reviewAuthor}
                    onPress={() => {
                      if (rv.auteur?._id && rv.auteur._id !== userId) {
                        navigation.push('UserProfile', {
                          userId:   rv.auteur._id,
                          userName: auteurName,
                        });
                      }
                    }}
                    activeOpacity={rv.auteur?._id ? 0.7 : 1}
                  >
                    <Avatar uri={rv.auteur?.photoProfil} name={auteurName} size={38} />
                    <View>
                      <Text style={styles.reviewName}>{auteurName}</Text>
                      <Text style={styles.reviewRole}>
                        {rv.type === 'expediteur' ? 'Expéditeur' : 'Transporteur'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.reviewRight}>
                    <Stars note={rv.note} />
                    <Text style={styles.reviewDate}>{formatRelativeDate(rv.createdAt)}</Text>
                    <TouchableOpacity
                      onPress={() => setReportAvis(rv._id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="flag-outline" size={14} color={COLORS.error} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setReportAvis(rv._id)} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
                      <Ionicons name="flag-outline" size={13} color={COLORS.placeholder} />
                    </TouchableOpacity>
                  </View>
                </View>
                {rv.commentaire ? (
                  <Text style={styles.reviewComment}>{rv.commentaire}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>

      {/* ── Signaler l'utilisateur ── */}
      <ReportModal
        visible={reportUser}
        onClose={() => setReportUser(false)}
        type="utilisateur"
        cibleUser={userId}
      />

      {/* ── Signaler un avis ── */}
      <ReportModal
        visible={!!reportAvis}
        onClose={() => setReportAvis(null)}
        type="avis"
        cibleAvis={reportAvis}
      />
      {/* ── Barre actions admin ──────────────────────────── */}
      {isAdmin && (
        <View style={[styles.adminBar, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.adminBarTitle}>Actions administrateur</Text>
          <View style={styles.adminBarRow}>

            {/* Suspendre / Réactiver */}
            <TouchableOpacity
              style={[styles.adminBtn, user.isActif === false ? styles.adminBtnReactivate : styles.adminBtnSuspend]}
              onPress={handleToggleBan}
              disabled={adminLoading}
            >
              <MaterialCommunityIcons
                name={user.isActif === false ? 'account-check' : 'account-cancel'}
                size={20}
                color="#fff"
              />
              <Text style={styles.adminBtnText}>
                {user.isActif === false ? 'Réactiver' : 'Suspendre'}
              </Text>
            </TouchableOpacity>

            {/* Contacter */}
            <TouchableOpacity
              style={[styles.adminBtn, styles.adminBtnContact]}
              onPress={handleContactUser}
              disabled={adminLoading}
            >
              <MaterialCommunityIcons name="message-text" size={20} color="#fff" />
              <Text style={styles.adminBtnText}>Contacter</Text>
            </TouchableOpacity>

            {/* Supprimer */}
            <TouchableOpacity
              style={[styles.adminBtn, styles.adminBtnDelete]}
              onPress={handleDeleteUser}
              disabled={adminLoading}
            >
              <MaterialCommunityIcons name="trash-can" size={20} color="#fff" />
              <Text style={styles.adminBtnText}>Supprimer</Text>
            </TouchableOpacity>

          </View>
          {adminLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />}
        </View>
      )}
    </>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1, backgroundColor: COLORS.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header:       { paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center', gap: 6 },
  reportBtn:    { position: 'absolute', right: 16, padding: 8,
                  backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 20 },
  // ── Admin bar ────────────────────────────────────────────
  adminBar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#EF444430',
  },
  adminBarTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  adminBarRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adminBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 12,
  },
  adminBtnText:       { fontSize: 12, fontWeight: '700', color: '#fff' },
  adminBtnSuspend:    { backgroundColor: '#F59E0B' },
  adminBtnReactivate: { backgroundColor: '#10B981' },
  adminBtnContact:    { backgroundColor: COLORS.primary },
  adminBtnDelete:     { backgroundColor: '#EF4444' },
  // ────────────────────────────────────────────────────────
  backBtn:      { position: 'absolute', top: 0, left: 16, padding: 8,
                  backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 20 },
  backBtnAbs:   { position: 'absolute', top: 16, left: 16 },
  avatar:       { marginTop: 8 },
  name:         { fontSize: 22, fontWeight: '800', color: COLORS.white, textAlign: 'center' },
  locationRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location:     { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  badgesRow:    { flexDirection: 'row', gap: 8, marginTop: 4 },
  ml:           { marginLeft: 4 },
  statsRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, marginTop: 12,
                  gap: 8, width: '100%' },
  statBox:      { flex: 1, alignItems: 'center', gap: 2 },
  statValue:    { fontSize: 20, fontWeight: '800', color: COLORS.white },
  statLabel:    { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  statDivider:  { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' },
  section:      { paddingHorizontal: 16, paddingTop: 20 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary,
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  card:         { backgroundColor: COLORS.card, borderRadius: 14, overflow: 'hidden',
                  borderWidth: 1, borderColor: COLORS.border },
  bioText:      { fontSize: 14, color: COLORS.textPrimary, lineHeight: 21, padding: 14 },
  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingHorizontal: 14, paddingVertical: 12,
                  borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel:    { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  infoValue:    { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  avgRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avgValue:     { fontSize: 16, fontWeight: '800', color: COLORS.warning },
  emptyReviews: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText:    { fontSize: 14, color: COLORS.placeholder },
  reviewCard:   { backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
                  marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reviewName:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  reviewRole:   { fontSize: 11, color: COLORS.textSecondary },
  reviewRight:  { alignItems: 'flex-end', gap: 2 },
  reviewDate:   { fontSize: 11, color: COLORS.placeholder },
  reviewComment:{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18,
                  fontStyle: 'italic', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  errorText:    { fontSize: 16, color: COLORS.textSecondary },
  reportBtn:    { position: 'absolute', right: 16, padding: 8,
                  backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 20 },
});