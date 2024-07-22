import dayjs from 'dayjs';
import {
  CellType,
} from '../_basic';

const getAutoTimeDisplayString = (autoTime) => {
  if (!autoTime) {
    return null;
  }
  const date = dayjs(autoTime);
  if (!date.isValid()) return autoTime;
  return date.format('YYYY-MM-DD HH:mm:ss');
};

export const getClientCellValueDisplayString = (row, type, key, { data, collaborators = [] } = {}) => {
  const cellValue = row[key];
  if (type === CellType.CTIME || type === CellType.MTIME) {
    return getAutoTimeDisplayString(cellValue);
  }
  return row[key];
};

export const getFormatRowData = (columns, rowData) => {
  let keyColumnMap = {};
  columns.forEach(column => {
    keyColumnMap[column.key] = column;
  });
  return convertedToRecordData(rowData, keyColumnMap);
};

export const getFormattedRowsData = (rowsData, columns, excludesColumnTypes) => {
  let keyColumnMap = {};
  columns.forEach(column => {
    keyColumnMap[column.key] = column;
  });
  return rowsData.map(rowData => {
    let formattedRowsData = convertedToRecordData(rowData, keyColumnMap, excludesColumnTypes);
    if (rowData._id) {
      formattedRowsData._id = rowData._id;
    }
    if (Object.prototype.hasOwnProperty.call(rowData, '_archived')) {
      formattedRowsData._archived = rowData._archived ? 'true' : 'false';
    }
    return formattedRowsData;
  });
};

// { [column.key]: cellValue } -> { [column.name]: cellValue }
// { [option-column.key]: option.id } -> { [option-column.name]: option.name }
function convertedToRecordData(rowData, keyColumnMap, excludesColumnTypes = []) {
  if (!rowData || !keyColumnMap) {
    return {};
  }
  let recordData = {};
  Object.keys(rowData).forEach(key => {
    const column = keyColumnMap[key];
    if (!column) {
      return;
    }

    const { name: colName, type } = column;
    if (excludesColumnTypes && excludesColumnTypes.includes(type)) {
      return;
    }

    let cellValue = rowData[key];
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
