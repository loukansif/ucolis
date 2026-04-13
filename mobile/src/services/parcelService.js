import api from './api';
import { ENDPOINTS } from '../constants/api';

const parcelService = {

  // GET /parcels — liste avec filtres/pagination
  async getParcels(params = {}) {
    const { data } = await api.get(ENDPOINTS.PARCELS, { params });
    return data; // → { parcels: [...], total, page, totalPages }
  },

  // GET /parcels?expediteur=:id — mes colis (filtre côté backend)
  async getMyParcels(userId) {
    const { data } = await api.get(ENDPOINTS.PARCELS, {
      params: { expediteur: userId },
    });
    return data;
  },

  // GET /parcels/:id
  async getParcelById(id) {
    const { data } = await api.get(ENDPOINTS.PARCEL_BY_ID(id));
    return data;
  },

  // POST /parcels — créer une annonce
  async createParcel(payload) {
    const { data } = await api.post(ENDPOINTS.PARCELS, payload);
    return data;
  },

  // PUT /parcels/:id — modifier une annonce
  async updateParcel(id, payload) {
    const { data } = await api.put(ENDPOINTS.PARCEL_BY_ID(id), payload);
    return data;
  },

  // DELETE /parcels/:id — supprimer une annonce
  async deleteParcel(id) {
    const { data } = await api.delete(ENDPOINTS.PARCEL_BY_ID(id));
    return data;
  },

  // PATCH /parcels/:id/status — changer le statut
  async updateParcelStatus(id, statut) {
    const { data } = await api.patch(ENDPOINTS.UPDATE_PARCEL_STATUS(id), { statut });
    return data;
  },

  // POST /parcels/upload/photo — upload une photo, retourne { url }
  // Ensuite mettre à jour le colis avec updateParcel pour attacher l'URL
  async uploadPhoto(formData) {
    const { data } = await api.post(ENDPOINTS.UPLOAD_PARCEL_PHOTOS, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data; // → { url: 'https://cloudinary...' }
  },

  // Helper : upload plusieurs photos et retourne les URLs
  async uploadPhotos(parcelId, photos) {
    const urls = [];
    for (const photo of photos) {
      try {
        const fd = new FormData();
        fd.append('photo', { uri: photo.uri, type: photo.type || 'image/jpeg', name: photo.name });
        const result = await parcelService.uploadPhoto(fd);
        if (result?.url) urls.push(result.url);
      } catch (e) {
        console.warn('Photo upload error:', e.message);
      }
    }
    // Attache les URLs au colis via PUT /:id
    if (urls.length > 0) {
      try {
        const parcel = await parcelService.getParcelById(parcelId);
        const existingPhotos = parcel?.photos || [];
        await parcelService.updateParcel(parcelId, {
          photos: [...existingPhotos, ...urls],
        });
      } catch (e) {
        console.warn('Parcel photos update error:', e.message);
      }
    }
    return urls;
  },
};

async function updateStatus(id, statut) {
  const response = await api.patch(ENDPOINTS.UPDATE_PARCEL_STATUS(id), { statut });
  return response.data;
}

parcelService.updateStatus = updateStatus;

export default parcelService;