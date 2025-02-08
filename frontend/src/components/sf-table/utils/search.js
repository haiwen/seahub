const escapeRegExp = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[.\\[\]{}()|^$?*+]/g, '\\$&');
};

export const getSearchRule = (value) => {
  if (typeof value !== 'string') {
    return false;
  }
  let searchRule = value;
  searchRule = searchRule.trim();
  if (searchRule.length === 0) {
    return false;
  }
  // i: search value uppercase and lowercase are not sensitive
  return new RegExp(escapeRegExp(searchRule), 'i');
};

export const checkHasSearchResult = (searchResult) => {
  const { matchedCells } = searchResult || {};
  return Array.isArray(matchedCells) ? matchedCells.length > 0 : false;
};
