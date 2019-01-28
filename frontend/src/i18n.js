import i18n from 'i18next';
import XHR from 'i18next-xhr-backend';

let siteRoot = window.app.config.siteRoot;

i18n
  .use(XHR)
  .init({
    fallbackLng: 'en',

    ns: ['translations'],
    defaultNS: 'translations',

    whitelist: ['en', 'zh-CN', 'fr', 'de', 'cs', 'es', 'es-AR', 'es-MX', 'ru'],

    backend: {
      loadPath: siteRoot + 'media/assets/frontend/locales/{{ lng }}/{{ ns }}.json',
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
