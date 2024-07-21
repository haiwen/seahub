/**
 * Get text from long-text to display.
 * @param {object} longText e.g. { text, ... }
 * @returns text from long-text, string
 */
const getLongtextDisplayString = (longText) => {
  if (!longText) return '';
  return longText.text || '';
};

export {
  getLongtextDisplayString,
};
