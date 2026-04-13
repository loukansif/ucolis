import api from './api';
import { ENDPOINTS } from '../constants/api';

export const adminService = {
  // ── Dashboard ──────────────────────────────────────
  getStats() {
    return api.get(ENDPOINTS.ADMIN_STATS).then(r => r.data);
  },

  // ── Utilisateurs ───────────────────────────────────
  getUsers(params = {}) {
    return api.get(ENDPOINTS.ADMIN_USERS, { params }).then(r => r.data);
  },
  getUserById(id) {
    return api.get(ENDPOINTS.ADMIN_USER_BY_ID(id)).then(r => r.data);
  },
  toggleBan(id) {
    return api.patch(ENDPOINTS.ADMIN_TOGGLE_BAN(id)).then(r => r.data);
  },
  promote(id) {
    return api.patch(ENDPOINTS.ADMIN_PROMOTE(id)).then(r => r.data);
  },
  deleteUser(id) {
    return api.delete(ENDPOINTS.ADMIN_DELETE_USER(id)).then(r => r.data);
  },

  // ── Documents ──────────────────────────────────────
  getDocuments(params = {}) {
    return api.get(ENDPOINTS.ADMIN_DOCUMENTS, { params }).then(r => r.data);
  },
  validateDocs(id, statut, motif = '') {
    return api.patch(ENDPOINTS.ADMIN_VALIDATE_DOCS(id), { statut, motif }).then(r => r.data);
  },

  // ── Annonces ───────────────────────────────────────
  getParcels(params = {}) {
    return api.get(ENDPOINTS.ADMIN_PARCELS, { params }).then(r => r.data);
  },
  setParcelStatus(id, statut) {
    return api.patch(ENDPOINTS.ADMIN_PARCEL_STATUS(id), { statut }).then(r => r.data);
  },
  deleteParcel(id) {
    return api.delete(ENDPOINTS.ADMIN_DELETE_PARCEL(id)).then(r => r.data);
  },

  // ── Signalements ──────────────────────────────────────
  getReports(params = {}) {
    return api.get(ENDPOINTS.ADMIN_REPORTS, { params }).then(r => r.data);
  },
  handleReport(id, statut, noteAdmin = '') {
    return api.patch(ENDPOINTS.ADMIN_REPORT_BY_ID(id), { statut, noteAdmin }).then(r => r.data);
  },
  deleteReport(id) {
    return api.delete(ENDPOINTS.ADMIN_REPORT_BY_ID(id)).then(r => r.data);
  },

  // ── Avis ───────────────────────────────────────────
  getReviews(params = {}) {
    return api.get(ENDPOINTS.ADMIN_REVIEWS, { params }).then(r => r.data);
  },
  deleteReview(id) {
    return api.delete(ENDPOINTS.ADMIN_DELETE_REVIEW(id)).then(r => r.data);
  },
  // ── Conversations ──
  async getConversationBetween(u1, u2) {
    const { data } = await api.get(ENDPOINTS.ADMIN_CONV_BETWEEN(u1, u2));
    return data;
  },
  async getConversations(params = {}) {
    const { data } = await api.get(ENDPOINTS.ADMIN_CONVERSATIONS, { params });
    return data;
  },
  async getConversationMessages(convId, params = {}) {
    const { data } = await api.get(ENDPOINTS.ADMIN_CONV_MESSAGES(convId), { params });
    return data;
  },
  async deleteConversation(convId) {
    const { data } = await api.delete(ENDPOINTS.ADMIN_DELETE_CONV(convId));
    return data;
  },

};