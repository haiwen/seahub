import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en-gb';

dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);

export default dayjs;
