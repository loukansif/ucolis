import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, Image, StyleSheet, Modal, FlatList,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions, Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { startBackgroundTracking, stopBackgroundTracking } from '../../tasks/locationTask';
import { socketService } from '../../services/socketService';
import * as ImagePicker from 'expo-image-picker';
import { useAuth }        from '../../context/AuthContext';
import parcelService      from '../../services/parcelService';
import { chatService } from '../../services/chatService';
import { offerService }   from '../../services/offerService';
import OfferCard          from '../../components/parcels/OfferCard';
import StatusBadge        from '../../components/parcels/StatusBadge';
import Avatar             from '../../components/common/Avatar';
import Button             from '../../components/common/Button';
import RatingModal        from '../../components/common/RatingModal';
import ReportModal        from '../../components/common/ReportModal';
import { ratingService }  from '../../services/ratingService';
import Loader             from '../../components/common/Loader';
import COLORS             from '../../constants/colors';
const DELIVERY_BG_DAY   = require('../../assets/images/delivery-bg-day.jpg');
const DELIVERY_BG_NIGHT = require('../../assets/images/delivery-bg-night.jpg');
import { t }              from '../../i18n/index';
import { getWilayaNames, getWilayaCoords } from '../../utils/wilayas';
import { formatPrice, formatWeight, formatDistance, formatRelativeDate } from '../../utils/formatters';
import { USER_ROLES, PARCEL_STATUS } from '../../constants/config';


// ✅ Réduit l'URL Cloudinary en thumbnail 300x200 pour éviter le crash mémoire
function toThumb(uri) {
  if (!uri || !uri.includes('cloudinary.com')) return uri;
  return uri.replace('/upload/', '/upload/w_300,h_200,c_fill,q_60,f_auto/');
}

function formatAddr(addr) {
  if (!addr) return '—';
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(addr.trim())) return 'Point sélectionné sur la carte';
  return addr;
}


// ── PickerModal (wilaya edit) ─────────────────────────────────
function EditPickerModal({ visible, title, data, selected, onSelect, onClose }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={epStyles.overlay}>
        <View style={epStyles.container}>
          <View style={epStyles.header}>
            <Text style={epStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top:10,bottom:10,left:10,right:10}}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item, i) => `${item}-${i}`}
            renderItem={({ item }) => {
              const isSel = selected === item;
              return (
                <TouchableOpacity style={[epStyles.item, isSel && epStyles.itemSel]}
                  onPress={() => { onSelect(item); onClose(); }} activeOpacity={0.7}>
                  <Text style={[epStyles.itemTxt, isSel && epStyles.itemTxtSel]}>{item}</Text>
                  {isSel && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{height:1,backgroundColor:COLORS.border+'40',marginHorizontal:16}} />}
          />
        </View>
      </View>
    </Modal>
  );
}
const epStyles = StyleSheet.create({
  overlay:    { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  container:  { backgroundColor:COLORS.card, borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'75%', paddingBottom:20 },
  header:     { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, borderBottomWidth:1, borderBottomColor:COLORS.border },
  title:      { fontSize:17, fontWeight:'700', color:COLORS.textPrimary },
  item:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingVertical:14 },
  itemSel:    { backgroundColor:COLORS.primary+'12' },
  itemTxt:    { fontSize:15, color:COLORS.textPrimary },
  itemTxtSel: { color:COLORS.primary, fontWeight:'700' },
});

