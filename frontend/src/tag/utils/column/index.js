import { PRIVATE_COLUMN_KEYS } from '../../constants';

export const getColumnOriginName = (column) => {
  const { key, name } = column;
  if (PRIVATE_COLUMN_KEYS.includes(key)) return key;
  return name;
};
