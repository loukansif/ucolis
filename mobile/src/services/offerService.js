import api from './api';
import { ENDPOINTS } from '../constants/api';

async function createOffer(offerData) {
  const response = await api.post(ENDPOINTS.OFFERS, offerData);
  return response.data;
}

async function getOffersByParcel(parcelId) {
  const response = await api.get(ENDPOINTS.OFFERS_BY_PARCEL(parcelId));
  return response.data;
}

async function acceptOffer(offerId) {
  const response = await api.patch(ENDPOINTS.ACCEPT_OFFER(offerId));
  return response.data;
}

async function rejectOffer(offerId) {
  const response = await api.patch(ENDPOINTS.REJECT_OFFER(offerId));
  return response.data;
}

// ✅ Transporteur re-propose un prix en réponse à la contre-offre
async function reOffer(offerId, prixPropose, message) {
  const response = await api.patch(ENDPOINTS.REOFFER(offerId), { prix: prixPropose, message });  // ✅ backend attend 'prix'
  return response.data;
}

// ✅ Transporteur accepte la contre-offre
async function acceptCounter(offerId) {
  const response = await api.patch(ENDPOINTS.ACCEPT_COUNTER(offerId));
  return response.data;
}

// ✅ Transporteur refuse la contre-offre
async function rejectCounter(offerId) {
  const response = await api.patch(ENDPOINTS.REJECT_COUNTER(offerId));
  return response.data;
}

// ✅ NOUVEAU — contre-offre de l'expéditeur
async function counterOffer(offerId, prixContreOffre, message) {
  const response = await api.patch(ENDPOINTS.COUNTER_OFFER(offerId), {
    prix: prixContreOffre,   // ✅ backend attend "prix"
    message,
  });
  return response.data;
}

async function getMyOffers() {
  const response = await api.get(ENDPOINTS.MY_OFFERS);
  return response.data;
}

export const offerService = {
  createOffer,
  getOffersByParcel,
  acceptOffer,
  rejectOffer,
  counterOffer,   // ✅
  reOffer,         // ✅
  acceptCounter,   // ✅
  rejectCounter,   // ✅
  getMyOffers,
};

export default offerService;