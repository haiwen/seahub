import { PREDEFINED_COLUMN_KEYS } from '../../constants';

const isPredefinedColumn = (column) => {
  if (!column) return false;
  const { key } = column;
  return PREDEFINED_COLUMN_KEYS.includes(key);
};

export {
  isPredefinedColumn,
};
