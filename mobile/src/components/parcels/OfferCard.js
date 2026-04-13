import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import COLORS  from '../../constants/colors';
import Avatar  from '../common/Avatar';
import Badge   from '../common/Badge';
import { t }   from '../../i18n/index';
import { formatPrice, formatRelativeDate } from '../../utils/formatters';

/**
 * Carte d'une offre de transporteur.
 *
 * Props expéditeur : isSender=true  → accept / reject / counter
 * Props transporteur : isSender=false → affiche la contre-offre si elle existe
 *
 * @param {object}   offer
 * @param {boolean}  isSender
 * @param {Function} onAccept(offerId)
 * @param {Function} onReject(offerId)
 * @param {Function} onCounter(offerId, prix, message) — async, géré par le parent
 */
export default function OfferCard({ offer, isSender = false, onAccept, onReject, onCounter, onAcceptCounter, onRejectCounter, onReOffer, navigation }) {
  const { transporteur, prixPropose, message, statut, createdAt, contreOffre } = offer;

  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterPrice,    setCounterPrice]    = useState(String(prixPropose || ''));
  const [counterMessage,  setCounterMessage]  = useState('');
  const [counterLoading,  setCounterLoading]  = useState(false);
  const [showReOfferForm, setShowReOfferForm] = useState(false);
  const [reOfferPrice,    setReOfferPrice]    = useState(String(prixPropose || ''));
  const [reOfferMessage,  setReOfferMessage]  = useState('');
  const [reOfferLoading,  setReOfferLoading]  = useState(false);

  function handleAccept() {
    Alert.alert(
      t('offers.accept'),
      t('offers.acceptConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('offers.accept'), onPress: () => onAccept(offer._id) },
      ],
    );
  }

  function handleReject() {
    Alert.alert(
      t('offers.reject'),
      t('offers.rejectConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('offers.reject'), style: 'destructive', onPress: () => onReject(offer._id) },
      ],
    );
  }

  async function handleSendCounter() {
    const prix = parseFloat(counterPrice);
    if (!prix || prix < 100) {
      Alert.alert('', 'Le prix doit être supérieur à 100 DZD');
      return;
    }
    setCounterLoading(true);
    try {
      await onCounter(offer._id, prix, counterMessage.trim() || undefined);
      setShowCounterForm(false);
      setCounterMessage('');
    } finally {
      setCounterLoading(false);
    }
  }

  async function handleSendReOffer() {
    const prix = parseFloat(reOfferPrice);
    if (!prix || prix < 100) {
      Alert.alert('', 'Le prix doit être supérieur à 100 DZD');
      return;
    }
    setReOfferLoading(true);
    try {
      await onReOffer?.(offer._id, prix, reOfferMessage.trim() || undefined);
      setShowReOfferForm(false);
      setReOfferMessage('');
    } finally {
      setReOfferLoading(false);
    }
  }

  // ── Style de la carte selon statut ──────────────────────────
  const cardBorderColor =
    statut === 'accepte'      ? COLORS.success :
    statut === 'refuse'       ? COLORS.error   :
    statut === 'contre_offre' ? COLORS.warning  :
    COLORS.border;

  return (
    <View style={[styles.card, { borderColor: cardBorderColor }]}>

      {/* ── Transporteur + statut ─────────────────────────── */}
      <View style={styles.cardHeader}>
        <Badge type={statut} label={t(`offers.status.${statut}`)} style={styles.badgeTop} />
        <TouchableOpacity
          style={styles.transporteurBtn}
          onPress={() => transporteur?._id && navigation?.navigate('UserProfile', {
            userId:   transporteur._id,
            userName: `${transporteur.prenom} ${transporteur.nom}`,
          })}
          activeOpacity={transporteur?._id ? 0.7 : 1}
        >
          <Avatar
            uri={transporteur?.photoProfil}
            name={`${transporteur?.prenom || ''} ${transporteur?.nom || ''}`}
            size={44}
          />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {transporteur?.prenom} {transporteur?.nom}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={COLORS.warning} />
              <Text style={styles.rating}>{transporteur?.moyenne?.toFixed(1) || '—'}</Text>
              <Text style={styles.ratingCount}>({transporteur?.totalAvis || 0} avis)</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Prix proposé par le transporteur ─────────────── */}
      <View style={styles.priceRow}>
        <MaterialCommunityIcons name="tag-outline" size={18} color={COLORS.primary} />
        <Text style={styles.priceLabel}>Offre transporteur</Text>
        <Text style={styles.price}>{formatPrice(prixPropose)}</Text>
      </View>

      {/* ── Message du transporteur ───────────────────────── */}
      {message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : null}

      {/* ── Contre-offre existante ────────────────────────── */}
      {contreOffre?.prix ? (
        <View style={styles.counterBadge}>
          <MaterialCommunityIcons name="swap-horizontal" size={16} color={COLORS.warning} />
          <View style={styles.counterInfo}>
            <Text style={styles.counterLabel}>Contre-offre expéditeur</Text>
            <Text style={styles.counterPrice}>{formatPrice(contreOffre.prix)}</Text>
            {contreOffre.message ? (
              <Text style={styles.counterMsg}>{contreOffre.message}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* ── Réponse transporteur à la contre-offre ───────────── */}
      {!isSender && statut === 'contre_offre' && contreOffre?.prix && !showReOfferForm && (
        <View style={styles.actionsCol}>
          <TouchableOpacity
            onPress={() => onAcceptCounter?.(offer._id)}
            style={styles.acceptFull}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.acceptFullTxt}>Accepter</Text>
          </TouchableOpacity>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={() => onRejectCounter?.(offer._id)}
              style={styles.rejectHalf}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
              <Text style={styles.rejectHalfTxt}>Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setReOfferPrice(String(prixPropose)); setShowReOfferForm(true); }}
              style={styles.counterHalf}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={15} color={COLORS.warning} />
              <Text style={styles.counterHalfTxt}>Nouvelle offre</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Formulaire re-proposition transporteur ──────────── */}
      {!isSender && showReOfferForm && (
        <View style={styles.counterForm}>
          <Text style={styles.counterFormTitle}>Proposer un nouveau prix</Text>
          <TextInput
            style={styles.counterInput}
            value={reOfferPrice}
            onChangeText={setReOfferPrice}
            keyboardType="numeric"
            placeholder="Prix en DZD"
            placeholderTextColor={COLORS.placeholder}
          />
          <TextInput
            style={[styles.counterInput, styles.counterInputMsg]}
            value={reOfferMessage}
            onChangeText={setReOfferMessage}
            placeholder="Message (optionnel)"
            placeholderTextColor={COLORS.placeholder}
            multiline
            numberOfLines={2}
          />
          <View style={styles.counterFormActions}>
            <TouchableOpacity
              onPress={() => setShowReOfferForm(false)}
              style={[styles.actionBtn, styles.rejectBtn]}
            >
              <Text style={[styles.actionText, { color: COLORS.error }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSendReOffer}
              style={[styles.actionBtn, styles.counterSendBtn]}
              disabled={reOfferLoading}
            >
              {reOfferLoading
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <>
                    <MaterialCommunityIcons name="send" size={16} color={COLORS.white} />
                    <Text style={[styles.actionText, { color: COLORS.white }]}>Envoyer</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.date}>{formatRelativeDate(createdAt)}</Text>

      {/* ── Actions expéditeur (en_attente uniquement) ───────── */}
      {isSender && statut === 'en_attente' && !showCounterForm && (
        <View style={styles.actionsCol}>
          {/* Accepter — pleine largeur, prominent */}
          <TouchableOpacity onPress={handleAccept} style={styles.acceptFull} activeOpacity={0.8}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.acceptFullTxt}>{t('offers.accept')}</Text>
          </TouchableOpacity>
          {/* Refuser + Contre-offre — côte à côte */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleReject} style={styles.rejectHalf} activeOpacity={0.8}>
              <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
              <Text style={styles.rejectHalfTxt}>{t('offers.reject')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCounterForm(true)} style={styles.counterHalf} activeOpacity={0.8}>
              <MaterialCommunityIcons name="swap-horizontal" size={15} color={COLORS.warning} />
              <Text style={styles.counterHalfTxt}>Contre-offre</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Formulaire contre-offre ───────────────────────── */}
      {isSender && showCounterForm && (
        <View style={styles.counterForm}>
          <Text style={styles.counterFormTitle}>Proposer un prix</Text>

          <TextInput
            style={styles.counterInput}
            value={counterPrice}
            onChangeText={setCounterPrice}
            keyboardType="numeric"
            placeholder="Prix en DZD"
            placeholderTextColor={COLORS.placeholder}
          />
          <TextInput
            style={[styles.counterInput, styles.counterInputMsg]}
            value={counterMessage}
            onChangeText={setCounterMessage}
            placeholder="Message (optionnel)"
            placeholderTextColor={COLORS.placeholder}
            multiline
            numberOfLines={2}
          />

          <View style={styles.counterFormActions}>
            <TouchableOpacity
              onPress={() => setShowCounterForm(false)}
              style={[styles.actionBtn, styles.rejectBtn]}
            >
              <Text style={[styles.actionText, { color: COLORS.error }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSendCounter}
              style={[styles.actionBtn, styles.counterSendBtn]}
              disabled={counterLoading}
            >
              {counterLoading
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <>
                    <MaterialCommunityIcons name="send" size={16} color={COLORS.white} />
                    <Text style={[styles.actionText, { color: COLORS.white }]}>Envoyer</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius:    14,
    padding:         14,
    marginBottom:    10,
    borderWidth:     1.5,
    elevation:       2,
  },

  // ── Header ──────────────────────────────────────────────
  row:         { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  cardHeader:  { marginBottom: 12 },
  badgeTop:    { alignSelf: 'flex-end', marginBottom: 8 },
  info:        { flex: 1, minWidth: 0 },
  name:        { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating:      { fontSize: 12, fontWeight: '600', color: COLORS.warning },
  ratingCount: { fontSize: 11, color: COLORS.textSecondary },

  // ── Prix ─────────────────────────────────────────────────
  priceRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  priceLabel:{ fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  price:     { fontSize: 22, fontWeight: '800', color: COLORS.primary },

  // ── Message ──────────────────────────────────────────────
  messageBox:  { backgroundColor: COLORS.inputBackground, borderRadius: 8, padding: 10, marginBottom: 8 },
  messageText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  // ── Contre-offre affichée ────────────────────────────────
  counterBadge: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             10,
    backgroundColor: COLORS.warning + '12',
    borderRadius:    10,
    padding:         10,
    marginBottom:    8,
    borderWidth:     1,
    borderColor:     COLORS.warning + '40',
  },
  counterInfo:  { flex: 1 },
  counterLabel: { fontSize: 11, color: COLORS.warning, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  counterPrice: { fontSize: 18, fontWeight: '800', color: COLORS.warning },
  counterMsg:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  date: { fontSize: 11, color: COLORS.placeholder, marginBottom: 10 },

  // ── Boutons actions ──────────────────────────────────────
  actionsCol: { gap: 8, marginTop: 12 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  // Accepter — pleine largeur vert
  acceptFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#16A34A',
    borderRadius: 14, paddingVertical: 13,
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  acceptFullTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Refuser — moitié, rose pâle
  rejectHalf: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: '#FCA5A5',
  },
  rejectHalfTxt: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  // Contre-offre — moitié, jaune pâle
  counterHalf: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.warning + '12', borderRadius: 12, paddingVertical: 11,
    borderWidth: 1, borderColor: COLORS.warning + '50',
  },
  counterHalfTxt: { fontSize: 13, fontWeight: '700', color: COLORS.warning },
  // legacy
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRadius: 12 },
  rejectBtn:      { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5' },
  counterBtn:     { backgroundColor: COLORS.warning + '15', borderWidth: 1, borderColor: COLORS.warning + '50' },
  acceptBtn:      { backgroundColor: '#16A34A' },
  counterSendBtn: { backgroundColor: COLORS.warning },
  actionText:     { fontSize: 13, fontWeight: '700' },

  // ── Formulaire contre-offre ──────────────────────────────
  counterForm:       { marginTop: 8, gap: 8 },
  counterFormTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  counterInput: {
    backgroundColor: COLORS.inputBackground,
    borderRadius:    10,
    paddingHorizontal: 12,
    height:          46,
    fontSize:        15,
    color:           COLORS.textPrimary,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  counterInputMsg:   { height: 64, textAlignVertical: 'top', paddingTop: 10 },
  counterFormActions:{ flexDirection: 'row', gap: 8 },
  transporteurBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});