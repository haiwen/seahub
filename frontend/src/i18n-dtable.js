import i18n from 'i18next';
import Backend from 'i18next-xhr-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

let mediaUrl = window.app.pageOptions.mediaUrl;
const lang = window.app.pageOptions.lang;

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: lang,
    fallbackLng: 'en',
    ns: ['dtable', 'translations'],
    defaultNS: 'dtable',

    whitelist: ['en', 'zh-CN', 'fr', 'de', 'cs', 'es', 'es-AR', 'es-MX', 'ru'],

    backend: {
      loadPath: mediaUrl + 'assets/frontend/locales/{{ lng }}/{{ ns }}.json',
      // loadPath: '/media/locales/{{lng}}/{{ns}}.json',
      // loadPath: function(lng, ns) {
    },

    debug: true, // console log if debug: true

    interpolation: {
      escapeValue: false, // not needed for react!!
    },
    contextSeparator: ' ',


    load: 'currentOnly',

    react: {
      wait: true,
    }
  });

export default i18n;
