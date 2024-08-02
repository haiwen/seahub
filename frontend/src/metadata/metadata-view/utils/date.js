import { DateUtils } from '../_basic';
import { getFloatNumber } from '../_basic/utils/cell/column/number';

const formatTextToDate = (text, format = 'YYYY-MM-DD') => {
  if (typeof text !== 'string' || !text.trim()) return null;
  let isAllNumber = /^[0-9]+$/.test(text);
  let dateObj = {};
  if (isAllNumber) {
    dateObj = new Date(getFloatNumber(text));
  } else {
    dateObj = DateUtils.parseDateWithFormat(text, format);
  }
  if (format.indexOf('HH:mm') < 0) {
    return DateUtils.format(dateObj, 'YYYY-MM-DD') || null;
  }
  return DateUtils.format(dateObj, 'YYYY-MM-DD HH:MM') || null;
};

export { formatTextToDate };
