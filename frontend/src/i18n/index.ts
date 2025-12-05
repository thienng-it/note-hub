import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enTranslations from './locales/en.json';
import deTranslations from './locales/de.json';
import viTranslations from './locales/vi.json';
import jaTranslations from './locales/ja.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  de: {
    translation: deTranslations,
  },
  vi: {
    translation: viTranslations,
  },
  ja: {
    translation: jaTranslations,
  },
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
