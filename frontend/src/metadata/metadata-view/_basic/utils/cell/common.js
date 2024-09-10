import { CellType, DEFAULT_DATE_FORMAT } from '../../constants';
import { getCollaboratorsName, getOptionName, getDateDisplayString, getLongtextDisplayString, getNumberDisplayString,
  getGeolocationDisplayString, getColumnOptionIdsByNames, getColumnOptionNamesByIds
} from './column';
import DateUtils from '../date';
import { getCellValueByColumn } from './core';
import { getColumnOptions } from '../column';

export const getCellValueDisplayString = (row, column, { collaborators = [] } = {}) => {
  if (!row) return '';
  const { type, data } = column;
  const cellValue = getCellValueByColumn(row, column);
  switch (type) {
    case CellType.LONG_TEXT: {
      return getLongtextDisplayString(cellValue);
    }
    case CellType.NUMBER: {
      return getNumberDisplayString(cellValue, data);
    }
    case CellType.SINGLE_SELECT: {
      const options = getColumnOptions(column);
      if (!Array.isArray(options) || options.length === 0) return '';
      return getOptionName(options, cellValue);
    }
    case CellType.MULTIPLE_SELECT: {
      const options = getColumnOptions(column);
      if (!Array.isArray(options) || options.length === 0) return '';
      const optionIds = getColumnOptionIdsByNames(column, cellValue);
      return getColumnOptionNamesByIds(column, optionIds).join(', ');
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
    case CellType.GEOLOCATION: {
      return getGeolocationDisplayString(cellValue, data, { isBaiduMap: true, hyphen: ' ' });
    }
    default: {
      if (cellValue || typeof cellValue === 'boolean') {
        return String(cellValue);
      }
      return '';
    }
  }
};

export const getCellValueStringResult = (record, column, { collaborators = [] } = {}) => {
  if (!record || !column) return '';
  const { type, data } = column;
  let cellValue = getCellValueByColumn(record, column);
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
      const options = getColumnOptions(column);
      if (!Array.isArray(options) || options.length === 0) return '';
      return getOptionName(options, cellValue);
    }
    case CellType.MULTIPLE_SELECT: {
      const options = getColumnOptions(column);
      if (!Array.isArray(options) || options.length === 0) return '';
      const optionIds = getColumnOptionIdsByNames(column, cellValue);
      return getColumnOptionNamesByIds(column, optionIds).join(', ');
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
    case CellType.GEOLOCATION: {
      return getGeolocationDisplayString(cellValue, data, { isBaiduMap: true, hyphen: ' ' });
    }
    default: {
      return cellValue ? String(cellValue) : '';
    }
  }
};
