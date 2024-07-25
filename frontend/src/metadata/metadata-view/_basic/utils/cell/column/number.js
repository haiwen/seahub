import { NPminus, NPdivide } from '../../helper/number-precision';
import { round } from '../../number';
import { DEFAULT_NUMBER_FORMAT } from '../../../constants/column';
import { DISPLAY_INTERNAL_ERRORS } from '../../../constants';

const separatorMap = {
  comma: ',',
  dot: '.',
  no: '',
  space: ' ',
};

const _getDecimalDigits = (number) => {
  if (Number.isInteger(number)) {
    return 0;
  }
  const valueArr = String(number).split('.');
  const digitsLength = valueArr[1] ? valueArr[1].length : 8;
  return digitsLength > 8 ? 8 : digitsLength;
};

/**
 * Get fixed number by precision
 * @param {number} number
 * @param {object} formats e.g. { enable_precision, precision, ... }
 * @returns fixed number, string
 */
const getPrecisionNumber = (number, formats) => {
  const { precision = 2, enable_precision = false } = formats || {};
  const type = Object.prototype.toString.call(number);
  if (type !== '[object Number]') {
    if (type === '[object String]' && DISPLAY_INTERNAL_ERRORS.includes(number)) {
      return number;
    }
    return null;
  }
  const decimalDigits = enable_precision ? precision : _getDecimalDigits(number);
  return number.toFixed(decimalDigits);
};

/**
 * removeZerosFromEnd('0.0100') // '0.01'
 * @param {string} sNumber string of numbers
 */
const removeZerosFromEnd = (sNumber) => {
  if (typeof sNumber !== 'string') return '';
  if (sNumber.endsWith('0')) {
    return sNumber.replace(/(?:\.0*|(\.\d+?)0+)$/, '$1');
  }
  return sNumber;
};

/**
 * e.g. 1.23 // 2
 * @param {number} number
 * @returns digital length
 */
const getDecimalDigitsFromNumber = (number) => {
  if (Number.isInteger(number)) {
    return 0;
  }
  const decimalPart = String(number).split('.')[1];
  const digitsLength = decimalPart ? decimalPart.length : 8;
  return digitsLength > 8 ? 8 : digitsLength;
};

const toThousands = (number, { formats, isCurrency = true }) => {
  const {
    decimal = 'dot', thousands = 'no', precision = 2, enable_precision = false,
  } = formats || {};

  // handle numbers in scientific notation
  if (String(number).includes('e')) {
    if (number < 1 && number > -1) {
      // 1.convert to non-scientific number
      let numericString = number.toFixed(enable_precision ? precision : 8);

      // 2.remove 0 from end of the number which not set precision. e.g. 0.100000
      if (!enable_precision) {
        numericString = removeZerosFromEnd(numericString);
      }

      // 3.remove minus from number which equal to 0. e.g. '-0.00'
      if (parseFloat(numericString) === 0) {
        return numericString.startsWith('-') ? numericString.substring(1) : numericString;
      }
      return numericString;
    }
    return String(number);
  }

  const decimalString = separatorMap[decimal];
  const thousandsString = separatorMap[thousands];
  const decimalDigits = enable_precision ? precision : getDecimalDigitsFromNumber(number);
  const floatNumber = parseFloat(round(number, decimalDigits).toFixed(decimalDigits));
  const isMinus = floatNumber < 0;
  let integer = Math.trunc(floatNumber);

  // format decimal part
  let decimalPart = String(Math.abs(NPminus(floatNumber, integer)).toFixed(decimalDigits)).slice(1);
  if (!enable_precision) {
    decimalPart = removeZerosFromEnd(decimalPart);
  }

  if (isCurrency) {
    if (!enable_precision) {
      decimalPart = decimalPart.length === 2
        ? decimalPart = decimalPart.padEnd(3, '0')
        : (decimalPart.substring(0, 3) || '.').padEnd(3, '0');
    }
  }
  decimalPart = decimalPart.replace(/./, decimalString);

  // format integer part
  const integerNumbers = [];
  let counter = 0;
  integer = Math.abs(integer).toString();
  for (let i = integer.length - 1; i > -1; i--) {
    counter += 1;
    integerNumbers.unshift(integer[i]);
    if (!(counter % 3) && i !== 0) {
      integerNumbers.unshift(thousandsString);
    }
  }

  return `${isMinus ? '-' : ''}${integerNumbers.join('')}${decimalPart}`;
};

/**
 * Get formatted number
 * @param {number} number e.g. 123
 * @param {object} formats e.g. { format: 'number', decimal: 'dot', ... }
 * @returns formatted number, string
 */
