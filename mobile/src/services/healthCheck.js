import axios from 'axios';
import { BASE_URL } from './api';

export default async function checkApiConnection() {
  try {
    const healthUrl = BASE_URL.replace('/api', '/api/health');
    const { data }  = await axios.get(healthUrl, { timeout: 5000 });
    console.log('🟢 API connectée :', JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('🔴 API non joignable :', e.message);
    return false;
  }
}