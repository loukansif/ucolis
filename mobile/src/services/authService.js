import api from './api';

export const authService = {
  async login({ email, motDePasse }) {
    console.log('🔄 Login attempt:', email);
    const { data } = await api.post('/auth/login', { email, motDePasse });
    console.log('✅ Login success:', data.user?.email);
    return data;
  },

  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  async logout() {
    const { data } = await api.post('/auth/logout');
    return data;
  },

  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  },

  async getMe() {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

export default authService;