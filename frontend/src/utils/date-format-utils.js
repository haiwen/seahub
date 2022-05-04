const zhCN = require('@seafile/seafile-calendar/lib/locale/zh_CN');
const zhTW = require('@seafile/seafile-calendar/lib/locale/zh_TW');
const enUS = require('@seafile/seafile-calendar/lib/locale/en_US');
const frFR = require('@seafile/seafile-calendar/lib/locale/fr_FR');
const deDE = require('@seafile/seafile-calendar/lib/locale/de_DE');
const esES = require('@seafile/seafile-calendar/lib/locale/es_ES');
const plPL = require('@seafile/seafile-calendar/lib/locale/pl_PL');
const csCZ = require('@seafile/seafile-calendar/lib/locale/cs_CZ');
const ruRU = require('@seafile/seafile-calendar/lib/locale/ru_RU');

function translateCalendar() {
  const locale = window.app.config ?  window.app.config.lang : 'en';
  let language;
  switch (locale) {
    case 'zh-cn':
      language = zhCN;
      break;
    case 'zh-tw':
      language = zhTW;
      break;
    case 'en':
      language = enUS;
      break;
    case 'fr':
      language = frFR;
      break;
    case 'de':
      language = deDE;
      break;
    case 'es':
      language = esES;
      break;
    case 'es-ar':
      language = esES;
      break;
    case 'es-mx':
      language = esES;
      break;
    case 'pl':
      language = plPL;
      break;
    case 'cs':
      language = csCZ;
      break;
    case 'ru':
      language = ruRU;
      break;
    default:
      language = enUS;
  }
  return language;
}


export { translateCalendar };