import dayjs from 'dayjs';
import 'dayjs/locale/ar';
import 'dayjs/locale/ca';
import 'dayjs/locale/cs';
import 'dayjs/locale/de';
import 'dayjs/locale/el';
import 'dayjs/locale/en-gb';
import es from 'dayjs/locale/es';
import 'dayjs/locale/es-mx';
import 'dayjs/locale/fi';
import 'dayjs/locale/fr';
import 'dayjs/locale/he';
import 'dayjs/locale/hu';
import 'dayjs/locale/is';
import 'dayjs/locale/it';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/lv';
import 'dayjs/locale/nl';
import 'dayjs/locale/pl';
import 'dayjs/locale/pt-br';
import 'dayjs/locale/ru';
import 'dayjs/locale/sl';
import 'dayjs/locale/sv';
import 'dayjs/locale/th';
import 'dayjs/locale/tr';
import 'dayjs/locale/uk';
import 'dayjs/locale/vi';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/zh-tw';
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

// Day.js has no es-ar locale, so register Spanish under Django's language code.
dayjs.locale({ ...es, name: 'es-ar' }, null, true);

const language = typeof window !== 'undefined' ? window.app?.config?.lang : 'en';
dayjs.locale('en');
dayjs.locale(language);

export default dayjs;