const getNumberDisplayString = (number, formats) => {
  const type = Object.prototype.toString.call(number);
  if (type !== '[object Number]') {
    // return formula internal errors directly.
    if (type === '[object String]' && number.startsWith('#')) {
      return number;
    }
    return '';
  }

  if (isNaN(number) || number === Infinity || number === -Infinity) return String(number);

  // formats: old version maybe 'null'
  const { format = DEFAULT_NUMBER_FORMAT } = formats || {};
  switch (format) {
    case 'number': {
      return toThousands(number, { formats, isCurrency: false });
    }
    case 'percent': {
      return `${toThousands(Number.parseFloat((number * 100).toFixed(8)), { formats, isCurrency: false })}%`;
    }
    case 'yuan': {
      return `￥${toThousands(number, { formats })}`;
    }
    case 'dollar': {
      return `$${toThousands(number, { formats })}`;
    }
    case 'euro': {
      return `€${toThousands(number, { formats })}`;
    }
    case 'custom_currency': {
      if (formats.currency_symbol_position === 'after') {
        return `${toThousands(number, { formats })}${formats.currency_symbol || ''}`;
      }
      return `${formats.currency_symbol || ''}${toThousands(number, { formats })}`;
    }
    default: {
      return String(number);
    }
  }
};

/**
 * Remove illegal characters
 * @param {string} sNum e.g. "1。23"
 * @param {string} format e.g. "number"
 * @param {string} currencySymbol custom symbol
 * @returns legal characters, string
 */
const replaceNumberNotAllowInput = (sNum, format, currencySymbol) => {
  if (!sNum) {
    return '';
  }
  const fixedSNum = sNum.replace(/。/g, '.');
  switch (format) {
    case 'percent': {
      return fixedSNum.replace(/[^.-\d,%]/g, '');
    }
    case 'yuan': {
      return fixedSNum.replace(/[^.-\d¥￥,]/g, '');
    }
    case 'dollar': {
      return fixedSNum.replace(/[^.-\d$,]/g, '');
    }
    case 'euro': {
      return fixedSNum.replace(/[^.-\d€,]/g, '');
    }
    case 'custom_currency': {
      const reg = new RegExp('[^.-\\d' + currencySymbol + ',]', 'g');
      return fixedSNum.replace(reg, '');
    }
    default: {
      // default as number format
      return fixedSNum.replace(/[^.-\d,]/g, '');
    }
  }
};

/**
 * @param {string} sNumber e.g. '1.23'
 * @param {string} format e.g. 'percent'
 * @returns float number from string. e.g. '1.23' = 1.23
 */
const getFloatNumber = (sNumber, format) => {
  if (!sNumber && sNumber !== 0) {
    return null;
  }
  if (typeof sNumber === 'number') return sNumber;
  if (typeof sNumber !== 'string') return null;
  const parsedNum = parseFloat(sNumber.replace(/[^.-\d]/g, ''));
  if (format === 'percent' && !isNaN(parsedNum)) {
    return NPdivide(parsedNum, 100);
  }
  return isNaN(parsedNum) ? null : parsedNum;
};

/**
 * parse string to number depend on formats
 * @param {string} sNum e.g. '1.23'
 * @param {object} formats { format, decimal, ... }
 * @returns parsed number
 */
const formatStringToNumber = (sNum, formats) => {
  const {
    format, decimal, thousands, enable_precision, precision,
  } = formats || {};
  let value = sNum;
  if (decimal && thousands && decimal === 'comma') {
    if (thousands === 'dot') {
      value = value.replace(/,/, '@');
      value = value.replace(/\./g, ',');
      value = value.replace(/@/, '.');
    } else {
      value = value.replace(/\./g, '');
      value = value.replace(/,/, '.');
    }
  }
  value = getFloatNumber(value, format);
  if (enable_precision && value) {
    const fixedPrecision = format === 'percent' ? precision + 2 : precision;
    value = parseFloat(round(value, fixedPrecision).toFixed(fixedPrecision));
  }
  return value;
};

const formatTextToNumber = (value) => {
  if (typeof value === 'number') {
    return value;
  }
  if (!value || !value.trim()) {
    return null;
  }
  let newValue = value.trim();
  let isIncludePercent = String(newValue).indexOf('%') > -1;
  let newData = parseFloat(newValue.replace(/[^.-\d]/g, ''));
  if (isIncludePercent && !isNaN(newData)) {
    return newData / 100;
  }
  return isNaN(newData) ? null : newData;
};

export {
  getPrecisionNumber,
  getNumberDisplayString,
  replaceNumberNotAllowInput,
  formatStringToNumber,
  formatTextToNumber,
};
