import { I18nManager } from 'react-native';
import fr from './fr';
import ar from './ar';

const translations = { fr, ar };

let currentLocale = 'fr';

export function setLocale(lang) {
  if (translations[lang]) currentLocale = lang;
}

export function getLocale() {
  return currentLocale;
}

/**
 * Traduit une clé (ex: 'auth.login') avec support des paramètres.
 * @param {string} key
 * @param {object} params - ex: { name: 'Mohamed' } → remplace {{name}}
 */
export function t(key, params = {}) {
  const dict = translations[currentLocale] || translations['fr'];
  const keys = key.split('.');
  let value  = dict;

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      value = null;
      break;
    }
  }

  if (typeof value !== 'string') {
    // Fallback sur le français
    let fallback = translations['fr'];
    for (const k of keys) {
      fallback = fallback?.[k];
    }
    value = typeof fallback === 'string' ? fallback : key;
  }

  // Remplacement des paramètres {{param}}
  return value.replace(/\{\{(\w+)\}\}/g, (_, p) =>
    params[p] !== undefined ? String(params[p]) : `{{${p}}}`
  );
}

export default { t, setLocale, getLocale };
