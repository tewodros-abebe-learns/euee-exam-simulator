import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { translations, Language } from '../i18n/translations';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const SUPPORTED_LANGUAGES: Language[] = ['en', 'am'];

/** Reads the stored preference without flashing the wrong language first. */
function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem('language');
    if (saved && (SUPPORTED_LANGUAGES as string[]).includes(saved)) {
      return saved as Language;
    }
    // Legacy locale values (removed languages) would otherwise linger forever.
    if (saved) window.localStorage.removeItem('language');
  } catch {
    // Private mode / blocked storage: fall back to the default language.
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    setLanguageState(lang);
    try {
      window.localStorage.setItem('language', lang);
    } catch {
      // Persisting the preference is best-effort.
    }
  }, []);

  const t = useCallback(
    (key: keyof typeof translations.en, params?: Record<string, string | number>): string => {
      let str = translations[language]?.[key] || translations.en?.[key] || (key as string);
      if (params) {
        Object.entries(params).forEach(([paramKey, paramVal]) => {
          // A function replacement keeps `$&`/`$1` inside a value literal.
          str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), () => String(paramVal));
        });
      }
      return str;
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
