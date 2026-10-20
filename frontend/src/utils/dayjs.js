import dayjs from 'dayjs';
import ar from 'dayjs/locale/ar';
import de from 'dayjs/locale/de';
import en from 'dayjs/locale/en';
import enGB from 'dayjs/locale/en-gb';
import es from 'dayjs/locale/es';
import fr from 'dayjs/locale/fr';
import lv from 'dayjs/locale/lv';
import ru from 'dayjs/locale/ru';
import zhCN from 'dayjs/locale/zh-cn';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(customParseFormat);
dayjs.extend(localeData);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(weekOfYear);

// Register the existing language set before selecting the site language.
const locales = [ar, de, en, enGB, es, fr, lv, ru, zhCN];
const language = typeof window !== 'undefined' ? window.app?.config?.lang : 'en';
dayjs.locale(locales.find(locale => locale.name === language) || en);

export default dayjs;
