/**
 * Filter checkbox
 * @param {bool} checked
 * @param {bool} filter_term
 * @returns boolean
 */
const checkboxFilter = (checked, { filter_term }) => {
  const filterTerm = filter_term || false;
  const normalizedChecked = typeof checked === 'string' ? checked.toLocaleUpperCase() === 'TRUE' : checked || false;
  return normalizedChecked === filterTerm;
};

export {
  checkboxFilter,
};
