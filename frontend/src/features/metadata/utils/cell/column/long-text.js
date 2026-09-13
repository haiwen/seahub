/**
 * Get text from long-text to display.
 * @param {object} longText e.g. { text, ... }
 * @returns text from long-text, string
 */
const getLongtextDisplayString = (longText) => {
  if (!longText) return '';
  const longTextType = typeof longText;
  if (longTextType === 'string') return longText;
  if (longTextType === 'object') return longText.text || '';
  return '';
};

export {
  getLongtextDisplayString,
};
