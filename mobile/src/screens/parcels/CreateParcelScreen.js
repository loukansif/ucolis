import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Modal, FlatList,
  KeyboardAvoidingView, Platform, Image,
  TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker      from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import parcelService         from '../../services/parcelService';
import Input    from '../../components/common/Input';
import Button   from '../../components/common/Button';
import COLORS   from '../../constants/colors';
import { t }    from '../../i18n/index';
import { getWilayaNames, getCommunesByWilaya, getWilayaCoords } from '../../utils/wilayas';

const WILAYA_NAMES = getWilayaNames();
const MAX_PHOTOS   = 5;

// ── Types de véhicule ────────────────────────────────────────────
const VEHICLE_TYPES = [
  { value: 'moto',        label: 'Moto',          icon: 'motorbike'         },
  { value: 'voiture',     label: 'Voiture',        icon: 'car'               },
  { value: 'break',       label: 'Break / SUV',    icon: 'car-estate'        },
  { value: 'utilitaire',  label: 'Utilitaire',     icon: 'van-utility'       },
  { value: 'camionnette', label: 'Camionnette',    icon: 'truck-fast'        },
  { value: 'camion',      label: 'Camion',         icon: 'truck'             },
  { value: 'semi',        label: 'Semi-remorque',  icon: 'truck-trailer'     },
];

const INITIAL_FORM = {
  titre:          '',
  description:    '',
  poids:          '',
  longueur:       '',
  largeur:        '',
  hauteur:        '',
  volume:         '',
  prixPropose:    '',
  typeVehicule:   [],       // multi-select
  dateSouhaitee:  null,
  urgent:         false,
  wilayaDepart:   '',
  villeDepart:    '',
  adresseDepart:  '',
  latDepart:      null,
  lngDepart:      null,
  wilayaArrivee:  '',
  villeArrivee:   '',
  adresseArrivee: '',
  latArrivee:     null,
  lngArrivee:     null,
};

