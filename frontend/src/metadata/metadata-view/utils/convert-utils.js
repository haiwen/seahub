import { CellType, DEFAULT_DATE_FORMAT, generatorCellOption, getCollaboratorsName, getOptionName, getDateDisplayString, PREDEFINED_COLUMN_KEYS } from '../_basic';
import { formatTextToDate } from './date';
import { getFloatNumber, getNumberDisplayString, formatStringToNumber, isNumber } from '../_basic/utils/cell/column/number';

const SUPPORT_PASTE_FROM_COLUMN = {
  [CellType.NUMBER]: [CellType.TEXT, CellType.NUMBER],
};

const reg_chinese_date_format = /(\d{4})年(\d{1,2})月(\d{1,2})日$/;

export function getSelectColumnOptions(column) {
  if (!column || !column.data || !Array.isArray(column.data.options)) {
    return [];
  }
  return column.data.options;
}

function convertCellValue(cellValue, oldCellValue, targetColumn, fromColumn) {
  const { type: fromColumnType, data: fromColumnData } = fromColumn;
  const { type: targetColumnType, data: targetColumnData } = targetColumn;
  switch (targetColumnType) {
    case CellType.CHECKBOX: {
      return convert2Checkbox(cellValue, oldCellValue, fromColumnType);
    }
    case CellType.NUMBER: {
      return convert2Number(cellValue, oldCellValue, fromColumnType, targetColumnData);
    }
    case CellType.DATE: {
      return convert2Date(cellValue, oldCellValue, fromColumnType, fromColumnData, targetColumnData);
    }
    case CellType.SINGLE_SELECT: {
      return convert2SingleSelect(cellValue, oldCellValue, fromColumn, targetColumn);
    }
    case CellType.LONG_TEXT: {
      return convert2LongText(cellValue, oldCellValue, fromColumn);
    }
    case CellType.TEXT: {
      return convert2Text(cellValue, oldCellValue, fromColumn);
    }
    case CellType.COLLABORATOR: {
      return convert2Collaborator(cellValue, oldCellValue, fromColumnType);
    }
    default: {
      return oldCellValue;
    }
  }
}

function convert2Checkbox(cellValue, oldCellValue, fromColumnType) {
  switch (fromColumnType) {
    case CellType.CHECKBOX: {
      if (typeof cellValue === 'boolean') {
        return cellValue;
      }
      return null;
    }
    case CellType.TEXT: {
      if (cellValue && typeof cellValue === 'string' && cellValue.toLocaleLowerCase() === 'true') {
        return true;
      }
      return false;
    }
    case CellType.NUMBER: {
      return cellValue > 0;
    }
    default: {
      return oldCellValue;
    }
  }
}

function convert2Number(cellValue, oldCellValue, fromColumnType, targetColumnData) {
  if (!SUPPORT_PASTE_FROM_COLUMN[CellType.NUMBER].includes(fromColumnType)) {
    return oldCellValue;
  }
  if (cellValue === 0) {
    return cellValue;
  }
  if (!cellValue) {
    return null;
  }

  switch (fromColumnType) {
    case CellType.NUMBER:
    case CellType.RATE:
    case CellType.DURATION: {
      return cellValue;
    }
    case CellType.TEXT: {
      if (cellValue.includes('%')) {
        return getFloatNumber(cellValue, 'percent');
      }
      break;
    }
    default: {
      break;
    }
  }
  const stringCellVal = typeof cellValue === 'string' ? cellValue : cellValue.toString();
  return formatStringToNumber(stringCellVal, targetColumnData);
}

function convert2Date(cellValue, oldCellValue, fromColumnType, fromColumnData, targetColumnData) {
  const currentFormat = targetColumnData?.format || DEFAULT_DATE_FORMAT;
  const fromFormat = fromColumnData?.format || DEFAULT_DATE_FORMAT;
  switch (fromColumnType) {
    case CellType.DATE: {
      const fromTimeIdx = fromFormat.indexOf('HH:mm');
      const currentTimeIdx = currentFormat.indexOf('HH:mm');
      if ((fromTimeIdx > -1 && currentTimeIdx > -1) || fromTimeIdx === currentTimeIdx) {
        return cellValue;
      }
      return formatTextToDate(cellValue, currentFormat);
    }
    case CellType.CTIME:
    case CellType.MTIME: {
      return formatTextToDate(cellValue, currentFormat);
    }
    case CellType.TEXT: {
      if (cellValue.indexOf('年') > -1) {
        const zhCNDate = cellValue.replace(/\s*/g, '');
        if (!reg_chinese_date_format.test(zhCNDate)) {
          return '';
        }
        return formatTextToDate(zhCNDate.replace(reg_chinese_date_format, '$1-$2-$3'), currentFormat);
      }
      return formatTextToDate(cellValue, currentFormat);
    }
    default: {
      return oldCellValue;
    }
  }
}

