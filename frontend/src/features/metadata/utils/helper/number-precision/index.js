/**
 * get digits length of a number
 * @param {number} num Input number
 */
const digitLength = (num) => {
  // Get digit length of e
  const eSplit = num.toString().split(/[eE]/);
  const len = (eSplit[0].split('.')[1] || '').length - +(eSplit[1] || 0);
  return len > 0 ? len : 0;
};

/**
 * fix wrong data
 * e.g. strip(0.09999999999999998) = 0.1
 */
const strip = (num, precision = 15) => +parseFloat(Number(num).toPrecision(precision));

/**
 * convert decimal to integer.
 * Support scientific notation. If it is a decimal, it will be enlarged to an integer
 * @param {number|string} num
 */
const float2Fixed = (num) => {
  if (num.toString().indexOf('e') === -1) {
    return Number(num.toString().replace('.', ''));
  }
  const dLen = digitLength(num);
  return dLen > 0 ? strip(Number(num) * (10 ** dLen)) : Number(num);
};

/**
 * exact multiplication
 */
const times = (numLeft, numRight) => {
  const num1Changed = float2Fixed(numLeft);
  const num2Changed = float2Fixed(numRight);
  const baseNum = digitLength(numLeft) + digitLength(numRight);
  const leftValue = num1Changed * num2Changed;

  return leftValue / (10 ** baseNum);
};

/**
 * exact subtraction
 */
const minus = (numLeft, numRight) => {
  const baseNum = 10 ** Math.max(digitLength(numLeft), digitLength(numRight));
  return (times(numLeft, baseNum) - times(numRight, baseNum)) / baseNum;
};

/**
 * exact division
 */
const divide = (numLeft, numRight) => {
  const num1Changed = float2Fixed(numLeft);
  const num2Changed = float2Fixed(numRight);

  // fix: e.g. 10 ** -4 = 0.00009999999999999999，use 'strip' to fix
  return times(
    num1Changed / num2Changed,
    strip(10 ** (digitLength(numRight) - digitLength(numLeft))),
  );
};

export {
  minus as NPminus,
  divide as NPdivide,
};
