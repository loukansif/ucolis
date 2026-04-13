import api from './api';

export const ratingService = {

  async createRating({ colisId, note, commentaire }) {
    const { data } = await api.post('/ratings', { colisId, note, commentaire });
    return data;
  },

  // Retourne { aDejaNote: boolean, avis: object|null }
  async checkRating(colisId) {
    const { data } = await api.get(`/ratings/check/${colisId}`);
    return data;
  },

  async getUserRatings(userId) {
    const { data } = await api.get(`/ratings/user/${userId}`);
    return data; // { avis, total, page, totalPages }
  },
};