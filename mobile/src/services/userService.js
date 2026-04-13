import api from './api';
import { ENDPOINTS } from '../constants/api';


export const userService = {
  /** Récupère le profil de l'utilisateur connecté */
  async getMe() {
    const { data } = await api.get(ENDPOINTS.ME);
    return data;
  },

  /** Récupère un utilisateur par son ID */
  async getUserById(userId) {
    const { data } = await api.get(`/users/${userId}`);
    return data;
  },

  /** Met à jour les informations du profil */
  async updateProfile(payload) {
    const { data } = await api.put(ENDPOINTS.UPDATE_PROFILE, payload);
    return data;
  },

  /** Upload de la photo de profil (FormData) */
  async uploadProfilePhoto(formData) {
    const { data } = await api.put(ENDPOINTS.UPLOAD_PHOTO, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** Changer le mot de passe */
  async changePassword({ ancienMotDePasse, nouveauMotDePasse }) {
    const { data } = await api.put(ENDPOINTS.CHANGE_PASSWORD, {
      ancienMotDePasse,
      nouveauMotDePasse,
    });
    return data;
  },

  /** Récupère les documents soumis */
  async getDocuments() {
    const { data } = await api.get(ENDPOINTS.DOCUMENTS);
    return data;
  },

  /** Upload d'un document (FormData avec champ `type`) */
  async uploadDocument(formData) {
    const { data } = await api.post(ENDPOINTS.UPLOAD_DOCUMENT, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** Récupère les avis reçus par l'utilisateur connecté */
  async getMyRatings() {
    const { data } = await api.get(ENDPOINTS.MY_RATINGS);
    return data;
  },
};