/**
 * @desc Solve the problem of floating calculation, avoid multiple digits after the decimal point and loss of calculation accuracy.
 * example: 3 + 2.4 = 4.699999999999999，1.0 - 0.9 = 0.09999999999999998
 */

/**
 * Correct wrong data
 * strip(0.09999999999999998)=0.1
 */
function strip(num, precision = 12) {
  return +parseFloat(num.toPrecision(precision));
}

/**
 * Return digits length of a number
 * @param {*number} num Input number
 */
function digitLength(num) {
  // Get digit length of e
  const eSplit = num.toString().split(/[eE]/);
  const len = (eSplit[0].split('.')[1] || '').length - (+(eSplit[1] || 0));
  return len > 0 ? len : 0;
}

/**
 * Convert decimals to integers and support scientific notation. If it is a decimal, it is enlarged to an integer
 * @param {*number} num Number of inputs
 */
function float2Fixed(num) {
  if (num.toString().indexOf('e') === -1) {
    return Number(num.toString().replace('.', ''));
  }
  const dLen = digitLength(num);
  return dLen > 0 ? strip(num * Math.pow(10, dLen)) : num;
}

/**
 * Check whether the number is out of range, and give a prompt if it is out of range
 * @param {*number} num Number of inputs
 */
function checkBoundary(num) {
  if (_boundaryCheckingState) {
    if (num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) {
      // eslint-disable-next-line no-console
      console.warn(`${num} is beyond boundary when transfer to integer, the results may not be accurate`);
    }
  }
}

/**
 * Exact multiplication
 */
function times(num1, num2, ...others) {
  if (others.length > 0) {
    return times(times(num1, num2), others[0], ...others.slice(1));
  }
  const num1Changed = float2Fixed(num1);
  const num2Changed = float2Fixed(num2);
  const baseNum = digitLength(num1) + digitLength(num2);
  const leftValue = num1Changed * num2Changed;

  checkBoundary(leftValue);

  return leftValue / Math.pow(10, baseNum);
}

/**
 * Exact addition
 */
function plus(num1, num2, ...others) {
  if (others.length > 0) {
    return plus(plus(num1, num2), others[0], ...others.slice(1));
  }
  const baseNum = Math.pow(10, Math.max(digitLength(num1), digitLength(num2)));
  return (times(num1, baseNum) + times(num2, baseNum)) / baseNum;
}

/**
 * Exact subtraction
 */
function minus(num1, num2, ...others) {
  if (others.length > 0) {
    return minus(minus(num1, num2), others[0], ...others.slice(1));
  }
  const baseNum = Math.pow(10, Math.max(digitLength(num1), digitLength(num2)));
  return (times(num1, baseNum) - times(num2, baseNum)) / baseNum;
}

/**
 * Exact division
 */
function divide(num1, num2, ...others) {
  if (others.length > 0) {
    return divide(divide(num1, num2), others[0], ...others.slice(1));
  }
  const num1Changed = float2Fixed(num1);
  const num2Changed = float2Fixed(num2);
  checkBoundary(num1Changed);
  checkBoundary(num2Changed);
  // fix: Similar to 10 ** -4 is 0.00009999999999999999, strip correction
  return times((num1Changed / num2Changed), strip(Math.pow(10, digitLength(num2) - digitLength(num1))));
}

/**
 * rounding
 */
function round(num, ratio) {
  const base = Math.pow(10, ratio);
  return divide(Math.round(times(num, base)), base);
}

let _boundaryCheckingState = true;
/**
 * Whether to perform boundary check, default true
 * @param flag Mark switch, true is on, false is off, default is true
 */
function enableBoundaryChecking(flag = true) {
  _boundaryCheckingState = flag;
}
export { strip, plus, minus, times, divide, round, digitLength, float2Fixed, enableBoundaryChecking };
export default { strip, plus, minus, times, divide, round, digitLength, float2Fixed, enableBoundaryChecking };

