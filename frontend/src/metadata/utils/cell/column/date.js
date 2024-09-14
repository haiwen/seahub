import dayjs from 'dayjs';

/**
 * Get formatted date
 * @param {string} date e.g. "2023-07-06 11:30"
 * @param {string} format e.g. "YYYY-MM-DD"
 * @returns formatted date, string
 */
const getDateDisplayString = (date, format) => {
  if (!date || typeof date !== 'string') {
    return '';
  }

  const dateObj = dayjs(date);
  if (!dateObj.isValid()) return date;
  switch (format) {
    case 'D/M/YYYY':
    case 'DD/MM/YYYY': {
      const formatValue = dateObj.format('YYYY-MM-DD');
      const formatValueList = formatValue.split('-');
      return `${formatValueList[2]}/${formatValueList[1]}/${formatValueList[0]}`;
    }
    case 'D/M/YYYY HH:mm':
    case 'DD/MM/YYYY HH:mm': {
      const formatValues = dateObj.format('YYYY-MM-DD HH:mm');
      const formatValuesList = formatValues.split(' ');
      const formatDateList = formatValuesList[0].split('-');
      return `${formatDateList[2]}/${formatDateList[1]}/${formatDateList[0]} ${formatValuesList[1]}`;
    }
    case 'M/D/YYYY':
      return dateObj.format('M/D/YYYY');
    case 'M/D/YYYY HH:mm':
      return dateObj.format('M/D/YYYY HH:mm');
    case 'YYYY-MM-DD':
      return dateObj.format('YYYY-MM-DD');
    case 'YYYY-MM-DD HH:mm':
      return dateObj.format('YYYY-MM-DD HH:mm');
    case 'YYYY-MM-DD HH:mm:ss': {
      return dateObj.format('YYYY-MM-DD HH:mm:ss');
    }
    case 'DD.MM.YYYY':
      return dateObj.format('DD.MM.YYYY');
    case 'DD.MM.YYYY HH:mm':
      return dateObj.format('DD.MM.YYYY HH:mm');
    default:
      // Compatible with older versions: if format is null, use defaultFormat
      return dateObj.format('YYYY-MM-DD');
  }
};

export {
  getDateDisplayString,
};
