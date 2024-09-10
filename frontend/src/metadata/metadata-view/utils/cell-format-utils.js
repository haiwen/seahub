import dayjs from 'dayjs';
import {
  CellType,
  getCellValueByColumn,
  getCellValueDisplayString,
} from '../_basic';
import { getColumnOriginName } from './column-utils';

const getAutoTimeDisplayString = (autoTime) => {
  if (!autoTime) {
    return null;
  }
  const date = dayjs(autoTime);
  if (!date.isValid()) return autoTime;
  return date.format('YYYY-MM-DD HH:mm:ss');
};

export const getClientCellValueDisplayString = (record, column, { collaborators = [] } = {}) => {
  const cellValue = getCellValueByColumn(record, column);
  const { type } = column;
  if (type === CellType.CTIME || type === CellType.MTIME) {
    return getAutoTimeDisplayString(cellValue);
  }
  return getCellValueDisplayString(record, column, { collaborators });
};

export const getFormatRecordData = (columns, recordData) => {
  let keyColumnMap = {};
  columns.forEach(column => {
    keyColumnMap[column.key] = column;
  });
  return convertedToRecordData(recordData, keyColumnMap);
};

export const getFormattedRecordsData = (recordsData, columns, excludesColumnTypes) => {
  let keyColumnMap = {};
  columns.forEach(column => {
    keyColumnMap[column.key] = column;
  });
  return recordsData.map(recordData => {
    let formattedRecordsData = convertedToRecordData(recordData, keyColumnMap, excludesColumnTypes);
    if (recordData._id) {
      formattedRecordsData._id = recordData._id;
    }
    if (Object.prototype.hasOwnProperty.call(recordData, '_archived')) {
      formattedRecordsData._archived = recordData._archived ? 'true' : 'false';
    }
    return formattedRecordsData;
  });
};

// { [column.key]: cellValue } -> { [column.name]: cellValue }
// { [option-column.key]: option.id } -> { [option-column.name]: option.name }
function convertedToRecordData(originRecordData, keyColumnMap, excludesColumnTypes = []) {
  if (!originRecordData || !keyColumnMap) {
    return {};
  }
  let recordData = {};
  Object.keys(originRecordData).forEach(key => {
    const column = keyColumnMap[key];
    if (!column) {
      return;
    }

    const { type } = column;
    const colName = getColumnOriginName(column);
    if (excludesColumnTypes && excludesColumnTypes.includes(type)) {
      return;
    }

    let cellValue = originRecordData[key];
    recordData[colName] = cellValue;
    switch (type) {
      case CellType.TEXT: {
        recordData[colName] = typeof cellValue === 'string' ? cellValue.trim() : '';
        break;
      }
      default: {
        break;
      }
    }
  });
  return recordData;
}
