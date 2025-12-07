import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import deTranslations from './locales/de.json';
// Import translations
import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import jaTranslations from './locales/ja.json';
import viTranslations from './locales/vi.json';

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
  fr: {
    translation: frTranslations,
  },
  es: {
    translation: esTranslations,
  },
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en',
    debug: import.meta.env.DEV, // Enable debug in development
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
