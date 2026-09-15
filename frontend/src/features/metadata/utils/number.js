import { NPdivide } from './helper/number-precision';

/**
 * Check whether is number
 * @param {number} number
 * @returns boolean
 */
const isNumber = (number) => (number || number === 0) && Object.prototype.toString.call(number) === '[object Number]';

/**
 * Check whether the numbers is equal
 * Two numbers are considered equal if the absolute value of their difference is less than 0.00001
 * @param {number} leftNumber
 * @param {number} rightNumber
 * @returns bool
 */
const isNumberEqual = (leftNumber, rightNumber) => (
  leftNumber === rightNumber || Math.abs(leftNumber - rightNumber) < 0.00001
);

/**
 * Math.round(number) with digits
 * @param {number} number
 * @param {number} decimalDigits, default as 0
 * @returns number
 */
const round = (number, decimalDigits = 0) => {
  if (decimalDigits === 0) {
    return Math.round(number);
  }
  const offsets = 10 ** decimalDigits;
  let fixedNum = number * offsets;
  if (decimalDigits > 0) {
    // unexpected precision problem
    // e.g. round(8330.845, 2): 8330.845 * 100 = 833084.4999999999
    fixedNum = Number.parseFloat(fixedNum.toFixed(1));
  }
  return Math.round(fixedNum) / offsets;
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

export {
  isNumber,
  isNumberEqual,
  round,
  getFloatNumber
};