// ── EditCitySearch — autocomplete Nominatim pour l'édition ────
function EditCitySearch({ value, wilaya, onSelect, placeholder }) {
  const [query, setQuery]           = React.useState(value || '');
  const [suggestions, setSuggestions] = React.useState([]);
  const [loading, setLoading]       = React.useState(false);
  const debRef = React.useRef(null);

  React.useEffect(() => { setQuery(value || ''); }, [value]);

  function search(text) {
    setQuery(text);
    if (debRef.current) clearTimeout(debRef.current);
    if (!text || text.length < 2) { setSuggestions([]); return; }
    debRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const q = encodeURIComponent(`${text}, ${wilaya || ''}, Algérie`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=dz`,
          { headers: { 'Accept-Language': 'fr', 'User-Agent': 'UCOLIS-App' } }
        );
        const data = await res.json();
        setSuggestions(data.map(d => ({
          name: d.display_name.split(',')[0].trim(),
          lat:  parseFloat(d.lat),
          lng:  parseFloat(d.lon),
        })));
      } catch (_) { setSuggestions([]); }
      finally { setLoading(false); }
    }, 400);
  }

  function select(item) {
    setQuery(item.name);
    setSuggestions([]);
    onSelect(item);
  }

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={csEditStyles.row}>
        <MaterialCommunityIcons name="map-search" size={16} color={COLORS.textSecondary} style={{marginRight:6}} />
        <TextInput style={csEditStyles.input} value={query} onChangeText={search}
          placeholder={placeholder || "Tapez la ville..."} placeholderTextColor={COLORS.placeholder}
          autoCorrect={false} />
        {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
        {!loading && query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); onSelect({ name:'', lat:null, lng:null }); }}>
            <Ionicons name="close-circle" size={16} color={COLORS.placeholder} />
          </TouchableOpacity>
        )}
      </View>
      {suggestions.length > 0 && (
        <View style={csEditStyles.dropdown}>
          {suggestions.map((s, i) => (
            <TouchableOpacity key={i} style={[csEditStyles.sug, i>0 && {borderTopWidth:1, borderTopColor:COLORS.border+'60'}]}
              onPress={() => select(s)}>
              <Ionicons name="location-outline" size={13} color={COLORS.primary} style={{marginRight:6}} />
              <Text style={csEditStyles.sugTxt}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}
const csEditStyles = StyleSheet.create({
  row:      { flexDirection:'row', alignItems:'center', borderWidth:1.5, borderColor:COLORS.border, borderRadius:12, paddingHorizontal:12, paddingVertical:9, backgroundColor:COLORS.inputBackground, marginBottom:2 },
  input:    { flex:1, fontSize:14, color:COLORS.textPrimary },
  dropdown: { backgroundColor:COLORS.card, borderRadius:10, borderWidth:1, borderColor:COLORS.border, marginTop:2, elevation:4 },
  sug:      { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:10 },
  sugTxt:   { fontSize:13, color:COLORS.textPrimary, fontWeight:'600', flex:1 },
});

// ── DatePickerInline (réutilisé depuis CreateParcelScreen) ────
function DatePickerInline({ mode, current, onConfirm, onCancel }) {
  const now   = current instanceof Date ? current : new Date();
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() + i);
  const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const hours  = Array.from({ length: 24 }, (_, i) => i);
  const mins   = Array.from({ length: 12 }, (_, i) => i * 5);
  const [year,  setYear]  = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth());
  const [day,   setDay]   = React.useState(now.getDate());
  const [hour,  setHour]  = React.useState(now.getHours());
  const [min,   setMin]   = React.useState(Math.round(now.getMinutes() / 5) * 5 % 60);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  function confirm() {
    const d = mode === 'date'
      ? new Date(year, month, day, now.getHours(), now.getMinutes())
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, min);
    onConfirm(d);
  }
  return (
    <View style={dpStylesD.container}>
      {mode === 'date' ? (
        <View style={dpStylesD.row}>
          <ScrollView style={dpStylesD.col} showsVerticalScrollIndicator={false}>
            {days.map(d => (<TouchableOpacity key={d} style={[dpStylesD.item, d===day && dpStylesD.itemActive]} onPress={() => setDay(d)}><Text style={[dpStylesD.itemText, d===day && dpStylesD.itemTextActive]}>{String(d).padStart(2,'0')}</Text></TouchableOpacity>))}
          </ScrollView>
          <ScrollView style={dpStylesD.col} showsVerticalScrollIndicator={false}>
            {months.map((m,i) => (<TouchableOpacity key={i} style={[dpStylesD.item, i===month && dpStylesD.itemActive]} onPress={() => setMonth(i)}><Text style={[dpStylesD.itemText, i===month && dpStylesD.itemTextActive]}>{m}</Text></TouchableOpacity>))}
          </ScrollView>
          <ScrollView style={dpStylesD.col} showsVerticalScrollIndicator={false}>
            {years.map(y => (<TouchableOpacity key={y} style={[dpStylesD.item, y===year && dpStylesD.itemActive]} onPress={() => setYear(y)}><Text style={[dpStylesD.itemText, y===year && dpStylesD.itemTextActive]}>{y}</Text></TouchableOpacity>))}
          </ScrollView>
        </View>
      ) : (
        <View style={dpStylesD.row}>
          <ScrollView style={dpStylesD.col} showsVerticalScrollIndicator={false}>
            {hours.map(h => (<TouchableOpacity key={h} style={[dpStylesD.item, h===hour && dpStylesD.itemActive]} onPress={() => setHour(h)}><Text style={[dpStylesD.itemText, h===hour && dpStylesD.itemTextActive]}>{String(h).padStart(2,'0')}h</Text></TouchableOpacity>))}
          </ScrollView>
          <ScrollView style={dpStylesD.col} showsVerticalScrollIndicator={false}>
            {mins.map(m => (<TouchableOpacity key={m} style={[dpStylesD.item, m===min && dpStylesD.itemActive]} onPress={() => setMin(m)}><Text style={[dpStylesD.itemText, m===min && dpStylesD.itemTextActive]}>{String(m).padStart(2,'0')}min</Text></TouchableOpacity>))}
          </ScrollView>
        </View>
      )}
      <View style={dpStylesD.actions}>
        <TouchableOpacity style={dpStylesD.cancelBtn} onPress={onCancel}><Text style={dpStylesD.cancelText}>Annuler</Text></TouchableOpacity>
        <TouchableOpacity style={dpStylesD.confirmBtn} onPress={confirm}><Text style={dpStylesD.confirmText}>Confirmer</Text></TouchableOpacity>
      </View>
    </View>
  );
}
const dpStylesD = StyleSheet.create({
  container:    { backgroundColor: COLORS.card, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  row:          { flexDirection: 'row', height: 140 },
  col:          { flex: 1 },
  item:         { paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  itemActive:   { backgroundColor: COLORS.primary + '18' },
  itemText:     { fontSize: 14, color: COLORS.textSecondary },
  itemTextActive:{ fontSize: 14, fontWeight: '700', color: COLORS.primary },
  actions:      { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn:    { paddingHorizontal: 16, paddingVertical: 8 },
  cancelText:   { fontSize: 14, color: COLORS.textSecondary },
  confirmBtn:   { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  confirmText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});


// ── Calcul distance routière (OSRM) ─────────────────────────
async function getRouteDistance(lat1, lng1, lat2, lng2) {
  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 6000);
    const url  = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;
    const res  = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.length > 0) {
      return Math.max(Math.round(data.routes[0].distance / 1000), 1);
    }
  } catch (_e) { /* fallback haversine */ }
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return Math.max(Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))), 1);
}


export default function ParcelDetailScreen({ navigation, route }) {
  const { parcelId, openRating } = route.params;
  const { user, isLoggedIn } = useAuth();
  const insets = useSafeAreaInsets();

  const [parcel,        setParcel]        = useState(null);
  const [offers,        setOffers]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [offerLoading,  setOfferLoading]  = useState(false);
  const [offerPrice,    setOfferPrice]    = useState('');
  const [offerMessage,  setOfferMessage]  = useState('');
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [convLoading,   setConvLoading]  = useState(false);
  const [selectedPhoto,   setSelectedPhoto]   = useState(null);
  const [showRating,      setShowRating]      = useState(false);
  const [alreadyRated,    setAlreadyRated]    = useState(false);

  const [editVisible,      setEditVisible]      = useState(false);
  const [editLoading,      setEditLoading]      = useState(false);
  const [showReportParcel, setShowReportParcel] = useState(false);
  const [editForm,         setEditForm]         = useState({});
  const [editPhotos,       setEditPhotos]       = useState([]);
  const [editUnite,        setEditUnite]        = useState('cm');
  const [editShowDate,     setEditShowDate]     = useState('');
  const [editShowWilaya,   setEditShowWilaya]   = useState(''); // 'depart'|'arrivee'|''
  const [pendingMapEdit, setPendingMapEdit] = useState(null);
  const scrollRef = useRef(null);
  const locationSubRef = React.useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [parcelData, offersData] = await Promise.all([
        parcelService.getParcelById(parcelId),
        offerService.getOffersByParcel(parcelId),
      ]);
      setParcel(parcelData);
      setOffers(Array.isArray(offersData) ? offersData : (offersData?.offres || []));
      setOfferPrice(String(parcelData?.prixDemande || ''));
      // ✅ Vérifier si l'utilisateur a déjà noté ce colis
      if (parcelData?.statut === 'livre') {
        try {
          const check = await ratingService.checkRating(parcelId);
          setAlreadyRated(check?.aDejaNote === true);
        } catch (_e) { /* ignore */ }
      }
    } catch (e) {
      Alert.alert('', t('errors.generic'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [parcelId, navigation]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Émission GPS automatique pour le transporteur en livraison ──
  useEffect(() => {
    if (!parcel) return;
    const isTransporteurLive = parcel.statut === 'en_livraison'
      && String(user?._id) === String(parcel.transporteurAccepte?._id);

    if (!isTransporteurLive) {
      if (locationSubRef.current) { locationSubRef.current.remove(); locationSubRef.current = null; }
      return;
    }

    async function startCarrierTracking() {
      try {
        // Foreground permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        await socketService.connect();
        socketService.joinTracking(parcelId);
        // Émission immédiate
        const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        socketService.emitLocation(parcelId, current.coords.latitude, current.coords.longitude);
        // ✅ Démarrer le background tracking (fonctionne même si l'app est en arrière-plan)
        const bgStarted = await startBackgroundTracking(parcelId);
        if (!bgStarted) {
          // Fallback foreground si background refusé
          locationSubRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
            ({ coords }) => socketService.emitLocation(parcelId, coords.latitude, coords.longitude)
          );
        }
      } catch (e) {
        console.warn('[Tracking] Erreur:', e.message);
      }
    }

    startCarrierTracking();
    return () => {
      if (locationSubRef.current) { locationSubRef.current.remove(); locationSubRef.current = null; }
      stopBackgroundTracking();
      socketService.leaveTracking(parcelId);
    };
  }, [parcel?.statut, user?._id, parcelId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Ouvrir automatiquement le modal de notation si navigué depuis une notif
  useEffect(() => {
    if (openRating && parcel?.statut === 'livre' && !alreadyRated) {
      setShowRating(true);
    }
  }, [openRating, parcel, alreadyRated]);

  // Auto-calcul volume dans le modal d'édition
  useEffect(() => {
    const l = parseFloat(editForm.longueur);
    const w = parseFloat(editForm.largeur);
    const h = parseFloat(editForm.hauteur);
    if (l > 0 && w > 0 && h > 0) {
      const vol = ((l * w * h) / 1_000_000).toFixed(3);
      if (vol !== editForm.volume) {
        setEditForm(f => ({ ...f, volume: vol }));
      }
    }
  }, [editForm.longueur, editForm.largeur, editForm.hauteur]);

  function openEdit() {
    const hasBigDims = parcel.longueur >= 100 || parcel.largeur >= 100 || parcel.hauteur >= 100;
    const u = hasBigDims ? 'm' : 'cm';
    const conv = (v) => v ? String(u === 'm' ? (v / 100) : v) : '';
    setEditUnite(u);
    setEditPhotos([]);
    setEditShowDate('');
    setEditForm({
      titre:         parcel.titre         || '',
      description:   parcel.description   || '',
      poids:         String(parcel.poids         || ''),
      longueur:      conv(parcel.longueur),
      largeur:       conv(parcel.largeur),
      hauteur:       conv(parcel.hauteur),
      volume:        String(parcel.volume        || ''),
      prixDemande:   String(parcel.prixDemande   || ''),
      typeVehicule:  parcel.typeVehicule         || [],
      dateSouhaitee: parcel.dateSouhaitee        || null,
      urgent:        parcel.urgent               || false,
      photos:        parcel.photos               || [],
      wilayaDepart:  parcel.wilayaDepart          || '',
      villeDepart:   parcel.villeDepart           || '',
      adresseDepart: parcel.adresseDepart         || '',
      wilayaArrivee: parcel.wilayaArrivee         || '',
      villeArrivee:  parcel.villeArrivee          || '',
      adresseArrivee:parcel.adresseArrivee        || '',
      latDepart:     parcel.latDepart             || null,
      lngDepart:     parcel.lngDepart             || null,
      latArrivee:    parcel.latArrivee            || null,
      lngArrivee:    parcel.lngArrivee            || null,
    });
    setEditVisible(true);
  }

  async function handleSaveEdit() {
    if (!editForm.titre?.trim()) { Alert.alert('', 'Le titre est requis.'); return; }
    if (!editForm.poids || isNaN(editForm.poids) || Number(editForm.poids) <= 0) {
      Alert.alert('', 'Le poids doit être un nombre positif.'); return;
    }
    if (!editForm.prixDemande || isNaN(editForm.prixDemande) || Number(editForm.prixDemande) < 100) {
      Alert.alert('', 'Le prix doit être supérieur à 100 DZD.'); return;
    }
    setEditLoading(true);
    try {
      const toLong = (v) => v ? (editUnite === 'm' ? Number(v) * 100 : Number(v)) : undefined;
      // Upload nouvelles photos
      let allPhotos = [...(editForm.photos || [])];
      for (const p of editPhotos) {
        try {
          const fd = new FormData();
          fd.append('photo', { uri: p.uri, type: p.mimeType || 'image/jpeg', name: 'photo.jpg' });
          const res = await parcelService.uploadPhoto(fd);
          if (res?.url) allPhotos.push(res.url);
        } catch (_) {}
      }
      // ✅ Recalculer distance si coords disponibles
      let newDistance = undefined;
      if (editForm.latDepart && editForm.lngDepart && editForm.latArrivee && editForm.lngArrivee) {
        newDistance = await getRouteDistance(
          editForm.latDepart, editForm.lngDepart,
          editForm.latArrivee, editForm.lngArrivee
        );
      }

      await parcelService.updateParcel(parcelId, {
        titre:         editForm.titre.trim(),
        description:   editForm.description.trim(),
        poids:         Number(editForm.poids),
        longueur:      toLong(editForm.longueur),
        largeur:       toLong(editForm.largeur),
        hauteur:       toLong(editForm.hauteur),
        volume:        editForm.volume ? Number(editForm.volume) : undefined,
        prixDemande:   Number(editForm.prixDemande),
        typeVehicule:  editForm.typeVehicule,
        dateSouhaitee: editForm.dateSouhaitee || null,
        urgent:        editForm.urgent,
        photos:        allPhotos,
        wilayaDepart:  editForm.wilayaDepart  || undefined,
        villeDepart:   editForm.villeDepart   || undefined,
        adresseDepart: editForm.adresseDepart || undefined,
        latDepart:     editForm.latDepart     || undefined,
        lngDepart:     editForm.lngDepart     || undefined,
        wilayaArrivee: editForm.wilayaArrivee || undefined,
        villeArrivee:  editForm.villeArrivee  || undefined,
        adresseArrivee:editForm.adresseArrivee|| undefined,
        latArrivee:    editForm.latArrivee    || undefined,
        lngArrivee:    editForm.lngArrivee    || undefined,
        ...(newDistance !== undefined && { distance: newDistance }),
      });
      setEditVisible(false);
      Alert.alert('', 'Annonce mise à jour.');
      await fetchAll();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || t('errors.generic'));
    } finally {
      setEditLoading(false);
    }
  }

  // Ouvrir MapPicker depuis le modal d'édition
  function openMapFromEdit(addrType) {
    const lat  = addrType === 'depart' ? editForm.latDepart  : editForm.latArrivee;
    const lng  = addrType === 'depart' ? editForm.lngDepart  : editForm.lngArrivee;
    const wilaya = addrType === 'depart' ? editForm.wilayaDepart : editForm.wilayaArrivee;
    const wilayaCoords = (lat && lng) ? { lat, lng } : getWilayaCoords(wilaya);
    setPendingMapEdit({ ...editForm, _addrType: addrType });
    setEditVisible(false);
    navigation.navigate('MapPickerModal', { type: addrType, wilayaCoords, returnScreen: 'ParcelDetail' });
  }

  // Récupérer le résultat MapPicker via route.params
  useEffect(() => {
    const result = route.params?.mapResult;
    if (!result || !pendingMapEdit) return;
    const addrType = pendingMapEdit._addrType;

    // Tenter de matcher la wilaya depuis result.region (ex: "Tizi Ouzou" → "Tizi Ouzou")
    const wilayaNames = getWilayaNames();
    const matchedWilaya = wilayaNames.find(w =>
      result.region && result.region.toLowerCase().includes(w.toLowerCase())
    ) || wilayaNames.find(w =>
      result.address && result.address.toLowerCase().includes(w.toLowerCase())
    ) || '';

    const matchedCity = result.city || '';

    const updates = addrType === 'depart'
      ? {
          adresseDepart:  result.address,
          latDepart:      result.lat,
          lngDepart:      result.lng,
          ...(matchedWilaya && { wilayaDepart:  matchedWilaya }),
          ...(matchedCity   && { villeDepart:   matchedCity   }),
        }
      : {
          adresseArrivee:  result.address,
          latArrivee:      result.lat,
          lngArrivee:      result.lng,
          ...(matchedWilaya && { wilayaArrivee:  matchedWilaya }),
          ...(matchedCity   && { villeArrivee:   matchedCity   }),
        };

    setEditForm({ ...pendingMapEdit, ...updates, _addrType: undefined });
    setPendingMapEdit(null);
    navigation.setParams({ mapResult: undefined });
    setEditVisible(true);
  }, [route.params?.mapResult]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDeleteParcel() {
    Alert.alert(
      "Supprimer l'annonce",
      "Cette action est irréversible. Supprimer l'annonce définitivement ?",
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await parcelService.deleteParcel(parcelId);
            navigation.goBack();
          } catch (e) {
            Alert.alert('', e.response?.data?.message || t('errors.generic'));
          }
        }},
      ]
    );
  }

  async function handleSendOffer() {
    const price = parseFloat(offerPrice);
    if (!offerPrice || isNaN(price) || price < 100) {
      Alert.alert('', 'Le prix doit être un nombre supérieur à 100 DZD.');
      return;
    }
    setOfferLoading(true);
    try {
      await offerService.createOffer({
        colisId:     parcelId,
        prixPropose: price,
        message:     offerMessage.trim() || undefined,
      });
      Alert.alert('', t('offers.offerSent'));
      setShowOfferForm(false);
      setOfferMessage('');
      await fetchAll();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || t('errors.generic'));
    } finally {
      setOfferLoading(false);
    }
  }

  // ✅ Acceptation directe sans négociation
  // ✅ Le transporteur accepte le prix demandé → crée une offre EN ATTENTE
  // L'expéditeur doit encore valider (accepter l'offre) depuis son côté
  async function handleAcceptDirect() {
    Alert.alert(
      'Accepter le prix proposé',
      `Vous proposez de livrer ce colis au prix proposé de ${formatPrice(parcel.prixDemande)}. L'expéditeur devra confirmer votre sélection.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Envoyer',
          onPress: async () => {
            setOfferLoading(true);
            try {
              await offerService.createOffer({
                colisId:          parcel._id,
                prixPropose:      parcel.prixDemande,
                message:          "J'accepte de livrer ce colis au prix proposé par l'expéditeur.",
                acceptationDirecte: true,
              });
              Alert.alert('✅ Demande envoyée', "L'expéditeur a été notifié. En attente de sa confirmation.");
              await fetchAll();
            } catch (e) {
              Alert.alert('', e.response?.data?.message || 'Une erreur est survenue.');
            } finally {
              setOfferLoading(false);
            }
          },
        },
      ],
    );
  }

  async function handleAcceptOffer(offerId) {
    setOfferLoading(true);
    try {
      await offerService.acceptOffer(offerId);
      Alert.alert('', t('offers.offerAccepted'));
      await fetchAll();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || t('errors.generic'));
    } finally {
      setOfferLoading(false);
    }
  }

  async function handleCounterOffer(offerId, prix, message) {
    try {
      await offerService.counterOffer(offerId, prix, message);
      Alert.alert('', 'Contre-offre envoyée.');
      await fetchAll();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || t('errors.generic'));
    }
  }

  async function handleAcceptCounter(offerId) {
    try {
      await offerService.acceptCounter(offerId);
      Alert.alert('', '✅ Contre-offre acceptée !');
      await fetchAll();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || t('errors.generic'));
    }
  }

  async function handleRejectCounter(offerId) {
    try {
      await offerService.rejectCounter(offerId);
      Alert.alert('', 'Contre-offre refusée. Votre offre initiale reste active.');
      await fetchAll();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || t('errors.generic'));
    }
  }

  async function handleReOffer(offerId, prix, message) {
    try {
      await offerService.reOffer(offerId, prix, message);
      Alert.alert('', '🔄 Nouvelle proposition envoyée.');
      await fetchAll();
    } catch (e) {
      Alert.alert('', e.response?.data?.message || t('errors.generic'));
    }
  }

  async function handleChangeStatus(newStatut) {
    const labels = {
      en_livraison:          'démarrer la livraison',
      en_attente_validation: 'confirmer la livraison',
      livre:                 'valider la réception',
      annule:                'annuler cette annonce',
    };
    Alert.alert(
      'Confirmation',
      `Voulez-vous vraiment ${labels[newStatut] || newStatut} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: newStatut === 'annule' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await parcelService.updateStatus(parcelId, newStatut);
              await fetchAll();
            } catch (e) {
              Alert.alert('', e.response?.data?.message || t('errors.generic'));
            }
          },
        },
      ],
    );
  }

  async function handleOpenChat() {
    if (!parcel) return;
    setConvLoading(true);
    try {
      const otherUser = isSender
        ? parcel.transporteurAccepte
        : parcel.expediteur;
      const conv = await chatService.createConversation(otherUser._id, parcel._id);
      navigation.navigate('Messages', {
        screen: 'Chat',
        params: { conversationId: conv._id, otherUser },
      });
    } catch (e) {
      Alert.alert('', t('errors.generic'));
    } finally {
      setConvLoading(false);
    }
  }

  async function handleRejectOffer(offerId) {
    setOfferLoading(true);
    try {
      await offerService.rejectOffer(offerId);
      Alert.alert('', t('offers.offerRejected'));
      await fetchAll();
    } catch (e) {
      Alert.alert('', t('errors.generic'));
    } finally {
      setOfferLoading(false);
    }
  }

  if (loading) return <Loader fullScreen />;
  if (!parcel)  return null;

  const isSender       = user?._id === parcel.expediteur?._id;
  const isCarrier      = user?.role === USER_ROLES.CARRIER || user?.role === USER_ROLES.BOTH;
  const canOffer       = isCarrier && !isSender
    && (parcel.statut === PARCEL_STATUS.DISPONIBLE || parcel.statut === PARCEL_STATUS.EN_NEGOCIATION)
    && !parcel.transporteurAccepte; // bloqué seulement si transporteur déjà accepté définitivement
  const alreadyOffered = offers.some(o => String(o.transporteur?._id) === String(user?._id));

  const myOffer        = !isSender ? offers.find(o => o.transporteur?._id === user?._id) : null;
  const hasCoords      = parcel.latDepart && parcel.latArrivee;
  const WILAYA_NAMES   = getWilayaNames();
  const canEdit        = isSender && parcel.statut === PARCEL_STATUS.DISPONIBLE;
  const isTransporteur = user?._id === parcel.transporteurAccepte?._id;

  const showStatusBar = (isSender || isTransporteur) &&
    ['accepte', 'en_livraison', 'en_attente_validation'].includes(parcel.statut);
  const showChatBanner = (isSender || isTransporteur) &&
    ['accepte', 'en_livraison', 'en_attente_validation', 'livre'].includes(parcel.statut);
  const showTracking   = ['en_livraison', 'en_attente_validation'].includes(parcel.statut) && isSender; // Transporteur partage auto

  // Calcul du padding bas du ScrollView pour ne pas cacher le contenu
  const STATUS_BAR_H = 60;
  const CHAT_BANNER_H = 42;
  const GAP = 12;
  let scrollPaddingBottom = insets.bottom + 24;
  if (showStatusBar)  scrollPaddingBottom += 62 + GAP;
  if (showChatBanner) scrollPaddingBottom += CHAT_BANNER_H + GAP;
  if (showTracking)   scrollPaddingBottom += 42 + GAP;
  if (canEdit)        scrollPaddingBottom = insets.bottom + 96;

  return (
    <>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
    <View style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ───────────────────────────────────────── */}
        <View style={[styles.navHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            {parcel.villeDepart} → {parcel.villeArrivee}
          </Text>
          <StatusBadge statut={parcel.statut} />
          {isLoggedIn && !isSender && (
            <TouchableOpacity
              onPress={() => setShowReportParcel(true)}
              style={styles.reportBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="flag-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          )}

        </View>

        {/* ── Carte ────────────────────────────────────────── */}
        {hasCoords && (
          <TouchableOpacity
            style={styles.mapButton}
            activeOpacity={0.85}
            onPress={() => {
              const url = Platform.OS === 'ios'
                ? `maps://?saddr=${parcel.latDepart},${parcel.lngDepart}&daddr=${parcel.latArrivee},${parcel.lngArrivee}`
                : `https://www.google.com/maps/dir/${parcel.latDepart},${parcel.lngDepart}/${parcel.latArrivee},${parcel.lngArrivee}`;
              Linking.openURL(url).catch(() => {});
            }}
          >
            {/* Image de fond */}
            <Image
              source={(() => {
                if (!parcel?.dateSouhaitee) return DELIVERY_BG_DAY;
                const h = new Date(parcel.dateSouhaitee).getHours();
                return (h >= 20 || h < 6) ? DELIVERY_BG_NIGHT : DELIVERY_BG_DAY;
              })()}
              style={styles.mapBgImage}
              resizeMode="cover"
            />
            {/* Overlay léger pour lisibilité */}
            <View style={styles.mapOverlay} />
            {/* Label villes avec marqueurs intégrés */}
            <View style={styles.mapCities}>
              <MaterialCommunityIcons name="map-marker" size={18} color={COLORS.primary} />
              <Text style={styles.mapCityText} numberOfLines={1}>{parcel.villeDepart}</Text>
              <MaterialCommunityIcons name="arrow-right" size={14} color={COLORS.textSecondary} />
              <Text style={styles.mapCityText} numberOfLines={1}>{parcel.villeArrivee}</Text>
              <MaterialCommunityIcons name="map-marker-check" size={18} color={COLORS.accent} />
            </View>
            {/* Badge "Voir l'itinéraire" */}
            <View style={styles.mapOpenBadge}>
              <Ionicons name="navigate-circle-outline" size={16} color={COLORS.white} />
              <Text style={styles.mapOpenText}>Voir l'itinéraire</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.body}>

          {/* ── Titre de l'annonce ───────────────────────────── */}
          {parcel.titre ? (
            <View style={styles.titreBox}>
              <Text style={styles.titreText}>{parcel.titre}</Text>
            </View>
          ) : null}

          {/* ── Badge URGENT ────────────────────────────────── */}
          {parcel.urgent && (
            <View style={styles.urgentBadge}>
              <MaterialCommunityIcons name="lightning-bolt" size={16} color="#fff" />
              <Text style={styles.urgentBadgeText}>LIVRAISON URGENTE</Text>
            </View>
          )}

          {/* ── Route ────────────────────────────────────────── */}
          <View style={styles.routeCard}>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: COLORS.primary }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeCity}>{parcel.villeDepart || '—'}</Text>
                <Text style={styles.routeAddr} numberOfLines={2}>{formatAddr(parcel.adresseDepart)}</Text>
              </View>
            </View>
            <View style={styles.routeConnector}>
              <View style={styles.routeLine} />
              <MaterialCommunityIcons name="arrow-down" size={16} color={COLORS.textSecondary} />
              <View style={styles.routeLine} />
            </View>
            <View style={styles.routeRow}>
              <View style={[styles.routeDot, { backgroundColor: COLORS.accent }]} />
              <View style={styles.routeInfo}>
                <Text style={styles.routeCity}>{parcel.villeArrivee || '—'}</Text>
                <Text style={styles.routeAddr} numberOfLines={2}>{formatAddr(parcel.adresseArrivee)}</Text>
              </View>
            </View>
          </View>

          {/* ── Infos ──────────────────────────────────────── */}
          <View style={styles.infoCard}>

            {/* 1. PRIX */}
            <View style={styles.priceRow}>
              <View style={styles.priceBadge}>
                <View style={styles.priceBadgeLeft}>
                  <MaterialCommunityIcons name="cash" size={18} color={COLORS.primary} />
                  <Text style={styles.priceLabel}>Prix proposé</Text>
                </View>
                <Text style={[styles.priceAmount, parcel.prixFinal && parcel.prixFinal !== parcel.prixDemande && styles.priceAmountStrike]}>
                  {formatPrice(parcel.prixDemande)}
                </Text>
              </View>
              {parcel.prixFinal && parcel.prixFinal !== parcel.prixDemande && (
                <View style={styles.priceFinalBadge}>
                  <View style={styles.priceBadgeLeft}>
                    <MaterialCommunityIcons name="check-circle" size={18} color={COLORS.success} />
                    <Text style={styles.priceFinalLabel}>Prix accepté</Text>
                  </View>
                  <Text style={styles.priceFinalAmount}>{formatPrice(parcel.prixFinal)}</Text>
                </View>
              )}
            </View>

            {/* 2. DATE SOUHAITÉE */}
            {parcel.dateSouhaitee && (
              <View style={[styles.dateSouhaiteeBox, parcel.urgent && styles.dateSouhaiteeBoxUrgent]}>
                <MaterialCommunityIcons name="calendar-clock" size={16} color={COLORS.primary} />
                <View>
                  <Text style={styles.dateSouhaiteeLabel}>{parcel.urgent ? 'Livraison' : 'Livraison souhaitée'}</Text>
                  <Text style={styles.dateSouhaiteeValue}>
                    {new Date(parcel.dateSouhaitee).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    {' à '}
                    {new Date(parcel.dateSouhaitee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            )}

            {/* 3. COLIS — Poids + Volume + Distance + Publié */}
            <View style={styles.infoGrid}>
              {[
                { icon: 'weight-kilogram', label: t('parcels.weight'),      value: formatWeight(parcel.poids) },
                { icon: 'cube-outline',    label: t('parcels.volume'),      value: parcel.volume ? `${parcel.volume} m³` : '—' },
                { icon: 'road-variant',    label: t('parcels.distance'),    value: formatDistance(parcel.distance) },
                { icon: 'calendar-outline',label: t('parcels.publishDate'), value: formatRelativeDate(parcel.createdAt) },
              ].map((item, i) => (
                <View key={i} style={styles.infoItem}>
                  <MaterialCommunityIcons name={item.icon} size={20} color={COLORS.primary} />
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              ))}
            </View>
            {parcel.typeVehicule?.length > 0 && (() => {
              const VEHICULE_META = {
                moto:        { icon: 'motorbike',    label: 'Moto'          },
                voiture:     { icon: 'car',          label: 'Voiture'       },
                break:       { icon: 'car-estate',   label: 'Break / SUV'   },
                utilitaire:  { icon: 'van-utility',  label: 'Utilitaire'    },
                camionnette: { icon: 'truck-fast',   label: 'Camionnette'   },
                camion:      { icon: 'truck',        label: 'Camion'        },
                cargo:       { icon: 'truck',        label: 'Mini Cargo (DFSK)' },
                semi:        { icon: 'truck-trailer',label: 'Semi-remorque' },
              };
              return (
                <View style={styles.vehiculeSection}>
                  <View style={styles.vehiculeSectionHeader}>
                    <View style={styles.vehiculeSectionDot} />
                    <Text style={styles.vehiculeSectionTitle}>Véhicule souhaité</Text>
                    <View style={styles.vehiculeSectionLine} />
                  </View>
                  <View style={styles.vehiculeCards}>
                    {parcel.typeVehicule.map(v => {
                      const meta = VEHICULE_META[v] || { icon: 'truck-outline', label: v };
                      return (
                        <View key={v} style={styles.vehiculeCard}>
                          <View style={styles.vehiculeCardIcon}>
                            <MaterialCommunityIcons name={meta.icon} size={22} color={COLORS.primary} />
                          </View>
                          <Text style={styles.vehiculeCardLabel}>{meta.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()}

            {/* 4. DIMENSIONS */}
            {(parcel.longueur || parcel.largeur || parcel.hauteur) ? (
              <Text style={styles.dims}>
{(() => {
                  const dims = [parcel.longueur, parcel.largeur, parcel.hauteur];
                  const allBig = dims.every(d => d >= 100);
                  if (allBig) {
                    const [l, w, h] = dims.map(d => (d / 100).toFixed(2).replace(/\.?0+$/, ''));
                    return `${t('parcels.dimensions')} : ${l}×${w}×${h} m`;
                  }
                  return `${t('parcels.dimensions')} : ${parcel.longueur}×${parcel.largeur}×${parcel.hauteur} cm`;
                })()}
              </Text>
            ) : null}

            {/* 5. VÉHICULE SOUHAITÉ */}
            {parcel.description ? (
              <View style={styles.descBox}>
                <Text style={styles.descLabel}>{t('parcels.description')}</Text>
                <Text style={styles.descText}>{parcel.description}</Text>
              </View>
            ) : null}

            {/* ── Photos du colis ───────────────────────────── */}
            {parcel.photos?.length > 0 && (
              <View style={styles.photosSection}>
                <Text style={styles.photosSectionTitle}>Photos du colis</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 4 }}
                  directionalLockEnabled
                >
                  {parcel.photos.filter(Boolean).map((uri, i) => (
                    <TouchableOpacity key={i} onPress={() => setSelectedPhoto(uri)} activeOpacity={0.85}>
                      <Image
                        source={{ uri: toThumb(uri) }}
                        style={styles.parcelPhoto}
                        resizeMode="cover"
                        fadeDuration={200}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* ── Expéditeur ────────────────────────────────────── */}
          <View style={styles.senderCard}>
            <Text style={styles.cardTitle}>{t('parcels.sender')}</Text>
            <View style={styles.senderRow}>
              <TouchableOpacity
                onPress={() => parcel.expediteur?._id && navigation.navigate('UserProfile', {
                  userId:   parcel.expediteur._id,
                  userName: `${parcel.expediteur.prenom} ${parcel.expediteur.nom}`,
                })}
                activeOpacity={0.7}
                style={{ alignItems: 'center' }}
              >
              <Avatar
                uri={parcel.expediteur?.photoProfil}
                name={`${parcel.expediteur?.prenom || ''} ${parcel.expediteur?.nom || ''}`}
                size={52}
              />
              <View style={styles.senderInfo}>
                <Text style={styles.senderName}>
                  {parcel.expediteur?.prenom} {parcel.expediteur?.nom}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={COLORS.warning} />
                  <Text style={styles.rating}>{parcel.expediteur?.moyenne?.toFixed(1) || '—'}</Text>
                  <Text style={styles.ratingCount}>· {parcel.expediteur?.totalAvis || 0} avis</Text>
                </View>
                <Text style={styles.wilayaTag}>{parcel.expediteur?.wilaya}</Text>
              </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Formulaire offre transporteur ─────────────────── */}
          {/* ── Mon offre (transporteur) avec contre-offre éventuelle ── */}
          {isLoggedIn && !isSender && myOffer && (
            <View style={styles.offersSection}>
              <Text style={styles.cardTitle}>Mon offre</Text>
              <OfferCard
                offer={myOffer}
                isSender={false}
                navigation={navigation}
                onAcceptCounter={handleAcceptCounter}
                onRejectCounter={handleRejectCounter}
                onReOffer={handleReOffer}
              />
            </View>
          )}

          {isLoggedIn && canOffer && !alreadyOffered && (
            <View style={styles.offerSection}>

              {/* ── Choix initial : accepter le prix ou négocier ── */}
              {!showOfferForm && (parcel.statut === PARCEL_STATUS.DISPONIBLE || parcel.statut === PARCEL_STATUS.EN_NEGOCIATION) && (
                <>
                  <Text style={styles.cardTitle}>Prendre en charge ce colis</Text>
                  <Text style={styles.offerSubtitle}>
                    Prix proposé : <Text style={styles.offerSubtitlePrice}>{formatPrice(parcel.prixDemande)}</Text>
                  </Text>

                  {/* Accepter au prix demandé */}
                  <TouchableOpacity
                    style={[styles.acceptDirectCard, offerLoading && { opacity: 0.6 }]}
                    onPress={handleAcceptDirect}
                    disabled={offerLoading}
                    activeOpacity={0.85}
                  >
                    <View style={styles.acceptDirectIcon}>
                      <Ionicons name="checkmark-circle" size={26} color={COLORS.success} />
                    </View>
                    <View style={styles.acceptDirectBody}>
                      <Text style={styles.acceptDirectTitle}>Accepter le prix proposé</Text>
                      <Text style={styles.acceptDirectDesc}>
                        Proposer {formatPrice(parcel.prixDemande)} — l'expéditeur confirmera votre choix
                      </Text>
                    </View>
                    {offerLoading
                      ? <ActivityIndicator size="small" color={COLORS.success} />
                      : <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                    }
                  </TouchableOpacity>

                  {/* Séparateur */}
                  <View style={styles.offerDivider}>
                    <View style={styles.offerDividerLine} />
                    <Text style={styles.offerDividerText}>ou</Text>
                    <View style={styles.offerDividerLine} />
                  </View>

                  {/* Négocier */}
                  <TouchableOpacity
                    style={styles.negotiateCard}
                    onPress={() => setShowOfferForm(true)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.negotiateIcon}>
                      <MaterialCommunityIcons name="swap-horizontal" size={26} color={COLORS.warning} />
                    </View>
                    <View style={styles.acceptDirectBody}>
                      <Text style={styles.negotiateTitle}>Négocier le prix</Text>
                      <Text style={styles.acceptDirectDesc}>Proposer un autre montant à l'expéditeur</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </>
              )}

              {/* ── Formulaire offre ─────────────────────────── */}
              {showOfferForm && (
                <View style={styles.offerForm} onLayout={() => {
                  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
                }}>
                  <Text style={styles.cardTitle}>Proposer un prix</Text>
                  <Text style={styles.offerPriceLabel}>{t('offers.offerPrice')}</Text>
                  <TextInput
                    style={styles.offerInput}
                    value={offerPrice}
                    onChangeText={setOfferPrice}
                    keyboardType="numeric"
                    placeholder="0 DZD"
                    placeholderTextColor={COLORS.placeholder}
                  />
                  <TextInput
                    style={[styles.offerInput, styles.offerMsgInput]}
                    value={offerMessage}
                    onChangeText={setOfferMessage}
                    placeholder={t('offers.offerMessage')}
                    placeholderTextColor={COLORS.placeholder}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.offerActions}>
                    <TouchableOpacity style={styles.offerBtnCancel} onPress={() => setShowOfferForm(false)} activeOpacity={0.8}>
                      <Text style={styles.offerBtnCancelTxt}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.offerBtnSend, offerLoading && { opacity: 0.6 }]} onPress={handleSendOffer} disabled={offerLoading} activeOpacity={0.8}>
                      {offerLoading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="paper-plane-outline" size={16} color="#fff" />
                      }
                      <Text style={styles.offerBtnSendTxt}>{t('offers.sendOffer')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Offres reçues (expéditeur) ────────────────────── */}
          {isSender && offers.length > 0 && (
            <View style={styles.offersSection}>
              <Text style={styles.cardTitle}>
                {t('offers.title')} ({offers.length})
              </Text>
              {offers.map((offer) => (
                <OfferCard
                  key={offer._id}
                  offer={offer}
                  isSender={isSender}
                  navigation={navigation}
                  onAccept={handleAcceptOffer}
                  onReject={handleRejectOffer}
                  onCounter={handleCounterOffer}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Barre d'action statut ───────────────────────────── */}
      {parcel && (() => {
        if (parcel.statut === 'accepte' && isTransporteur) return (
          <View style={[styles.carrierBar, { bottom: insets.bottom + 12, flexDirection: 'column', gap: 10 }]}>
            <TouchableOpacity style={styles.carrierBtnStart} onPress={() => handleChangeStatus('en_livraison')} activeOpacity={0.8}>
              <MaterialCommunityIcons name="truck-fast-outline" size={18} color="#fff" />
              <Text style={styles.carrierBtnMainTxt}>Démarrer la livraison</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.carrierBtnCancel} onPress={() => handleChangeStatus('annule')} activeOpacity={0.8}>
                <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.carrierBtnCancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.carrierBtnChat, { flex: 1 }]} onPress={handleOpenChat} disabled={convLoading} activeOpacity={0.8}>
                {convLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
                }
                <Text style={styles.carrierBtnMainTxt}>Messagerie</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

        if (parcel.statut === 'en_livraison' && isTransporteur) return (
          <View style={[styles.carrierBar, { bottom: insets.bottom + 12 }]}>
            <TouchableOpacity style={styles.carrierBtnCancel} onPress={() => handleChangeStatus('annule')} activeOpacity={0.8}>
              <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
              <Text style={styles.carrierBtnCancelTxt}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.carrierBtnConfirm} onPress={() => handleChangeStatus('en_attente_validation')} activeOpacity={0.8}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#fff" />
              <Text style={styles.carrierBtnMainTxt}>Confirmer la livraison</Text>
            </TouchableOpacity>
          </View>
        );

        if (parcel.statut === 'en_attente_validation' && isTransporteur) return (
          <View style={[styles.carrierBar, { bottom: insets.bottom + 12 }]}>
            <View style={styles.carrierWaitingBanner}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#B45309" />
              <Text style={styles.carrierWaitingTxt}>En attente de validation</Text>
            </View>
            <TouchableOpacity style={styles.carrierBtnChat} onPress={handleOpenChat} disabled={convLoading} activeOpacity={0.8}>
              {convLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
              }
              <Text style={styles.carrierBtnMainTxt}>Messagerie</Text>
            </TouchableOpacity>
          </View>
        );

        return null;
      })()}

      {/* ── Barre actions (Suivre + Messagerie) ─────────────────── */}
      {parcel && (isSender || isTransporteur) &&
        ['accepte', 'en_livraison', 'en_attente_validation', 'livre'].includes(parcel.statut) &&
        !(isTransporteur && parcel.statut === 'en_attente_validation') &&
        !(isTransporteur && parcel.statut === 'accepte') && (
        <View style={[styles.actionCol, {
          bottom: insets.bottom + 12 + (showStatusBar ? 60 : 0),
        }]}>
          {/* Suivre (transporteur en livraison) */}
          {showTracking && (
            <TouchableOpacity
              style={[styles.actionChipTrack, { marginBottom: 8 }]}
              onPress={() => navigation.navigate('Tracking', { parcelId, parcel, isCarrier: false })}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons name="map-marker-path" size={16} color="#fff" />
              <Text style={styles.actionChipTrackTxt}>Suivre</Text>
              <View style={styles.actionLiveDot} />
            </TouchableOpacity>
          )}

          {/* ── Expéditeur statut accepte : Annuler à gauche + Messagerie à droite ── */}
          {isSender && parcel.statut === 'accepte' ? (
            <View style={styles.actionRowInner}>
              <TouchableOpacity
                style={styles.fabDeleteBtn}
                onPress={() => handleChangeStatus('annule')}
                activeOpacity={0.75}
              >
                <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                <Text style={styles.fabDeleteLabel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fab, { flex: 1 }]}
                onPress={handleOpenChat}
                disabled={convLoading}
                activeOpacity={0.75}
              >
                {convLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
                }
                <Text style={styles.fabLabel}>Messagerie</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionRowInner}>
              <TouchableOpacity style={styles.actionChipChat} onPress={handleOpenChat} disabled={convLoading} activeOpacity={0.75}>
                {convLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
                }
                <Text style={styles.actionChipChatTxt}>Messagerie</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Valider la réception (expéditeur, en_attente_validation) */}
          {isSender && parcel.statut === 'en_attente_validation' && (
            <TouchableOpacity style={[styles.carrierBtnConfirm, { marginTop: 8 }]} onPress={() => handleChangeStatus('livre')} activeOpacity={0.8}>
              <MaterialCommunityIcons name="package-variant-closed-check" size={18} color="#fff" />
              <Text style={styles.carrierBtnMainTxt}>Valider la réception</Text>
            </TouchableOpacity>
          )}

          {/* Annuler pleine largeur (en_livraison uniquement) */}
          {isSender && parcel.statut === 'en_livraison' && (
            <TouchableOpacity style={[styles.actionChipCancelFull, { marginTop: 8 }]} onPress={() => handleChangeStatus('annule')} activeOpacity={0.75}>
              <Ionicons name="close-circle-outline" size={15} color="#DC2626" />
              <Text style={styles.actionChipCancelTxt}>Annuler l'annonce</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── FAB Modifier + Supprimer ─────────────────────────── */}
      {canEdit && (
        <View style={[styles.fabDualWrapper, { bottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.fabDeleteBtn} onPress={handleDeleteParcel} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={styles.fabDeleteLabel}>Supprimer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={openEdit} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.fabLabel}>Modifier l'annonce</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Bouton notation ─────────────────────────────────────── */}
      {parcel?.statut === 'livre' && (isSender || isTransporteur) && (
        <View style={[styles.ratingBtnWrap, {
          bottom: insets.bottom + 12 + (showChatBanner ? 54 + GAP : 0),
        }]}>
          {alreadyRated ? (
            <View style={styles.ratedBadge}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratedBadgeTxt}>Avis envoyé</Text>
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.ratingBtnFab}
              onPress={() => setShowRating(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="star-outline" size={18} color="#fff" />
              <Text style={styles.ratingBtnFabText}>Laisser un avis</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Modal notation ──────────────────────────────────────── */}
      {parcel && (
        <RatingModal
          visible={showRating}
          onClose={() => setShowRating(false)}
          onSuccess={() => setAlreadyRated(true)}
          colisId={parcel._id}
          destinataireNom={
            isSender
              ? `${parcel.transporteurAccepte?.prenom || ''} ${parcel.transporteurAccepte?.nom || ''}`.trim()
              : `${parcel.expediteur?.prenom || ''} ${parcel.expediteur?.nom || ''}`.trim()
          }
        />
      )}

      {/* ── Visionneuse photo ─────────────────────────────────── */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <TouchableOpacity style={styles.photoViewerOverlay} activeOpacity={1} onPress={() => setSelectedPhoto(null)}>
          <Image
            source={{ uri: selectedPhoto ? selectedPhoto.replace('/upload/', '/upload/w_1080,q_80,f_auto/') : '' }}
            style={styles.photoViewerImg}
            resizeMode="contain"
            fadeDuration={150}
          />
          <TouchableOpacity style={styles.photoViewerClose} onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close-circle" size={40} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal d'édition ──────────────────────────────────── */}
      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier l'annonce</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">

              <Text style={styles.fieldLabel}>Titre *</Text>
              <TextInput style={styles.fieldInput} value={editForm.titre}
                onChangeText={v => setEditForm(f => ({ ...f, titre: v }))}
                placeholder="Titre de l'annonce" placeholderTextColor={COLORS.placeholder} />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput style={[styles.fieldInput, styles.fieldTextarea]} value={editForm.description}
                onChangeText={v => setEditForm(f => ({ ...f, description: v }))}
                placeholder="Description du colis" placeholderTextColor={COLORS.placeholder}
                multiline numberOfLines={3} />

              <Text style={styles.fieldLabel}>Prix demandé (DZD) *</Text>
              <TextInput style={styles.fieldInput} value={editForm.prixDemande}
                onChangeText={v => setEditForm(f => ({ ...f, prixDemande: v }))}
                keyboardType="numeric" placeholder="Ex : 1500" placeholderTextColor={COLORS.placeholder} />

              <Text style={styles.fieldLabel}>Poids (kg) *</Text>
              <TextInput style={styles.fieldInput} value={editForm.poids}
                onChangeText={v => setEditForm(f => ({ ...f, poids: v }))}
                keyboardType="decimal-pad" placeholder="Ex : 5" placeholderTextColor={COLORS.placeholder} />

              <View style={styles.editDimsHeader}>
                <Text style={styles.fieldLabel}>Dimensions</Text>
                <View style={styles.editUniteRow}>
                  {['cm','m'].map(u => (
                    <TouchableOpacity key={u} style={[styles.editUniteBtn, editUnite===u && styles.editUniteBtnActive]}
                      onPress={() => setEditUnite(u)}>
                      <Text style={[styles.editUniteTxt, editUnite===u && styles.editUniteTxtActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.dimsRow}>
                {[{key:'longueur',ph:'L'},{key:'largeur',ph:'l'},{key:'hauteur',ph:'H'}].map(({key,ph}) => (
                  <TextInput key={key} style={[styles.fieldInput, styles.dimInput]} value={editForm[key]}
                    onChangeText={v => setEditForm(f => ({ ...f, [key]: v }))}
                    keyboardType="decimal-pad" placeholder={ph} placeholderTextColor={COLORS.placeholder} />
                ))}
              </View>
              <TextInput style={[styles.fieldInput, styles.fieldReadOnly]} value={editForm.volume}
                editable={false} placeholder="Volume auto-calculé" placeholderTextColor={COLORS.placeholder} />

              <TouchableOpacity
                style={[styles.editUrgentToggle, editForm.urgent && styles.editUrgentToggleActive]}
                onPress={() => setEditForm(f => ({ ...f, urgent: !f.urgent }))}>
                <MaterialCommunityIcons name={editForm.urgent ? 'lightning-bolt' : 'lightning-bolt-outline'}
                  size={18} color={editForm.urgent ? '#fff' : COLORS.error} />
                <Text style={[styles.editUrgentTxt, editForm.urgent && styles.editUrgentTxtActive]}>
                  {editForm.urgent ? 'Livraison urgente' : 'Marquer comme urgent'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Date de livraison</Text>
              <View style={styles.editDateRow}>
                <TouchableOpacity style={styles.editDateBtn} onPress={() => setEditShowDate('date')}>
                  <MaterialCommunityIcons name="calendar" size={16} color={COLORS.primary} />
                  <Text style={styles.editDateTxt}>
                    {editForm.dateSouhaitee
                      ? new Date(editForm.dateSouhaitee).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})
                      : 'Choisir une date'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.editDateBtn, !editForm.dateSouhaitee && styles.editDateBtnOff]}
                  onPress={() => { if (editForm.dateSouhaitee) setEditShowDate('time'); }}>
                  <MaterialCommunityIcons name="clock-outline" size={16}
                    color={editForm.dateSouhaitee ? COLORS.primary : COLORS.placeholder} />
                  <Text style={[styles.editDateTxt, !editForm.dateSouhaitee && {color: COLORS.placeholder}]}>
                    {editForm.dateSouhaitee
                      ? new Date(editForm.dateSouhaitee).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
                      : '--:--'}
                  </Text>
                </TouchableOpacity>
                {editForm.dateSouhaitee && (
                  <TouchableOpacity onPress={() => setEditForm(f => ({ ...f, dateSouhaitee: null }))}>
                    <Ionicons name="close-circle" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>
              {editShowDate !== '' && (
                <DatePickerInline
                  mode={editShowDate}
                  current={editForm.dateSouhaitee ? new Date(editForm.dateSouhaitee) : new Date()}
                  onConfirm={(val) => {
                    const base = editForm.dateSouhaitee ? new Date(editForm.dateSouhaitee) : new Date();
                    if (editShowDate === 'date') { val.setHours(base.getHours(), base.getMinutes(), 0, 0); }
                    else { const d = new Date(editForm.dateSouhaitee); val = new Date(d.getFullYear(), d.getMonth(), d.getDate(), val.getHours(), val.getMinutes()); }
                    setEditForm(f => ({ ...f, dateSouhaitee: val.toISOString() }));
                    setEditShowDate('');
                  }}
                  onCancel={() => setEditShowDate('')}
                />
              )}

              <Text style={styles.fieldLabel}>Véhicule souhaité</Text>
              {(() => {
              const EDIT_VEHICLE_TYPES = [
                { value: 'moto',        label: 'Moto',         icon: 'motorbike'      },
                { value: 'voiture',     label: 'Voiture',      icon: 'car'            },
                { value: 'break',       label: 'Break / SUV',  icon: 'car-estate'     },
                { value: 'utilitaire',  label: 'Utilitaire',   icon: 'van-utility'    },
                { value: 'camionnette', label: 'Camionnette',  icon: 'truck-fast'     },
                { value: 'camion',      label: 'Camion',       icon: 'truck'          },
                { value: 'semi',        label: 'Semi-remorque',icon: 'truck-trailer'  },
              ];
                return (
                  <View style={styles.editVehiculeGrid}>
                    {EDIT_VEHICLE_TYPES.map(v => {
                      const sel = (editForm.typeVehicule || []).includes(v.value);
                      return (
                        <TouchableOpacity key={v.value}
                          style={[styles.editVehiculeChip, sel && styles.editVehiculeChipActive]}
                          onPress={() => {
                            const cur = editForm.typeVehicule || [];
                            const next = sel ? cur.filter(x => x !== v.value) : [...cur, v.value];
                            setEditForm(f => ({ ...f, typeVehicule: next }));
                          }}>
                          <MaterialCommunityIcons name={v.icon} size={18} color={sel ? '#fff' : COLORS.textSecondary} />
                          <Text style={[styles.editVehiculeLabel, sel && styles.editVehiculeLabelActive]}>{v.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })()}

              {/* ── Adresse départ ── */}
              <Text style={styles.editSectionTitle}>📍 Point de départ</Text>
              <TouchableOpacity style={styles.editWilayaBtn}
                onPress={() => setEditShowWilaya(editShowWilaya === 'depart' ? '' : 'depart')}>
                <Text style={editForm.wilayaDepart ? styles.editWilayaVal : styles.editWilayaPh}>
                  {editForm.wilayaDepart || 'Sélectionner la wilaya'}
                </Text>
                <Ionicons name={editShowWilaya === 'depart' ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {editShowWilaya === 'depart' && (
                <View style={styles.editWilayaDropdown}>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {WILAYA_NAMES.map((w, i) => (
                      <TouchableOpacity key={i} style={[styles.editWilayaItem, editForm.wilayaDepart === w && styles.editWilayaItemSel]}
                        onPress={() => {
                          setEditForm(f => ({ ...f, wilayaDepart: w, villeDepart: '', latDepart: null, lngDepart: null }));
                          setEditShowWilaya('');
                        }}>
                        <Text style={[styles.editWilayaItemTxt, editForm.wilayaDepart === w && styles.editWilayaItemTxtSel]}>{w}</Text>
                        {editForm.wilayaDepart === w && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              <EditCitySearch
                value={editForm.villeDepart}
                wilaya={editForm.wilayaDepart}
                placeholder="Tapez la ville de départ..."
                onSelect={({ name, lat, lng }) => setEditForm(f => ({ ...f, villeDepart: name, latDepart: lat, lngDepart: lng }))}
              />
              <View style={styles.editAddrRow}>
                <TextInput style={[styles.fieldInput, { flex: 1, marginBottom: 0 }]}
                  value={editForm.adresseDepart}
                  onChangeText={v => setEditForm(f => ({ ...f, adresseDepart: v }))}
                  placeholder="Adresse précise" placeholderTextColor={COLORS.placeholder} />
                <TouchableOpacity style={styles.editMapBtn} onPress={() => openMapFromEdit('depart')}>
                  <MaterialCommunityIcons name="map-marker-radius" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* ── Adresse arrivée ── */}
              <Text style={styles.editSectionTitle}>🏁 Point d'arrivée</Text>
              <TouchableOpacity style={styles.editWilayaBtn}
                onPress={() => setEditShowWilaya(editShowWilaya === 'arrivee' ? '' : 'arrivee')}>
                <Text style={editForm.wilayaArrivee ? styles.editWilayaVal : styles.editWilayaPh}>
                  {editForm.wilayaArrivee || "Sélectionner la wilaya"}
                </Text>
                <Ionicons name={editShowWilaya === 'arrivee' ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {editShowWilaya === 'arrivee' && (
                <View style={styles.editWilayaDropdown}>
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {WILAYA_NAMES.map((w, i) => (
                      <TouchableOpacity key={i} style={[styles.editWilayaItem, editForm.wilayaArrivee === w && styles.editWilayaItemSel]}
                        onPress={() => {
                          setEditForm(f => ({ ...f, wilayaArrivee: w, villeArrivee: '', latArrivee: null, lngArrivee: null }));
                          setEditShowWilaya('');
                        }}>
                        <Text style={[styles.editWilayaItemTxt, editForm.wilayaArrivee === w && styles.editWilayaItemTxtSel]}>{w}</Text>
                        {editForm.wilayaArrivee === w && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              <EditCitySearch
                value={editForm.villeArrivee}
                wilaya={editForm.wilayaArrivee}
                placeholder="Tapez la ville d'arrivée..."
                onSelect={({ name, lat, lng }) => setEditForm(f => ({ ...f, villeArrivee: name, latArrivee: lat, lngArrivee: lng }))}
              />
              <View style={styles.editAddrRow}>
                <TextInput style={[styles.fieldInput, { flex: 1, marginBottom: 0 }]}
                  value={editForm.adresseArrivee}
                  onChangeText={v => setEditForm(f => ({ ...f, adresseArrivee: v }))}
                  placeholder="Adresse précise" placeholderTextColor={COLORS.placeholder} />
                <TouchableOpacity style={styles.editMapBtn} onPress={() => openMapFromEdit('arrivee')}>
                  <MaterialCommunityIcons name="map-marker-radius" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Photos ({(editForm.photos||[]).length + editPhotos.length}/5)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(editForm.photos || []).map((url, i) => (
                    <View key={i} style={styles.editPhotoThumb}>
                      <Image source={{ uri: url }} style={styles.editPhotoImg} />
                      <TouchableOpacity style={styles.editPhotoRemove}
                        onPress={() => setEditForm(f => ({ ...f, photos: f.photos.filter((_,j) => j !== i) }))}>
                        <Ionicons name="close-circle" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {editPhotos.map((p, i) => (
                    <View key={"new"+i} style={styles.editPhotoThumb}>
                      <Image source={{ uri: p.uri }} style={styles.editPhotoImg} />
                      <TouchableOpacity style={styles.editPhotoRemove}
                        onPress={() => setEditPhotos(prev => prev.filter((_,j) => j !== i))}>
                        <Ionicons name="close-circle" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {((editForm.photos||[]).length + editPhotos.length) < 5 && (
                    <TouchableOpacity style={styles.editPhotoAdd}
                      onPress={async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') return;
                        const res = await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          quality: 0.8,
                          allowsMultipleSelection: true,
                          selectionLimit: 5,
                        });
                        if (!res.canceled) {
                          const remaining = 5 - (editForm.photos||[]).length - editPhotos.length;
                          setEditPhotos(prev => [...prev, ...res.assets.slice(0, remaining)]);
                        }
                      }}>
                      <Ionicons name="add" size={28} color={COLORS.primary} />
                      <Text style={{ fontSize: 11, color: COLORS.primary, marginTop: 2 }}>Ajouter</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>

            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditVisible(false)} style={styles.modalBtnCancel}>
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit}
                style={[styles.modalBtnSave, editLoading && styles.modalBtnDisabled]} disabled={editLoading}>
                {editLoading ? <ActivityIndicator color={COLORS.white} size="small" />
                  : <Text style={styles.modalBtnSaveText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </KeyboardAvoidingView>

      <ReportModal
        visible={showReportParcel}
        onClose={() => setShowReportParcel(false)}
        type="annonce"
        cibleParcel={parcel._id}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },

  // ── Header ──────────────────────────────────────────────────
  navHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:  { padding: 4 },
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },

  // ── Carte ────────────────────────────────────────────────────
  mapButton: {
    height: 180,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  mapCities: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
    maxWidth: '88%',
  },
  mapCityText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },
  mapOpenBadge: {
    position: 'absolute', bottom: 14, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  mapOpenText: { fontSize: 12, fontWeight: '700', color: COLORS.white },

  // ── Body ─────────────────────────────────────────────────────
  body: { padding: 16, gap: 16 },

  // ── Route ────────────────────────────────────────────────────
  titreBox: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  titreText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    lineHeight: 28,
  },
  routeCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  routeRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  routeDot:       { width: 14, height: 14, borderRadius: 7, marginTop: 4 },
  routeInfo:      { flex: 1 },
  routeCity:      { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  routeAddr:      { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  routeConnector: { flexDirection: 'row', alignItems: 'center', paddingLeft: 6, gap: 4, paddingVertical: 4 },
  routeLine:      { flex: 1, height: 1, backgroundColor: COLORS.border },

  // ── Infos ─────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },

  // Prix — affiché simple en haut de la card
  priceRow: {
    flexDirection: 'column', gap: 8,
    marginBottom: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  priceBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primary + '12', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  priceFinalBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.success + '12', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  priceBadgeLeft:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceAmount:          { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  priceAmountStrike:    { fontSize: 18, color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  priceFinalLabel:      { fontSize: 12, color: COLORS.success, fontWeight: '700' },
  priceFinalAmount:     { fontSize: 22, fontWeight: '800', color: COLORS.success },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  infoItem: {
    width: '47%', backgroundColor: COLORS.inputBackground,
    borderRadius: 12, padding: 12, alignItems: 'center', gap: 4,
  },
  infoLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  infoValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  dims:      { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  descBox:   { marginTop: 20, padding: 12, backgroundColor: COLORS.inputBackground, borderRadius: 10 },
  descLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  descText:  { fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 },

  // ── Expéditeur ───────────────────────────────────────────────
  senderCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle:   { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 14 },
  senderRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  senderInfo:  { flex: 1 },
  senderName:  { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  rating:      { fontSize: 14, fontWeight: '700', color: COLORS.warning },
  ratingCount: { fontSize: 12, color: COLORS.textSecondary },
  wilayaTag:   { fontSize: 12, color: COLORS.textSecondary },

  // ── Offre transporteur ───────────────────────────────────────
  offerSection: {
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  alreadyOffered:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alreadyOfferedText: { fontSize: 14, color: COLORS.success, fontWeight: '600' },

  // ── Sous-titre prix demandé ──────────────────────────────────
  offerSubtitle:      { fontSize: 13, color: COLORS.textSecondary, marginBottom: 14 },
  offerSubtitlePrice: { fontWeight: '800', color: COLORS.primary, fontSize: 15 },

  // ── Card acceptation directe ─────────────────────────────────
  acceptDirectCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.success + '10',
    borderWidth: 1.5, borderColor: COLORS.success + '40',
    borderRadius: 14, padding: 14, marginBottom: 4,
  },
  acceptDirectIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.success + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  acceptDirectBody:  { flex: 1, gap: 3 },
  acceptDirectTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  acceptDirectDesc:  { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  // ── Séparateur ────────────────────────────────────────────────
  offerDivider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  offerDividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  offerDividerText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  // ── Card négociation ─────────────────────────────────────────
  negotiateCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.warning + '10',
    borderWidth: 1.5, borderColor: COLORS.warning + '30',
    borderRadius: 14, padding: 14,
  },
  negotiateIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.warning + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  negotiateTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  offerForm:          { gap: 12 },
  offerPriceLabel:    { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  offerInput: {
    backgroundColor: COLORS.inputBackground, borderRadius: 12,
    paddingHorizontal: 14, height: 52, fontSize: 15,
    color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border,
  },
  offerMsgInput: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  offerActions:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  offerBtnCancel: {
    paddingVertical: 13, paddingHorizontal: 20,
    borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  offerBtnCancelTxt: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  offerBtnSend: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 13,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  offerBtnSendTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  offerBtn:      { flex: 1 },

  // ── Offres reçues ────────────────────────────────────────────
  offersSection: {
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },

  // ── Edit modal extras ────────────────────────────────────────
  editDimsHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  editUniteRow:        { flexDirection: 'row', gap: 4 },
  editUniteBtn:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border },
  editUniteBtnActive:  { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  editUniteTxt:        { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  editUniteTxtActive:  { color: COLORS.primary },
  editUrgentToggle:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.error + '60', borderRadius: 12, padding: 12, backgroundColor: COLORS.error + '08', marginBottom: 12 },
  editUrgentToggleActive: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  editUrgentTxt:       { fontSize: 13, fontWeight: '700', color: COLORS.error },
  editUrgentTxtActive: { color: '#fff' },
  editDateRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  editDateBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: COLORS.inputBackground },
  editDateBtnOff:      { opacity: 0.45 },
  editDateTxt:         { fontSize: 13, color: COLORS.primary, fontWeight: '600', flex: 1 },
  editVehiculeGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  editVehiculeChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.inputBackground },
  editVehiculeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  editVehiculeLabel:   { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  editVehiculeLabelActive: { color: '#fff' },
  editPhotoThumb:      { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  editPhotoImg:        { width: 80, height: 80 },
  editPhotoRemove:     { position: 'absolute', top: 2, right: 2 },
  editPhotoAdd:        { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary + '08' },
  // ─────────────────────────────────────────────────────────────
  fabDualWrapper: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', gap: 10,
  },
  fabDeleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5, borderColor: '#FCA5A5',
  },
  fabDeleteLabel: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  // ── FAB Modifier ─────────────────────────────────────────────
  fabWrapper: {
    position: 'absolute', left: 20, right: 20,
    alignItems: 'center',
  },
  fab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  fabDelete: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.error,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  headerDeleteBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: COLORS.error + '15',
    marginRight: 4,
  },
  editWilayaBtn:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', borderWidth:1.5, borderColor:COLORS.border, borderRadius:12, paddingHorizontal:14, paddingVertical:12, backgroundColor:COLORS.inputBackground, marginBottom:4 },
  editWilayaDropdown: { borderWidth:1.5, borderColor:COLORS.primary+'40', borderRadius:12, backgroundColor:COLORS.card, marginBottom:8, overflow:'hidden' },
  editWilayaItem:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:14, paddingVertical:11, borderBottomWidth:1, borderBottomColor:COLORS.border+'40' },
  editWilayaItemSel:  { backgroundColor:COLORS.primary+'10' },
  editWilayaItemTxt:  { fontSize:14, color:COLORS.textPrimary },
  editWilayaItemTxtSel:{ fontSize:14, color:COLORS.primary, fontWeight:'700' },
  editWilayaVal:  { fontSize:14, color:COLORS.textPrimary, flex:1 },
  editWilayaPh:   { fontSize:14, color:COLORS.textSecondary, flex:1 },
  editAddrRow:    { flexDirection:'row', alignItems:'center', gap:8, marginBottom:12 },
  editMapBtn:     { width:44, height:44, borderRadius:12, backgroundColor:COLORS.primary, alignItems:'center', justifyContent:'center' },
  editSectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.textPrimary,
    marginTop: 8, marginBottom: 8,
  },

  // ── Modal édition ─────────────────────────────────────────────
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  modalClose:  { padding: 4 },
  modalBody:   { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 14, marginBottom: 6 },
  fieldInput: {
    backgroundColor: COLORS.inputBackground, borderRadius: 12,
    paddingHorizontal: 14, height: 50, fontSize: 15,
    color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 12,
  },
  fieldTextarea: { height: 80, textAlignVertical: 'top', paddingTop: 12 },
  fieldReadOnly: { opacity: 0.6, marginBottom: 12 },
  dimsRow:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dimInput:      { flex: 1, marginBottom: 0 },
  modalActions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  modalBtnCancel: {
    paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 14, borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modalBtnCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modalBtnSave: {
    flex: 1, height: 50, borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  modalBtnDisabled:   { opacity: 0.6, shadowOpacity: 0 },
  modalBtnSaveText:   { fontSize: 15, fontWeight: '700', color: '#fff' },

  // ── Barre statut ──────────────────────────────────────────
  // ── Barre transporteur ───────────────────────────────────────
  carrierBar: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', gap: 10,
  },
  // Annuler petit (transporteur)
  carrierBtnCancel: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
    borderWidth: 1.5, borderColor: '#FCA5A5',
  },
  carrierBtnCancelTxt: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  // Démarrer — violet/indigo
  carrierBtnStart: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#6366F1',
    borderRadius: 14, paddingVertical: 14,
    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  // Confirmer — vert
  carrierBtnConfirm: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#16A34A',
    borderRadius: 14, paddingVertical: 14,
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  carrierBtnMainTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  carrierWaitingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#FFFBEB',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: '#F59E0B',
  },
  carrierWaitingTxt: { fontSize: 13, fontWeight: '600', color: '#B45309' },
  carrierBtnChat: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  // legacy
  statusBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', gap: 10 },
  statusBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 30 },
  statusBtnPrimary: { backgroundColor: '#9333EA' },
  statusBtnSuccess: { backgroundColor: COLORS.success },
  statusBtnCancel:  { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.error },
  statusBtnText: { fontSize: 14, fontWeight: '700' },

  // ── Pill Buttons ─────────────────────────────────────────
  // ── Barre actions ─────────────────────────────────────────────
  actionCol: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'column', gap: 10,
  },
  actionRow: {
    position: 'absolute', left: 16, right: 16,
    flexDirection: 'row', gap: 10,
  },
  actionRowInner: {
    flexDirection: 'row', gap: 10,
  },
  // Contacter — orange plein, flex 1
  actionChipChat: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 14,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  actionChipChatTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // Suivre — noir avec point vert
  actionChipTrack: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#1C1C1E',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  actionChipTrackTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  actionLiveDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#22C55E', marginLeft: 2,
  },
  // Annuler — pleine largeur, rouge pâle
  actionChipCancelFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#FEF2F2',
    borderRadius: 14, paddingVertical: 13,
    borderWidth: 1.5, borderColor: '#FCA5A5',
  },
  // Annuler legacy
  actionChipCancel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18,
    borderWidth: 1.5, borderColor: '#FCA5A5',
  },
  actionChipCancelTxt: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  // legacy
  bottomBar:          { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  bottomChip:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.card, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 18, borderWidth: 1, borderColor: COLORS.border },
  bottomChipChat:     { borderColor: COLORS.primary + '50' },
  bottomChipTracking: { borderColor: COLORS.primary + '50' },
  bottomChipCancel:   { borderColor: '#EF444450' },
  bottomChipTxt:      { fontSize: 13, fontWeight: '600' },
  chipLiveDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E', marginLeft: 2 },
  chipBar:            { position: 'absolute', alignSelf: 'center' },
  chipChat:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipChatTxt:        { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  chipTracking:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipTrackingTxt:    { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  chipCancel:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipCancelTxt:      { fontSize: 13, fontWeight: '600', color: '#DC2626' },

  // ── legacy names kept ─────────────────────────────────────
  actionBannerWrap:    { position: 'absolute', left: 16, right: 16 },
  actionBannerText:    { flex: 1 },
  actionBannerTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  actionBannerSub:     { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  actionBanner:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 20, padding: 14, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  actionBannerTracking:{ borderColor: COLORS.primary + '35' },
  actionBannerChat:    { borderColor: COLORS.primary + '35' },
  actionBannerIcon:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionBannerOnline:  { position: 'absolute', top: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.card },
  actionBannerArrow:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cancelBtnWrap:       { position: 'absolute', left: 16, right: 16 },
  cancelBtnModern:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 20, padding: 14, borderWidth: 1.5, borderColor: '#FCA5A5' },
  cancelBtnInner:      { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cancelBtnIconWrap:   { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  cancelBtnTitle:      { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  cancelBtnSub:        { fontSize: 12, color: '#EF4444', marginTop: 2 },

  // ── Bannière Messagerie (legacy — gardé pour compat) ──────
  chatBannerWrap: { position: 'absolute', left: 20, right: 20 },
  chatBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: COLORS.primary + '30',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  chatBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chatBannerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  chatBannerDot: {
    position: 'absolute', top: 2, right: 2,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: COLORS.success,
    borderWidth: 2, borderColor: COLORS.card,
  },
  chatBannerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  chatBannerSub:   { fontSize: 12, color: COLORS.placeholder, marginTop: 1 },
  photosSection:      { marginTop: 16 },
  photosSectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  photosScroll:       { marginHorizontal: -4 },
  parcelPhoto:        { width: 160, height: 120, borderRadius: 12, marginHorizontal: 4, backgroundColor: COLORS.inputBackground },
  acceptDirectBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: COLORS.success || '#10B981', justifyContent: 'center' },
  acceptDirectText: { fontSize: 15, fontWeight: '700', color: '#fff', flex: 1 },
  acceptDirectPrice:{ fontSize: 15, fontWeight: '800', color: '#fff' },
  ratingBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.background, justifyContent: 'center' },
  ratingBtnDone:  { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  ratingBtnText:  { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  ratingBtnWrap:  { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  ratingBtnFab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 14, borderRadius: 14, alignSelf: 'stretch',
    shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  ratingBtnFabDone: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5, borderColor: '#F59E0B',
    shadowOpacity: 0, elevation: 0,
  },
  ratingBtnFabText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  ratedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.card,
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  ratedBadgeTxt: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  // ── Véhicule souhaité ──────────────────────────────────────────
  urgentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.error,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginHorizontal: 16, marginTop: 6, marginBottom: 2,
  },
  urgentBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
  dateSouhaiteeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.primary + '0D', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.primary + '25',
  },
  dateSouhaiteeBoxUrgent: { backgroundColor: COLORS.error + '12', borderColor: COLORS.error + '40' },
  dateSouhaiteeLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateSouhaiteeValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginTop: 1 },
  vehiculeSection:      { marginTop: 20, marginBottom: 4 },
  vehiculeSectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  vehiculeSectionDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  vehiculeSectionTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary,
                          textTransform: 'uppercase', letterSpacing: 1.2 },
  vehiculeSectionLine:  { flex: 1, height: 1, backgroundColor: COLORS.border },
  vehiculeCards:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vehiculeCard:         { alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14,
                          backgroundColor: COLORS.card, borderRadius: 16,
                          borderWidth: 1.5, borderColor: COLORS.primary + '30',
                          shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  vehiculeCardIcon:     { width: 44, height: 44, borderRadius: 12,
                          backgroundColor: COLORS.primary + '12',
                          alignItems: 'center', justifyContent: 'center' },
  vehiculeCardLabel:    { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary,
                          textAlign: 'center', maxWidth: 72 },
  priceLabel:           { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 2 },
  photoViewerOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  photoViewerContainer:  { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  photoViewerImg:        { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.75 },
  photoViewerClose:      { position: 'absolute', top: 56, right: 20 },
});