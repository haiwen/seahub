import {
  getDateDisplayString, getNumberDisplayString, formatStringToNumber, getOptionName, getCollaboratorsName, getFloatNumber, getColumnOptionNamesByIds,
  getOption, checkIsPredefinedOption, getColumnOptionNameById,
  getTagsDisplayString,
} from '../../../utils/cell';
import { getColumnOptions, generatorCellOption, generatorCellOptions, isLongTextValueExceedLimit, getValidLongTextValue } from '../../../utils/column';
import { isNumber } from '../../../utils/number';
import { formatTextToDate } from '../../../utils/date';
import { CellType, DEFAULT_DATE_FORMAT } from '../../../constants';
import { COLUMN_DATA_OPERATION_TYPE } from '../../../store/operations';

const SUPPORT_PASTE_FROM_COLUMN = {
  [CellType.MULTIPLE_SELECT]: [CellType.MULTIPLE_SELECT, CellType.TEXT, CellType.SINGLE_SELECT],
  [CellType.NUMBER]: [CellType.TEXT, CellType.NUMBER, CellType.RATE],
};

const reg_chinese_date_format = /(\d{4})年(\d{1,2})月(\d{1,2})日$/;

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
  if (!SUPPORT_PASTE_FROM_COLUMN[CellType.NUMBER].includes(fromColumnType)) return oldCellValue;
  if (cellValue === 0) return cellValue;
  if (!cellValue) return null;

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
  switch (fromColumnType) {
    case CellType.DATE: {
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

function convert2SingleSelect(cellValue, oldCellValue, fromColumn, targetColumn, api) {
  if (!cellValue) return null;
  const { type: fromColumnType, key: fromColumnKey } = fromColumn;
  const { key: targetColumnKey } = targetColumn;
  if (fromColumnKey === targetColumnKey) return cellValue;

  let fromOptionName;
  switch (fromColumnType) {
    case CellType.SINGLE_SELECT: {
      const fromOptions = getColumnOptions(fromColumn);
      fromOptionName = getOptionName(fromOptions, cellValue) || '';
      break;
    }
    case CellType.MULTIPLE_SELECT: {
      const copiedOptions = getColumnOptions(fromColumn);
      const copiedCellVal = cellValue[0];
      fromOptionName = getOptionName(copiedOptions, copiedCellVal) || '';
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
  if (!fromOptionName) return oldCellValue;
  const currentOptions = getColumnOptions(targetColumn);
  const option = getOption(currentOptions, fromOptionName);
  if (option) {
    if (checkIsPredefinedOption(option)) return option.id;
    return option.name;
  }
  const newOption = generatorCellOption(currentOptions, fromOptionName);
  api.modifyColumnData(
    targetColumnKey,
    { options: [...currentOptions, newOption] },
    targetColumn.data,
    { optionModifyType: COLUMN_DATA_OPERATION_TYPE.ADD_OPTION }
  );
  if (checkIsPredefinedOption(newOption)) return newOption.id;
  return newOption.name;
}

function convert2LongText(cellValue, oldCellValue, fromColumn) {
  const { type: fromColumnType, data: fromColumnData } = fromColumn;
  switch (fromColumnType) {
    case CellType.LONG_TEXT: {
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
      const options = getColumnOptions(fromColumn);
      return getOptionName(options, cellValue) || null;
    }
    case CellType.COLLABORATOR: {
      const collaborators = window.sfMetadata.getCollaborators();
      return getCollaboratorsName(collaborators, cellValue);
    }
    case CellType.CREATOR:
    case CellType.LAST_MODIFIER: {
      if (!cellValue) {
        return null;
      }
      const collaborators = window.sfMetadata.getCollaborators();
      return getCollaboratorsName(collaborators, [cellValue]);
    }
    case CellType.TAGS: {
      if (!Array.isArray(cellValue) || cellValue.length === 0) return null;
      const tagsData = window?.sfTagsDataStore?.data || {};
      return getTagsDisplayString(tagsData, cellValue);
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
      const collaborators = window.sfMetadata.getCollaborators();
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
      const collaborators = window.sfMetadata.getCollaborators();
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
      const collaborators = window.sfMetadata.getCollaborators();
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

// copiedCellVal, pasteCellVal
const convert2Rate = (cellValue, oldCellValue, fromColumn, targetColumn) => {
  const { type: fromColumnType } = fromColumn;
  if (cellValue === '' || [CellType.TEXT, CellType.NUMBER, CellType.RATE].includes(fromColumnType)) {
    if (cellValue === 0) return 0;
    if (!cellValue) return null;
    let copiedDateFormat = fromColumnType === CellType.NUMBER ? fromColumn?.data?.format : null;
    if (copiedDateFormat === 'percent') {
      cellValue *= 100;
    }
    const newCellVal = getFloatNumber(cellValue.toString(), copiedDateFormat);
    if (newCellVal > 0) {
      const { max = 5 } = targetColumn.data;
      const pasteCellVal = Number(newCellVal.toFixed(0));
      return pasteCellVal < max ? pasteCellVal : max;
    }
    return null;
  }
  return null;
};

const _getPasteMultipleSelect = (copiedCellVal, pasteCellVal, copiedColumn, pasteColumn) => {
  const { type: copiedColumnType, key: copiedColumnKey } = copiedColumn;
  const { key: pasteColumnKey } = pasteColumn;
  if (!copiedCellVal || (Array.isArray(copiedCellVal) && copiedCellVal.length === 0)) {
    return { selectedOptionIds: [] };
  }
  if (!SUPPORT_PASTE_FROM_COLUMN[CellType.MULTIPLE_SELECT].includes(copiedColumnType)) {
    return { selectedOptionIds: pasteCellVal };
  }
  if (pasteColumnKey === copiedColumnKey) return { selectedOptionIds: copiedCellVal };
  let copiedOptionNames = [];
  if (copiedColumnType === CellType.MULTIPLE_SELECT) {
    const copiedOptions = getColumnOptions(copiedColumn);
    copiedOptionNames = copiedOptions.filter((option) => copiedCellVal.includes(option.id) || copiedCellVal.includes(option.name))
      .map((option) => option.name);
  } else if (copiedColumnType === CellType.TEXT) {
    const sCopiedCellVal = String(copiedCellVal);

    // Pass excel test, wps test failed
    copiedOptionNames = sCopiedCellVal.split('\n');

    // get option names from string like 'a, b, c'
    if (copiedOptionNames.length === 1) {
      copiedOptionNames = sCopiedCellVal.split(',');
    }
    copiedOptionNames = copiedOptionNames.map(name => name.trim())
      .filter(name => name !== '');
  } else if (copiedColumnType === CellType.SINGLE_SELECT) {
    const copiedOptionName = getColumnOptionNameById(copiedColumn, copiedCellVal);
    copiedOptionNames = copiedOptionName ? [copiedOptionName] : [];
  }

  if (copiedOptionNames.length === 0) {
    return { selectedOptionIds: pasteCellVal };
  }

  const pasteOptions = getColumnOptions(pasteColumn);
  const { cellOptions: newCellOptions, selectedOptionIds } = generatorCellOptions(pasteOptions, copiedOptionNames);
  return { pasteOptions, newCellOptions, selectedOptionIds };
};

const convert2MultipleSelect = (copiedCellVal, pasteCellVal, copiedColumn, pasteColumn, api) => {
  const { newCellOptions, pasteOptions, selectedOptionIds } = _getPasteMultipleSelect(copiedCellVal, pasteCellVal, copiedColumn, pasteColumn);
  let newColumn = pasteColumn;

  // the target column have no options with the same name
  if (newCellOptions && newCellOptions.length > 0) {
    if (!window.sfMetadataContext.canModifyColumnData(pasteColumn)) return null;
    const updatedPasteOptions = [...pasteOptions, ...newCellOptions];
    if (!newColumn.data) {
      newColumn.data = {};
    }
    newColumn.data.options = updatedPasteOptions;
    api.modifyColumnData(pasteColumn.key, { options: updatedPasteOptions }, pasteColumn.data, { optionModifyType: COLUMN_DATA_OPERATION_TYPE.ADD_OPTION });
  }
  return getColumnOptionNamesByIds(newColumn, selectedOptionIds);
};

const convert2Tags = (cellValue, oldCellValue, fromColumn, targetColumn, api) => {
  const { key: copiedColumnKey } = fromColumn;
  const { key: pasteColumnKey } = targetColumn;
  if (copiedColumnKey === pasteColumnKey) return cellValue;
  return;
};

function convertCellValue(cellValue, oldCellValue, targetColumn, fromColumn, api) {
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
      return convert2SingleSelect(cellValue, oldCellValue, fromColumn, targetColumn, api);
    }
    case CellType.MULTIPLE_SELECT: {
      return convert2MultipleSelect(cellValue, oldCellValue, fromColumn, targetColumn, api);
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
    case CellType.RATE: {
      return convert2Rate(cellValue, oldCellValue, fromColumn, targetColumn);
    }
    case CellType.TAGS: {
      return convert2Tags(cellValue, oldCellValue, fromColumn, targetColumn, api);
    }
    default: {
      return oldCellValue;
    }
  }
}

export { convertCellValue };
