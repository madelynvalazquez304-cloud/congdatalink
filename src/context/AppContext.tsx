import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  CountryInfo,
  Language,
  AIRTEL_COUNTRIES,
  DEFAULT_COUNTRY,
} from '../data/countries';
import { getTranslation, TranslationKey } from '../i18n/translations';
import { safeStorage } from '../utils/safeBrowser';

interface AppContextValue {
  country: CountryInfo;
  setCountry: (country: CountryInfo, autoUpdateLanguage?: boolean) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
  hasUserSelectedCountry: boolean;
  setHasUserSelectedCountry: (value: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize country: DRC (+243) is strictly default under numbers selection
  const [country, setCountryState] = useState<CountryInfo>(() => {
    const savedCountryId = safeStorage.getItem('airtel_country_id');
    if (savedCountryId) {
      const found = AIRTEL_COUNTRIES.find((c) => c.id === savedCountryId);
      if (found) return found;
    }
    return DEFAULT_COUNTRY;
  });

  const [hasUserSelectedCountry, setHasUserSelectedCountry] = useState<boolean>(() => {
    return Boolean(safeStorage.getItem('airtel_country_selected'));
  });

  // Initialize language: French is strictly default. Do not auto-detect.
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = safeStorage.getItem('airtel_language') as Language;
    if (savedLang === 'fr' || savedLang === 'en') {
      return savedLang;
    }
    return 'fr';
  });

  // Set country (language does not auto switch unless explicitly requested)
  const setCountry = (newCountry: CountryInfo, autoUpdateLanguage: boolean = false) => {
    setCountryState(newCountry);
    setHasUserSelectedCountry(true);
    safeStorage.setItem('airtel_country_id', newCountry.id);
    safeStorage.setItem('airtel_country_selected', 'true');

    if (autoUpdateLanguage) {
      setLanguageState(newCountry.defaultLang);
      safeStorage.setItem('airtel_language', newCountry.defaultLang);
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    safeStorage.setItem('airtel_language', lang);
  };

  const toggleLanguage = () => {
    const nextLang = language === 'fr' ? 'en' : 'fr';
    setLanguage(nextLang);
  };

  const t = (key: TranslationKey) => getTranslation(key, language);

  return (
    <AppContext.Provider
      value={{
        country,
        setCountry,
        language,
        setLanguage,
        toggleLanguage,
        t,
        hasUserSelectedCountry,
        setHasUserSelectedCountry,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
