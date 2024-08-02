import { DateUtils, CellType, DEFAULT_DATE_FORMAT, getCollaboratorsName, getOptionName, getDateDisplayString, getLongtextDisplayString, getNumberDisplayString } from '../../_basic';

const getCellValueDisplayString = (row, type, key, { data, collaborators = [] } = {}) => {
  if (!row) return '';
  const cellValue = row[key];
  switch (type) {
    case CellType.LONG_TEXT: {
      return getLongtextDisplayString(cellValue);
    }
    case CellType.NUMBER: {
      return getNumberDisplayString(cellValue, data);
    }
    case CellType.SINGLE_SELECT: {
      if (!data) return '';
      const { options } = data;
      return getOptionName(options, cellValue);
    }
    case CellType.DATE: {
      const { format = DEFAULT_DATE_FORMAT } = data || {};
      return getDateDisplayString(cellValue, format);
    }
    case CellType.CTIME:
    case CellType.MTIME: {
      return DateUtils.format(cellValue, 'YYYY-MM-DD HH:MM:SS');
    }
    case CellType.COLLABORATOR: {
      return getCollaboratorsName(collaborators, cellValue);
    }
    case CellType.CREATOR:
    case CellType.LAST_MODIFIER: {
      return cellValue === 'anonymous' ? cellValue : getCollaboratorsName(collaborators, [cellValue]);
    }
    default: {
      if (cellValue || typeof cellValue === 'boolean') {
        return String(cellValue);
      }
      return '';
    }
  }
};

const getCellValueStringResult = (row, column, { collaborators = [] } = {}) => {
  if (!row || !column) return '';
  const { key, type, data } = column;
  let cellValue = row[key];
  switch (type) {
    case CellType.TEXT:
    case CellType.EMAIL:
    case CellType.URL:
    case CellType.AUTO_NUMBER: {
      return cellValue || '';
    }
    case CellType.RATE: { // number
      return cellValue ? String(cellValue) : '';
    }
    case CellType.CHECKBOX: {
      if (typeof cellValue === 'boolean') {
        return String(cellValue);
      }
      return cellValue === 'true' ? 'true' : 'false';
    }
    case CellType.LONG_TEXT: {
      return getLongtextDisplayString(cellValue);
    }
    case CellType.NUMBER: {
      return getNumberDisplayString(cellValue, data);
    }
    case CellType.SINGLE_SELECT: {
      if (!data) return '';
      return getOptionName(data.options, cellValue);
    }
    case CellType.DATE: {
      const { format = DEFAULT_DATE_FORMAT } = data || {};
      // patch: compatible with previous format
      const normalizedFormat = format === 'D/M/YYYY' ? format.replace(/D\/M\/YYYY/, 'DD/MM/YYYY') : format;
      return getDateDisplayString(cellValue, normalizedFormat);
    }
    case CellType.CTIME:
    case CellType.MTIME: {
      return DateUtils.format(cellValue, 'YYYY-MM-DD HH:MM:SS');
    }
    case CellType.COLLABORATOR: {
      return getCollaboratorsName(collaborators, cellValue);
    }
    case CellType.CREATOR:
    case CellType.LAST_MODIFIER: {
      return cellValue === 'anonymous' ? cellValue : getCollaboratorsName(collaborators, [cellValue]);
    }
    default: {
      return cellValue ? String(cellValue) : '';
    }
  }
};

export {
  getCellValueDisplayString,
  getCellValueStringResult,
};
