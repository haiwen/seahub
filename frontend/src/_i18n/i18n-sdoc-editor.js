import i18n from 'i18next';
import Backend from 'i18next-xhr-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { mediaUrl } from '../utils/constants';

const lang = window.app.pageOptions.lang;

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: lang,
    fallbackLng: 'en',
    ns: ['sdoc-editor'],
    defaultNS: 'translations',

    whitelist: ['en', 'zh-CN', 'fr', 'de', 'cs', 'es', 'es-AR', 'es-MX', 'ru'],

    backend: {
      loadPath: mediaUrl + 'sdoc-editor/locales/{{ lng }}/{{ ns }}.json',
      // loadPath: '/media/locales/{{lng}}/{{ns}}.json',
    },

    debug: false, // console log if debug: true

    interpolation: {
      escapeValue: false, // not needed for react!!
    },


    load: 'currentOnly',

    react: {
      wait: true,
    }
  });

export default i18n;
