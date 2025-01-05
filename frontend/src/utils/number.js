/**
 * Check whether is number
 * @param {number} number
 * @returns boolean
 */
export const isNumber = (number) => (number || number === 0) && Object.prototype.toString.call(number) === '[object Number]';
