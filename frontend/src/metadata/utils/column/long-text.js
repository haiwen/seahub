import { CellType, INPUT_LENGTH_LIMIT } from '../../constants';

export const isLongTextValueExceedLimit = (value) => {
  const limit = INPUT_LENGTH_LIMIT[CellType.LONG_TEXT];
  const { text } = value;
  return text ? text.length >= limit : false;
};

export const getValidLongTextValue = (value) => {
  const limit = INPUT_LENGTH_LIMIT[CellType.LONG_TEXT];
  const newValue = { ...value };
  const { text, preview } = newValue;
  newValue.text = text ? text.slice(0, limit) : '';
  newValue.preview = preview ? preview.slice(0, limit) : '';
  return newValue;
};
