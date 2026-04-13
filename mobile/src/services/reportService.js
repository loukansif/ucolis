import api from './api';
import { ENDPOINTS } from '../constants/api';

export const reportService = {
  /**
   * Envoyer un signalement
   * @param {Object} payload { type, raison, description, cibleUser?, cibleParcel?, cibleAvis? }
   */
  async create(payload) {
    const { data } = await api.post(ENDPOINTS.CREATE_REPORT, payload);
    return data;
  },
};