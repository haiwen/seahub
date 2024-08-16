import {
  CellType, isRegExpression, getColumnByKey, getColumnByName
} from '../../../_basic';
import { COMMON_FORM_FIELD_TYPE, TEXT_FORM_FIELD, NUMBER_FORM_FIELD } from './constants';

const _validateColumnName = ({ columnName, oldColumn, metadata, gettext }) => {
  if (!columnName) return { type: COMMON_FORM_FIELD_TYPE.COLUMN_NAME, tips: gettext('This is required') };
  if (columnName.includes('.')) {
    return {
      type: COMMON_FORM_FIELD_TYPE.COLUMN_NAME,
      tips: gettext('Name cannot contain dots'),
    };
  }
  if (columnName.includes('`')) {
    return {
      type: COMMON_FORM_FIELD_TYPE.COLUMN_NAME,
      tips: gettext('Name cannot contain backtick'),
    };
  }
  if (columnName.includes('{') || columnName.includes('}')) {
    return {
      type: COMMON_FORM_FIELD_TYPE.COLUMN_NAME,
      tips: gettext('Name cannot contain curly braces'),
    };
  }
  if (
    (!oldColumn || (oldColumn && oldColumn.name !== columnName)) &&
    getColumnByName(metadata.columns, columnName)
  ) {
    return {
      type: COMMON_FORM_FIELD_TYPE.COLUMN_NAME,
      tips: gettext('There is another property with this name'),
    };
  }
  return null;
};

const _validateColumnType = ({ column, metadata, gettext }) => {
  if (column.unique && getColumnByKey(metadata.columns, column.key)) {
    return {
      type: COMMON_FORM_FIELD_TYPE.COLUMN_TYPE,
      tips: gettext('Another property has this property type'),
    };
  }
  return null;
};

const _validateTextFormField = ({ column, gettext }) => {
  const { format_specification_value, format_check_type } = column;
  if (format_check_type === 'custom_format' && format_specification_value) {
    if (!isRegExpression(format_specification_value)) {
      return {
        type: TEXT_FORM_FIELD.CUSTOM_REGULAR,
        tips: gettext('Invalid regular expression'),
      };
    }
  }
  return null;
};

const _validateNumberFormField = ({ column, gettext }) => {
  const { format, currency_symbol } = column;
  if (format === 'custom_currency' && !currency_symbol) {
    return {
      type: NUMBER_FORM_FIELD.CUSTOM_CURRENCY,
      tips: gettext('This is required'),
    };
  }
  return null;
};

export const ValidateColumnFormFields = {
  [COMMON_FORM_FIELD_TYPE.COLUMN_NAME]: _validateColumnName,
  [COMMON_FORM_FIELD_TYPE.COLUMN_TYPE]: _validateColumnType,
  [CellType.TEXT]: _validateTextFormField,
  [CellType.NUMBER]: _validateNumberFormField,
};

export const getFieldErrorTips = (fieldError, fieldType) => {
  const tips = fieldError && fieldError[fieldType];
  return tips || null;
};

export const calculateWrapperScrollTopAtErrField = (errorField, wrapper) => {
  const { top: errFieldTop, height: errorFieldHeight } = errorField.getBoundingClientRect();
  const { top: wrapperTop, height: wrapperHeight } = wrapper.getBoundingClientRect();
  const wrapperScrollTop = wrapper.scrollTop;
  const wrapperScrollHeight = wrapper.scrollHeight;

  // with none scroll
  if (Math.round(wrapperHeight) === Math.round(wrapperScrollHeight)) {
    return null;
  }

  if (errFieldTop < wrapperTop) {
    const newScrollTop = wrapperScrollTop - (wrapperTop - errFieldTop) - 8; // 8px: half of field wrapper padding
    return newScrollTop > 0 ? newScrollTop : 0;
  }
  if (errFieldTop > wrapperTop + wrapperHeight) {
    const maxScrollTop = wrapperScrollHeight - wrapperHeight;
    const newScrollTop = wrapperScrollTop + (errFieldTop + errorFieldHeight + 8 - wrapperTop - wrapperHeight);
    return newScrollTop > maxScrollTop ? maxScrollTop : newScrollTop;
  }
  return null; // visible: not changed
};