function convert2SingleSelect(cellValue, oldCellValue, fromColumn, targetColumn) {
  if (!cellValue) {
    return oldCellValue;
  }
  const { type: fromColumnType } = fromColumn;
  let fromOptionName;
  switch (fromColumnType) {
    case CellType.SINGLE_SELECT: {
      const fromOptions = getSelectColumnOptions(fromColumn);
      fromOptionName = getOptionName(fromOptions, cellValue) || '';
      break;
    }
    case CellType.TEXT: {
      fromOptionName = cellValue;
      break;
    }
    default: {
      break;
    }
  }
  if (!fromOptionName) {
    return oldCellValue;
  }

  const currentOptions = getSelectColumnOptions(targetColumn);
  const newOption = generatorCellOption(currentOptions, fromOptionName);
  return PREDEFINED_COLUMN_KEYS.includes(targetColumn.key) ? newOption.id : newOption.name;
}

const LONG_TEXT_LENGTH_LIMIT = 10 * 10000;

export const isLongTextValueExceedLimit = (value) => {
  const { text } = value;
  return text ? text.length >= LONG_TEXT_LENGTH_LIMIT : false;
};

export const getValidLongTextValue = (value) => {
  const newValue = { ...value };
  const { text, preview } = newValue;
  newValue.text = text ? text.slice(0, LONG_TEXT_LENGTH_LIMIT) : '';
  newValue.preview = preview ? preview.slice(0, LONG_TEXT_LENGTH_LIMIT) : '';
  return newValue;
};

function convert2LongText(cellValue, oldCellValue, fromColumn) {
  const { type: fromColumnType, data: fromColumnData } = fromColumn;
  switch (fromColumnType) {
    case CellType.LONG_TEXT: {
      // cell value is a string value from dtable-db
      const value = { text: cellValue };
      if (isLongTextValueExceedLimit(value)) {
        const newValue = getValidLongTextValue(value);
        return newValue.text;
      }
      return cellValue || null;
    }
    case CellType.TEXT: {
      return cellValue || null;
    }
    case CellType.NUMBER: {
      return getNumberDisplayString(cellValue, fromColumnData) || null;
    }
    case CellType.DATE: {
      return getDateDisplayString(cellValue, fromColumnData.format || DEFAULT_DATE_FORMAT) || null;
    }
    default: {
      return oldCellValue;
    }
  }
}

function convert2Text(cellValue, oldCellValue, fromColumn) {
  const { type: fromColumnType, data: fromColumnData } = fromColumn;
  switch (fromColumnType) {
    case CellType.TEXT: {
      if (isNumber(cellValue)) {
        return String(cellValue);
      }
      if (!cellValue) {
        return null;
      }
      if (typeof cellValue === 'string') {
        return cellValue.replace(/\n/g, '').trim();
      }
      return String(cellValue);
    }
    case CellType.URL:
    case CellType.EMAIL:
    case CellType.AUTO_NUMBER: {
      return cellValue;
    }
    case CellType.NUMBER: {
      return getNumberDisplayString(cellValue, fromColumnData);
    }
    case CellType.DATE: {
      return getDateDisplayString(cellValue, fromColumnData.format || DEFAULT_DATE_FORMAT);
    }
    case CellType.SINGLE_SELECT: {
      const options = getSelectColumnOptions(fromColumn);
      return getOptionName(options, cellValue) || null;
    }
    case CellType.COLLABORATOR: {
      const collaborators = window.sfMetadata.collaborators || window.sfMetadataContext.getCollaboratorsFromCache();
      return getCollaboratorsName(collaborators, cellValue);
    }
    case CellType.CREATOR:
    case CellType.LAST_MODIFIER: {
      if (!cellValue) {
        return null;
      }
      const collaborators = window.sfMetadata.collaborators || window.sfMetadataContext.getCollaboratorsFromCache();
      return getCollaboratorsName(collaborators, [cellValue]);
    }
    default: {
      return oldCellValue;
    }
  }
}

function convert2Collaborator(cellValue, oldCellValue, fromColumnType) {
  switch (fromColumnType) {
    case CellType.COLLABORATOR: {
      if (!Array.isArray(cellValue) || cellValue.length === 0) {
        return null;
      }
      const collaborators = window.sfMetadata.collaborators || window.sfMetadataContext.getCollaboratorsFromCache();
      let validEmailMap = {};
      collaborators.forEach(collaborator => validEmailMap[collaborator.email] = true);
      return cellValue.filter(email => !!validEmailMap[email]);
    }
    case CellType.TEXT: {
      if (!cellValue) {
        return oldCellValue;
      }
      const userNames = cellValue.split(',');
      if (userNames.length === 0) {
        return oldCellValue;
      }
      const collaborators = window.sfMetadata.collaborators || window.sfMetadataContext.getCollaboratorsFromCache();
      let nameCollaboratorMap = {};
      collaborators.forEach(collaborator => nameCollaboratorMap[collaborator.name] = collaborator);
      const emails = userNames.map(name => {
        const collaborator = nameCollaboratorMap[name];
        return collaborator ? collaborator.email : null;
      }).filter(Boolean);
      if (emails.length === 0) {
        return oldCellValue;
      }
      return emails;
    }
    case CellType.CREATOR:
    case CellType.LAST_MODIFIER: {
      const collaborators = window.sfMetadata.collaborators || window.sfMetadataContext.getCollaboratorsFromCache();
      let validEmailMap = {};
      collaborators.forEach(collaborator => validEmailMap[collaborator.email] = true);
      if (!cellValue || !validEmailMap[cellValue]) {
        return null;
      }
      return [cellValue];
    }
    default: {
      return oldCellValue;
    }
  }
}

export { convertCellValue };
