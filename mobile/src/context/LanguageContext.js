import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setLocale } from '../i18n/index';
import { APP_CONFIG } from '../constants/config';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [currentLang, setCurrentLang] = useState(APP_CONFIG.DEFAULT_LANGUAGE);
  const [isRTL,       setIsRTL]       = useState(false);
  const [langReady,   setLangReady]   = useState(false);

  function applyLanguage(lang, persist = true) {
    setLocale(lang);
    setCurrentLang(lang);
    const rtl = lang === 'ar';
    setIsRTL(rtl);
    I18nManager.forceRTL(rtl);
    if (persist) {
      AsyncStorage.setItem(APP_CONFIG.LANG_KEY, lang).catch(() => {});
    }
  }

  // ✅ Stable avec useCallback — peut entrer dans le tableau de deps
  const loadSavedLanguage = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(APP_CONFIG.LANG_KEY);
      const lang  = saved || APP_CONFIG.DEFAULT_LANGUAGE;
      applyLanguage(lang, false);
    } catch (e) {
      applyLanguage(APP_CONFIG.DEFAULT_LANGUAGE, false);
    } finally {
      setLangReady(true);
    }
  // applyLanguage est définie hors useCallback et ne change pas — safe
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSavedLanguage();
  }, [loadSavedLanguage]); // ✅ dep incluse

  async function changeLanguage(lang) {
    if (lang === currentLang) return;
    applyLanguage(lang, true);
  }

  const value = {
    currentLang,
    isRTL,
    langReady,
    changeLanguage,
    isArabic: currentLang === 'ar',
    isFrench: currentLang === 'fr',
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  // ✅ Fallback au lieu de crasher
  if (!context) {
    return { language: 'fr', changeLanguage: () => {} };
  }
  return context;
}

export default LanguageContext;