// ── PickerModal ────────────────────────────────────────────────
// ── CitySearch — autocomplete Nominatim ──────────────────────
function CitySearch({ label, value, wilaya, onSelect, error, placeholder }) {
  const [query,       setQuery]       = React.useState(value || '');
  const [suggestions, setSuggestions] = React.useState([]);
  const [loading,     setLoading]     = React.useState(false);
  const [focused,     setFocused]     = React.useState(false);
  const debounceRef = React.useRef(null);

  React.useEffect(() => { setQuery(value || ''); }, [value]);

  function search(text) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text || text.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const q = encodeURIComponent(`${text}, ${wilaya || ''}, Algérie`);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&countrycodes=dz`,
          { headers: { 'Accept-Language': 'fr', 'User-Agent': 'UCOLIS-App' } }
        );
        const data = await res.json();
        setSuggestions(data.map(d => ({
          name:    d.display_name.split(',')[0].trim(),
          display: d.display_name,
          lat:     parseFloat(d.lat),
          lng:     parseFloat(d.lon),
        })));
      } catch (_) { setSuggestions([]); }
      finally { setLoading(false); }
    }, 400);
  }

  function select(item) {
    setQuery(item.name);
    setSuggestions([]);
    setFocused(false);
    onSelect({ name: item.name, lat: item.lat, lng: item.lng });
  }

  return (
    <View style={csStyles.wrapper}>
      {label ? <Text style={csStyles.label}>{label}</Text> : null}
      <View style={[csStyles.inputRow, error && csStyles.inputRowError, focused && csStyles.inputRowFocused]}>
        <MaterialCommunityIcons name="map-search" size={18} color={focused ? COLORS.primary : COLORS.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={csStyles.input}
          value={query}
          onChangeText={search}
          placeholder={placeholder || "Tapez le nom de la ville..."}
          placeholderTextColor={COLORS.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => { setFocused(false); setSuggestions([]); }, 200)}
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 4 }} />}
        {!loading && query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); onSelect({ name: '', lat: null, lng: null }); }}>
            <Ionicons name="close-circle" size={18} color={COLORS.placeholder} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={csStyles.error}>{error}</Text> : null}
      {suggestions.length > 0 && (
        <View style={csStyles.dropdown}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[csStyles.suggestion, i > 0 && csStyles.suggestionBorder]}
              onPress={() => select(s)}
            >
              <Ionicons name="location-outline" size={14} color={COLORS.primary} style={{ marginRight: 8, marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={csStyles.suggestionName}>{s.name}</Text>
                <Text style={csStyles.suggestionSub} numberOfLines={1}>{s.display}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const csStyles = StyleSheet.create({
  wrapper:          { marginBottom: 14 },
  label:            { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.inputBackground,
  },
  inputRowFocused:  { borderColor: COLORS.primary },
  inputRowError:    { borderColor: COLORS.error },
  input:            { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  error:            { fontSize: 12, color: COLORS.error, marginTop: 4 },
  dropdown: {
    backgroundColor: COLORS.card,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
    zIndex: 999,
  },
  suggestion:       { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 14, paddingVertical: 10 },
  suggestionBorder: { borderTopWidth: 1, borderTopColor: COLORS.border + '60' },
  suggestionName:   { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  suggestionSub:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
});


// ── DatePickerInline — sélecteur date/heure sans dépendance ──
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
    <View style={dpStyles.container}>
      {mode === 'date' ? (
        <View style={dpStyles.row}>
          <ScrollView style={dpStyles.col} showsVerticalScrollIndicator={false}>
            {days.map(d => (
              <TouchableOpacity key={d} style={[dpStyles.item, d === day && dpStyles.itemActive]} onPress={() => setDay(d)}>
                <Text style={[dpStyles.itemText, d === day && dpStyles.itemTextActive]}>{String(d).padStart(2,'0')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView style={dpStyles.col} showsVerticalScrollIndicator={false}>
            {months.map((m, i) => (
              <TouchableOpacity key={i} style={[dpStyles.item, i === month && dpStyles.itemActive]} onPress={() => setMonth(i)}>
                <Text style={[dpStyles.itemText, i === month && dpStyles.itemTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView style={dpStyles.col} showsVerticalScrollIndicator={false}>
            {years.map(y => (
              <TouchableOpacity key={y} style={[dpStyles.item, y === year && dpStyles.itemActive]} onPress={() => setYear(y)}>
                <Text style={[dpStyles.itemText, y === year && dpStyles.itemTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={dpStyles.row}>
          <ScrollView style={dpStyles.col} showsVerticalScrollIndicator={false}>
            {hours.map(h => (
              <TouchableOpacity key={h} style={[dpStyles.item, h === hour && dpStyles.itemActive]} onPress={() => setHour(h)}>
                <Text style={[dpStyles.itemText, h === hour && dpStyles.itemTextActive]}>{String(h).padStart(2,'0')}h</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <ScrollView style={dpStyles.col} showsVerticalScrollIndicator={false}>
            {mins.map(m => (
              <TouchableOpacity key={m} style={[dpStyles.item, m === min && dpStyles.itemActive]} onPress={() => setMin(m)}>
                <Text style={[dpStyles.itemText, m === min && dpStyles.itemTextActive]}>{String(m).padStart(2,'0')}min</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={dpStyles.actions}>
        <TouchableOpacity style={dpStyles.cancelBtn} onPress={onCancel}>
          <Text style={dpStyles.cancelText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={dpStyles.confirmBtn} onPress={confirm}>
          <Text style={dpStyles.confirmText}>Confirmer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const dpStyles = StyleSheet.create({
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

function PickerModal({ visible, title, data, selected, onSelect, onClose }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
                  <Text style={[modalStyles.itemText, isSelected && modalStyles.itemTextSelected]}>{item}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
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

// ── SelectField ────────────────────────────────────────────────
function SelectField({ label, value, placeholder, onPress, error, disabled }) {
  return (
    <View style={styles.fieldWrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.selectBtn, error && styles.selectBtnError, disabled && styles.selectBtnDisabled]}
        onPress={onPress}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text style={[styles.selectText, (!value || disabled) && styles.selectPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={disabled ? COLORS.border : COLORS.textSecondary} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ── SectionHeader ──────────────────────────────────────────────
function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrapper}>
        <MaterialCommunityIcons name={icon} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── AddressField avec bouton carte ─────────────────────────────
function AddressField({ label, value, onChangeText, onMapPress, error, hasPin, mapEnabled }) {
  return (
    <View style={styles.fieldWrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.addressRowInput}>
        <View style={styles.addressInputWrap}>
          <Input
            placeholder="Rue, quartier, point de repère..."
            value={value}
            onChangeText={onChangeText}
            error={error}
            leftIcon={
              <Ionicons
                name={hasPin ? 'location' : 'location-outline'}
                size={18}
                color={hasPin ? COLORS.success : COLORS.textSecondary}
              />
            }
            containerStyle={{ marginBottom: 0 }}
          />
        </View>
        <TouchableOpacity
          style={[styles.mapIconBtn, !mapEnabled && styles.mapIconBtnDisabled]}
          onPress={onMapPress}
          activeOpacity={mapEnabled ? 0.75 : 1}
        >
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={22}
            color={mapEnabled ? COLORS.white : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Screen principal ───────────────────────────────────────────
export default function CreateParcelScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const [form,           setForm]           = useState(INITIAL_FORM);
  const [errors,         setErrors]         = useState({});
  const [loading,        setLoading]        = useState(false);
  const [photos,         setPhotos]         = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(''); // 'date' | 'time' | ''
  const [priceEstimated, setPriceEstimated] = useState(false);
  const [unite,          setUnite]          = useState('cm'); // 'cm' | 'm'

  // ── Auto-calcul volume ────────────────────────────────────────
  useEffect(() => {
    const l = parseFloat(form.longueur);
    const w = parseFloat(form.largeur);
    const h = parseFloat(form.hauteur);
    if (l > 0 && w > 0 && h > 0) {
      let vol;
      if (unite === 'cm') {
        vol = parseFloat(((l * w * h) / 1_000_000).toFixed(4)); // cm³ → m³
      } else {
        vol = parseFloat((l * w * h).toFixed(4)); // déjà en m³
      }
      setForm(prev => ({ ...prev, volume: String(vol) }));
    } else {
      setForm(prev => ({ ...prev, volume: '' }));
    }
  }, [form.longueur, form.largeur, form.hauteur, unite]);

  // ── Auto-estimation prix ──────────────────────────────────────
  useEffect(() => {
    const poids  = parseFloat(form.poids);
    const volume = parseFloat(form.volume);
    if (!poids || !form.wilayaDepart || !form.wilayaArrivee) return;

    const coordsD = getWilayaCoords(form.wilayaDepart);
    const coordsA = getWilayaCoords(form.wilayaArrivee);
    if (!coordsD || !coordsA) return;

    const R    = 6371;
    const dLat = (coordsA.lat - coordsD.lat) * Math.PI / 180;
    const dLng = (coordsA.lng - coordsD.lng) * Math.PI / 180;
    const a    =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(coordsD.lat * Math.PI / 180) * Math.cos(coordsA.lat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    const distKm = Math.max(Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))), 1);

    const base    = 500;
    const byPoids = poids  * 50;
    const byDist  = distKm * 5;
    const byVol   = (volume > 0 ? volume : 0) * 200;
    const estim   = Math.round((base + byPoids + byDist + byVol) / 50) * 50;

    setForm(prev => ({ ...prev, prixPropose: String(estim) }));
    setPriceEstimated(true);
  }, [form.poids, form.volume, form.wilayaDepart, form.wilayaArrivee]); // eslint-disable-line react-hooks/exhaustive-deps

  const [modal, setModal] = useState({
    wilayaDepart: false,
    wilayaArrivee: false,
  });

  // ── Résultat MapPicker ────────────────────────────────────────
  useEffect(() => {
    const result = route.params?.mapResult;
    if (!result) return;

    // Matcher la wilaya depuis result.region ou l'adresse complète
    const matchedWilaya = WILAYA_NAMES.find(w =>
      result.region && result.region.toLowerCase().includes(w.toLowerCase())
    ) || WILAYA_NAMES.find(w =>
      result.address && result.address.toLowerCase().includes(w.toLowerCase())
    ) || '';
    const matchedCity = result.city || '';

    if (result.type === 'depart') {
      setForm(prev => ({
        ...prev,
        adresseDepart: result.address,
        latDepart:     result.lat,
        lngDepart:     result.lng,
        ...(matchedWilaya && { wilayaDepart: matchedWilaya }),
        ...(matchedCity   && { villeDepart:  matchedCity   }),
      }));
      setErrors(prev => ({ ...prev, adresseDepart: null, wilayaDepart: null, villeDepart: null }));
    } else {
      setForm(prev => ({
        ...prev,
        adresseArrivee: result.address,
        latArrivee:     result.lat,
        lngArrivee:     result.lng,
        ...(matchedWilaya && { wilayaArrivee: matchedWilaya }),
        ...(matchedCity   && { villeArrivee:  matchedCity   }),
      }));
      setErrors(prev => ({ ...prev, adresseArrivee: null, wilayaArrivee: null, villeArrivee: null }));
    }
    navigation.setParams({ mapResult: undefined });
  }, [route.params?.mapResult]); // eslint-disable-line react-hooks/exhaustive-deps

  function openModal(key)  { setModal(prev => ({ ...prev, [key]: true  })); }
  function closeModal(key) { setModal(prev => ({ ...prev, [key]: false })); }

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
    if (key === 'prixPropose') setPriceEstimated(false);
  }

  function selectWilayaDepart(wilaya) {
    setForm(prev => ({ ...prev, wilayaDepart: wilaya, villeDepart: '', latDepart: null, lngDepart: null }));
    setErrors(prev => ({ ...prev, wilayaDepart: null, villeDepart: null }));
  }

  function selectWilayaArrivee(wilaya) {
    setForm(prev => ({ ...prev, wilayaArrivee: wilaya, villeArrivee: '', latArrivee: null, lngArrivee: null }));
    setErrors(prev => ({ ...prev, wilayaArrivee: null, villeArrivee: null }));
  }

  function onSelectVilleDepart({ name, lat, lng }) {
    setForm(prev => ({ ...prev, villeDepart: name, latDepart: lat, lngDepart: lng }));
    setErrors(prev => ({ ...prev, villeDepart: null }));
  }

  function onSelectVilleArrivee({ name, lat, lng }) {
    setForm(prev => ({ ...prev, villeArrivee: name, latArrivee: lat, lngArrivee: lng }));
    setErrors(prev => ({ ...prev, villeArrivee: null }));
  }

  // ── Toggle type de véhicule (multi-select) ────────────────────
  function toggleVehicule(value) {
    setForm(prev => {
      const current = prev.typeVehicule;
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, typeVehicule: next };
    });
  }

  // ── Ouvrir MapPicker ─────────────────────────────────────────
  function openMapPicker(type) {
    const wilayaNom = type === 'depart' ? form.wilayaDepart : form.wilayaArrivee;
    if (!wilayaNom) {
      Alert.alert('', `Sélectionnez d'abord la wilaya de ${type === 'depart' ? 'départ' : 'arrivée'} avant d'ouvrir la carte.`);
      return;
    }
    // ✅ Priorité : coords de la ville sélectionnée → coords de la wilaya
    const cityLat = type === 'depart' ? form.latDepart  : form.latArrivee;
    const cityLng = type === 'depart' ? form.lngDepart  : form.lngArrivee;
    const wilayaCoords = getWilayaCoords(wilayaNom);
    const initialCoords = cityLat && cityLng
      ? { lat: cityLat, lng: cityLng }
      : wilayaCoords;
    navigation.navigate('MapPicker', { type, wilayaCoords: initialCoords, returnScreen: 'CreateParcel' });
  }

  // ── Upload photos ─────────────────────────────────────────────
  async function pickPhotos() {
    if (photos.length >= MAX_PHOTOS) { Alert.alert('', `Maximum ${MAX_PHOTOS} photos autorisées`); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('', "Autorisez l'accès à la galerie dans les paramètres"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled && result.assets?.length) {
      const newPhotos = result.assets.map((a, i) => ({
        uri: a.uri, type: a.mimeType || 'image/jpeg', name: `colis_${Date.now()}_${i}.jpg`,
      }));
      setPhotos(prev => [...prev, ...newPhotos].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(index) { setPhotos(prev => prev.filter((_, i) => i !== index)); }

  // ── Validation ─────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!form.titre.trim())                                                      e.titre       = 'Le titre est requis';
    if (!form.poids || isNaN(Number(form.poids)) || Number(form.poids) <= 0)    e.poids       = 'Entrez un poids valide (ex: 2.5)';
    if (!form.prixPropose || isNaN(Number(form.prixPropose)) || Number(form.prixPropose) < 100) e.prixPropose = 'Prix minimum 100 DA';
    if (!form.wilayaDepart)          e.wilayaDepart  = 'Wilaya de départ requise';
    if (!form.villeDepart)           e.villeDepart   = 'Ville de départ requise';
    if (!form.adresseDepart.trim())  e.adresseDepart = 'Adresse de départ requise';
    if (!form.wilayaArrivee)         e.wilayaArrivee = "Wilaya d'arrivée requise";
    if (!form.villeArrivee)          e.villeArrivee  = "Ville d'arrivée requise";
    if (!form.adresseArrivee.trim()) e.adresseArrivee = "Adresse d'arrivée requise";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Distance OSRM ────────────────────────────────────────────
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
    } catch (_e) { /* fallback */ }
    const R    = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a    =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return Math.max(Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))), 1);
  }

  // ── Soumission ─────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) { Alert.alert('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires (*)'); return; }
    setLoading(true);
    try {
      // Priorité: coords ville Nominatim → coords wilaya → Alger par défaut
      // Les mêmes coords sont utilisées pour la distance ET stockées en DB
      const latD = form.latDepart  ?? getWilayaCoords(form.wilayaDepart)?.lat  ?? 36.7372;
      const lngD = form.lngDepart  ?? getWilayaCoords(form.wilayaDepart)?.lng  ?? 3.0866;
      const latA = form.latArrivee ?? getWilayaCoords(form.wilayaArrivee)?.lat ?? 36.7372;
      const lngA = form.lngArrivee ?? getWilayaCoords(form.wilayaArrivee)?.lng ?? 3.0866;
      // ✅ Confirmer: coords Nominatim (ville) disponibles ?
      const hasVilleD = !!form.latDepart;
      const hasVilleA = !!form.latArrivee;
      if (!hasVilleD || !hasVilleA) {
        console.log('[CreateParcel] Coords manquantes — utilise centre wilaya. Sélectionnez la ville via le plan pour une distance précise.');
      }

      const distance = await getRouteDistance(latD, lngD, latA, lngA);

      const created = await parcelService.createParcel({
        titre: form.titre.trim(), description: form.description.trim(),
        poids: Number(form.poids), prixDemande: Number(form.prixPropose),
        // ✅ Toujours stocker en cm (convertir si m)
        longueur: form.longueur ? (unite === 'm' ? Number(form.longueur) * 100 : Number(form.longueur)) : undefined,
        largeur:  form.largeur  ? (unite === 'm' ? Number(form.largeur)  * 100 : Number(form.largeur))  : undefined,
        hauteur:  form.hauteur  ? (unite === 'm' ? Number(form.hauteur)  * 100 : Number(form.hauteur))  : undefined,
        volume:   form.volume   ? Number(form.volume)   : undefined,
        typeVehicule:  form.typeVehicule,
        dateSouhaitee: form.dateSouhaitee || null,
        urgent:        form.urgent || false,
        wilayaDepart: form.wilayaDepart, villeDepart: form.villeDepart,
        adresseDepart: form.adresseDepart.trim(), latDepart: latD, lngDepart: lngD,
        wilayaArrivee: form.wilayaArrivee, villeArrivee: form.villeArrivee,
        adresseArrivee: form.adresseArrivee.trim(), latArrivee: latA, lngArrivee: lngA,
        distance, photos: [],
      });

      if (photos.length > 0 && created?._id) {
        await parcelService.uploadPhotos(created._id, photos);
      }

      setForm(INITIAL_FORM);
      setPhotos([]);
      setErrors({});
      setPriceEstimated(false);
      setUnite('cm');

      Alert.alert(
        '✅ Annonce publiée !',
        `Votre colis est maintenant visible par les transporteurs.\nDistance par route : ${distance} km`,
        [{ text: 'Voir mes annonces', onPress: () => navigation.navigate('Annonces') }]
      );
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.message || 'Une erreur est survenue, réessayez.');
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <LinearGradient
          colors={COLORS.gradientHeader}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconRow}>
                <View style={styles.headerIconBox}>
                  <MaterialCommunityIcons name="package-variant-closed" size={26} color={COLORS.white} />
                </View>
                <Text style={styles.headerTitle}>Publier une annonce</Text>
              </View>
              <Text style={styles.headerSub}>Renseigne les informations de ton colis 📦</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.chipsRow}>
            {[
              { icon: 'map-marker',     label: 'Localisation précise' },
              { icon: 'road-variant',   label: 'Distance par route'   },
              { icon: 'camera-outline', label: `Photos (max ${MAX_PHOTOS})` },
            ].map((c, i) => (
              <View key={i} style={styles.chip}>
                <MaterialCommunityIcons name={c.icon} size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.chipText}>{c.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── Départ ──────────────────────────────────────── */}
          <SectionHeader icon="map-marker" title="Point de départ" />

          <SelectField
            label="Wilaya de départ *"
            value={form.wilayaDepart}
            placeholder="Sélectionner une wilaya"
            onPress={() => openModal('wilayaDepart')}
            error={errors.wilayaDepart}
          />
          <CitySearch
            label="Ville / Commune de départ *"
            value={form.villeDepart}
            wilaya={form.wilayaDepart}
            onSelect={onSelectVilleDepart}
            error={errors.villeDepart}
            placeholder={form.wilayaDepart ? 'Tapez le nom de la ville...' : "Choisissez d'abord la wilaya"}
          />
          <AddressField
            label="Adresse précise de départ *"
            value={form.adresseDepart}
            onChangeText={(v) => update('adresseDepart', v)}
            error={errors.adresseDepart}
            onMapPress={() => openMapPicker('depart')}
            hasPin={form.latDepart !== null}
            mapEnabled={!!form.wilayaDepart}
          />

          {/* ── Arrivée ─────────────────────────────────────── */}
          <SectionHeader icon="map-marker-check" title="Point d'arrivée" />

          <SelectField
            label="Wilaya d'arrivée *"
            value={form.wilayaArrivee}
            placeholder="Sélectionner une wilaya"
            onPress={() => openModal('wilayaArrivee')}
            error={errors.wilayaArrivee}
          />
          <CitySearch
            label="Ville / Commune d'arrivée *"
            value={form.villeArrivee}
            wilaya={form.wilayaArrivee}
            onSelect={onSelectVilleArrivee}
            error={errors.villeArrivee}
            placeholder={form.wilayaArrivee ? 'Tapez le nom de la ville...' : "Choisissez d'abord la wilaya"}
          />
          <AddressField
            label="Adresse précise d'arrivée *"
            value={form.adresseArrivee}
            onChangeText={(v) => update('adresseArrivee', v)}
            error={errors.adresseArrivee}
            onMapPress={() => openMapPicker('arrivee')}
            hasPin={form.latArrivee !== null}
            mapEnabled={!!form.wilayaArrivee}
          />

          {/* ── Infos colis ─────────────────────────────────── */}
          <SectionHeader icon="package-variant" title="Informations du colis" />

          <Input
            label="Titre de l'annonce *"
            placeholder="Ex: Envoyer un carton de vêtements vers Oran"
            value={form.titre}
            onChangeText={(v) => update('titre', v)}
            error={errors.titre}
          />
          <Input
            label="Description"
            placeholder="Contenu, fragilité, instructions particulières..."
            value={form.description}
            onChangeText={(v) => update('description', v)}
            multiline
            numberOfLines={3}
          />

          {/* ── Dimensions avec toggle cm/m ────────────────── */}
          <View style={styles.dimsHeaderRow}>
            <Text style={styles.dimsLabel}>
              Dimensions —{' '}
              <Text style={styles.dimsHint}>volume calculé automatiquement</Text>
            </Text>
            {/* Toggle cm / m */}
            <View style={styles.uniteToggle}>
              {['cm', 'm'].map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.uniteBtn, unite === u && styles.uniteBtnActive]}
                  onPress={() => setUnite(u)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.uniteBtnText, unite === u && styles.uniteBtnTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            {[
              { key: 'longueur', placeholder: 'Longueur' },
              { key: 'largeur',  placeholder: 'Largeur'  },
              { key: 'hauteur',  placeholder: 'Hauteur'  },
            ].map(({ key, placeholder }) => (
              <View key={key} style={styles.third}>
                <Input
                  placeholder={`${placeholder} (${unite})`}
                  value={form[key]}
                  onChangeText={(v) => update(key, v)}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Poids (kg) *"
                placeholder="Ex: 2.5"
                value={form.poids}
                onChangeText={(v) => update('poids', v)}
                keyboardType="decimal-pad"
                error={errors.poids}
                leftIcon={<MaterialCommunityIcons name="weight-kilogram" size={18} color={COLORS.textSecondary} />}
              />
            </View>
            {form.volume ? (
              <View style={[styles.half, { justifyContent: 'center', paddingTop: 8 }]}>
                <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 4 }}>VOLUME (m³)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="cube-outline" size={16} color={COLORS.primary} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.primary }}>{form.volume}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>auto</Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* ── Type de véhicule ─────────────────────────────── */}
          <SectionHeader icon="truck-outline" title="Type de véhicule souhaité" />
          <Text style={styles.vehiculeHint}>Sélectionnez un ou plusieurs types de véhicule</Text>
          <View style={styles.vehiculeGrid}>
            {VEHICLE_TYPES.map(v => {
              const selected = form.typeVehicule.includes(v.value);
              return (
                <TouchableOpacity
                  key={v.value}
                  style={[styles.vehiculeChip, selected && styles.vehiculeChipActive]}
                  onPress={() => toggleVehicule(v.value)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name={v.icon}
                    size={20}
                    color={selected ? COLORS.white : COLORS.textSecondary}
                  />
                  <Text style={[styles.vehiculeLabel, selected && styles.vehiculeLabelActive]}>
                    {v.label}
                  </Text>
                  {selected && (
                    <View style={styles.vehiculeCheck}>
                      <Ionicons name="checkmark" size={10} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>


          {/* ── Date et heure souhaitées ───────────────────── */}
          <SectionHeader icon="calendar-clock" title="Date et heure souhaitées" />

          {/* Toggle Urgent */}
          <TouchableOpacity
            style={[styles.urgentToggle, form.urgent && styles.urgentToggleActive]}
            onPress={() => update('urgent', !form.urgent)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons
              name={form.urgent ? 'lightning-bolt' : 'lightning-bolt-outline'}
              size={20}
              color={form.urgent ? '#fff' : COLORS.error}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.urgentLabel, form.urgent && styles.urgentLabelActive]}>Livraison urgente</Text>
              <Text style={[styles.urgentSub, form.urgent && styles.urgentSubActive]}>Le transporteur sera notifié de l'urgence</Text>
            </View>
            <View style={[styles.urgentCheck, form.urgent && styles.urgentCheckActive]}>
              {form.urgent && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </TouchableOpacity>

          <Text style={styles.vehiculeHint}>Optionnel — quand souhaitez-vous la livraison ?</Text>
          <View style={styles.dateRow}>
            {/* Bouton Date */}
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker('date')}
            >
              <MaterialCommunityIcons name="calendar" size={18} color={form.dateSouhaitee ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.dateBtnText, form.dateSouhaitee && styles.dateBtnTextActive]}>
                {form.dateSouhaitee
                  ? new Date(form.dateSouhaitee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                  : 'Choisir une date'}
              </Text>
            </TouchableOpacity>
            {/* Bouton Heure */}
            <TouchableOpacity
              style={[styles.dateBtn, !form.dateSouhaitee && styles.dateBtnDisabled]}
              onPress={() => {
                if (!form.dateSouhaitee) { Alert.alert('', "Choisissez d'abord une date"); return; }
                setShowDatePicker('time');
              }}
            >
              <MaterialCommunityIcons name="clock-outline" size={18} color={form.dateSouhaitee ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.dateBtnText, form.dateSouhaitee && styles.dateBtnTextActive]}>
                {form.dateSouhaitee
                  ? new Date(form.dateSouhaitee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </Text>
            </TouchableOpacity>
            {/* Effacer */}
            {form.dateSouhaitee && (
              <TouchableOpacity style={styles.dateClear} onPress={() => update('dateSouhaitee', null)}>
                <Ionicons name="close-circle" size={20} color={COLORS.error} />
              </TouchableOpacity>
            )}
          </View>

          {/* Picker date inline */}
          {showDatePicker !== '' && (
            <DatePickerInline
              mode={showDatePicker}
              current={form.dateSouhaitee ? new Date(form.dateSouhaitee) : new Date()}
              onConfirm={(val) => {
                const base = form.dateSouhaitee ? new Date(form.dateSouhaitee) : new Date();
                if (showDatePicker === 'date') {
                  val.setHours(base.getHours(), base.getMinutes(), 0, 0);
                } else {
                  const d = new Date(form.dateSouhaitee);
                  val = new Date(d.getFullYear(), d.getMonth(), d.getDate(), val.getHours(), val.getMinutes());
                }
                update('dateSouhaitee', val.toISOString());
                setShowDatePicker('');
              }}
              onCancel={() => setShowDatePicker('')}
            />
          )}

          {/* ── Prix proposé ────────────────────────────────── */}
          <View style={styles.prixRow}>
            <Text style={styles.prixLabel}>Prix proposé (DA) *</Text>
            {priceEstimated && (
              <View style={styles.estimBadge}>
                <MaterialCommunityIcons name="calculator-variant-outline" size={12} color={COLORS.primary} />
                <Text style={styles.estimBadgeText}>Estimé · modifiable</Text>
              </View>
            )}
          </View>
          <Text style={styles.prixSub}>Le transporteur peut négocier si besoin</Text>
          <Input
            placeholder="Ex: 1500"
            value={form.prixPropose}
            onChangeText={(v) => update('prixPropose', v)}
            keyboardType="numeric"
            error={errors.prixPropose}
            leftIcon={<MaterialCommunityIcons name="cash" size={18} color={priceEstimated ? COLORS.primary : COLORS.textSecondary} />}
            style={priceEstimated ? styles.prixInputEstimated : undefined}
          />

          {/* ── Photos ──────────────────────────────────────── */}
          <SectionHeader icon="image-multiple" title="Photos du colis" />
          <View style={styles.photosGrid}>
            {photos.map((p, i) => (
              <View key={i} style={styles.photoThumb}>
                <Image source={{ uri: p.uri }} style={styles.thumbImg} />
                <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(i)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Ionicons name="close-circle" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhotos} activeOpacity={0.75}>
                <MaterialCommunityIcons name="camera-plus-outline" size={28} color={COLORS.primary} />
                <Text style={styles.addPhotoText}>{photos.length === 0 ? 'Ajouter des photos' : 'Ajouter'}</Text>
                <Text style={styles.addPhotoCount}>{photos.length}/{MAX_PHOTOS}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.photoHint}>📷 Les photos aident les transporteurs à évaluer votre colis</Text>

          <Button
            title="📦 Publier l'annonce"
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            loading={loading}
            style={styles.submitBtn}
          />
        </View>
      </ScrollView>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <PickerModal visible={modal.wilayaDepart}  title="Wilaya de départ"   data={WILAYA_NAMES} selected={form.wilayaDepart}  onSelect={selectWilayaDepart} onClose={() => closeModal('wilayaDepart')} />
      <PickerModal visible={modal.wilayaArrivee} title="Wilaya d'arrivée"   data={WILAYA_NAMES} selected={form.wilayaArrivee} onSelect={selectWilayaArrivee} onClose={() => closeModal('wilayaArrivee')} />
    </KeyboardAvoidingView>
  );
}

// ── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex:               { flex: 1, backgroundColor: COLORS.background },
  header:             { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow:          { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  headerLeft:         { flex: 1 },
  headerIconRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  headerIconBox:      { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:        { fontSize: 22, fontWeight: '800', color: COLORS.white },
  headerSub:          { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginLeft: 2 },
  closeBtn:           { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  chipsRow:           { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:               { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  chipText:           { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  body:               { padding: 20 },
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 16 },
  sectionIconWrapper: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  sectionTitle:       { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  row:                { flexDirection: 'row', gap: 12 },
  half:               { flex: 1 },
  third:              { flex: 1 },
  // Dimensions
  dimsHeaderRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 },
  dimsLabel:          { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, flex: 1 },
  dimsHint:           { fontWeight: '400', color: COLORS.placeholder, fontStyle: 'italic' },
  // Toggle unité
  uniteToggle:        { flexDirection: 'row', backgroundColor: COLORS.border + '50', borderRadius: 8, padding: 2, gap: 2 },
  uniteBtn:           { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  uniteBtnActive:     { backgroundColor: COLORS.primary },
  uniteBtnText:       { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  uniteBtnTextActive: { color: COLORS.white },
  // Véhicules
  vehiculeHint:       { fontSize: 12, color: COLORS.textSecondary, marginBottom: 12, fontStyle: 'italic' },
  urgentToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: COLORS.error + '60',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: COLORS.error + '08', marginBottom: 12,
  },
  urgentToggleActive: {
    backgroundColor: COLORS.error, borderColor: COLORS.error,
  },
  urgentLabel:       { fontSize: 14, fontWeight: '700', color: COLORS.error },
  urgentLabelActive: { color: '#fff' },
  urgentSub:         { fontSize: 11, color: COLORS.error + 'AA', marginTop: 1 },
  urgentSubActive:   { color: 'rgba(255,255,255,0.8)' },
  urgentCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: COLORS.error + '80',
    alignItems: 'center', justifyContent: 'center',
  },
  urgentCheckActive: { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'transparent' },
  dateRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11,
    backgroundColor: COLORS.inputBackground,
  },
  dateBtnDisabled:   { opacity: 0.45 },
  dateBtnText:       { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  dateBtnTextActive: { color: COLORS.primary, fontWeight: '600' },
  dateClear:         { padding: 4 },
  vehiculeGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  vehiculeChip:       { flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
                        borderWidth: 1.5, borderColor: COLORS.border,
                        backgroundColor: COLORS.card, position: 'relative' },
  vehiculeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  vehiculeLabel:      { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  vehiculeLabelActive:{ color: COLORS.white },
  vehiculeCheck:      { position: 'absolute', top: -5, right: -5, width: 16, height: 16,
                        borderRadius: 8, backgroundColor: COLORS.success,
                        alignItems: 'center', justifyContent: 'center' },
  // Prix
  prixRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, marginTop: 28 },
  prixLabel:          { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  prixSub:            { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, fontStyle: 'italic' },
  estimBadge:         { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '15', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  estimBadgeText:     { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  prixInputEstimated: { borderColor: COLORS.primary, borderWidth: 1.5 },
  // Champs
  fieldWrapper:       { marginBottom: 14 },
  label:              { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  selectBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: COLORS.card },
  selectBtnError:     { borderColor: COLORS.error },
  selectBtnDisabled:  { backgroundColor: COLORS.background, opacity: 0.6 },
  selectText:         { fontSize: 15, color: COLORS.textPrimary, flex: 1 },
  selectPlaceholder:  { color: COLORS.textSecondary },
  errorText:          { fontSize: 12, color: COLORS.error, marginTop: 4 },
  addressRowInput:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addressInputWrap:   { flex: 1 },
  mapIconBtn:         { width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 },
  mapIconBtnDisabled: { backgroundColor: COLORS.border, shadowOpacity: 0, elevation: 0 },
  // Photos
  photosGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  photoThumb:         { width: 96, height: 96, borderRadius: 10, overflow: 'visible', position: 'relative' },
  thumbImg:           { width: 96, height: 96, borderRadius: 10, backgroundColor: COLORS.inputBackground },
  removePhoto:        { position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.white, borderRadius: 12 },
  addPhotoBtn:        { width: 96, height: 96, borderRadius: 10, borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: COLORS.primary + '08' },
  addPhotoText:       { fontSize: 11, color: COLORS.primary, fontWeight: '700', textAlign: 'center' },
  addPhotoCount:      { fontSize: 10, color: COLORS.textSecondary },
  photoHint:          { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontStyle: 'italic' },
  submitBtn:          { marginTop: 32 },
});

const modalStyles = StyleSheet.create({
  overlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container:        { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingBottom: 20 },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:            { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  item:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  itemSelected:     { backgroundColor: COLORS.primary + '12' },
  itemText:         { fontSize: 15, color: COLORS.textPrimary },
  itemTextSelected: { color: COLORS.primary, fontWeight: '700' },
  separator:        { height: 1, backgroundColor: COLORS.border + '40', marginHorizontal: 16 },
});