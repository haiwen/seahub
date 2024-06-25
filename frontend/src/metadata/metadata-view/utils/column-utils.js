import {
  CellType,
  DEFAULT_DATE_FORMAT,
} from '../_basic';
import {
  SEQUENCE_COLUMN_WIDTH
} from '../constants';

export function getSelectColumnOptions(column) {
  if (!column || !column.data || !Array.isArray(column.data.options)) {
    return [];
  }
  return column.data.options;
}

export function getDateColumnFormat(column) {
  const format = (column && column.data && column.data.format) ? column.data.format : DEFAULT_DATE_FORMAT;
  // Old Europe format is D/M/YYYY new format is DD/MM/YYYY
  return format;
}

export function isCheckboxColumn(column) {
  let { type } = column;
  return type === CellType.CHECKBOX;
}

export function getColumnByKey(columnKey, columns) {
  if (!columnKey || !Array.isArray(columns)) {
    return null;
  }
  return columns.find(column => column.key === columnKey);
}

export function getColumnByName(columnName, columns) {
  if (!columnName || !Array.isArray(columns)) {
    return null;
  }
  return columns.find(column => column.name === columnName);
}

export function getColumnByType(columnType, columns) {
  if (!columnType || !Array.isArray(columns)) {
    return null;
  }
  return columns.find(column => column.type === columnType);
}

export function getColumnByIndex(index, columns) {
  if (Array.isArray(columns)) {
    return columns[index];
  }
  if (typeof Immutable !== 'undefined') {
    return columns.get(index);
  }
  return null;
}

export const getColumnWidth = (column) => {
  let { type } = column;
  switch (type) {
    case CellType.CTIME:
    case CellType.MTIME: {
      return 160;
    }
    default: {
      return 100;
    }
  }
};

export const isNameColumn = (column) => {
  return column.key === '0000';
};

export const handleCascadeColumn = (optionValue, columnKey, columns, row, updated = {}, processedColumns = new Set()) => {
  // This column has already been processed, avoid circular dependency.
  if (!Array.isArray(columns) || processedColumns.has(columnKey)) {
    return updated;
  }
  processedColumns.add(columnKey);
  const singleSelectColumns = columns.filter(column => column.type === CellType.SINGLE_SELECT);
  for (let i = 0; i < singleSelectColumns.length; i++) {
    const singleSelectColumn = singleSelectColumns[i];
    const { data: { cascade_column_key, cascade_settings } } = singleSelectColumn;
    if (cascade_column_key === columnKey) {
      const { key: childColumnKey } = singleSelectColumn;
      const childColumnOptions = cascade_settings[optionValue];
      const childColumnCellValue = row[childColumnKey];
      const cellValueInOptions = childColumnOptions && childColumnOptions.includes(childColumnCellValue);
      if (!cellValueInOptions) {
        updated[childColumnKey] = '';
        handleCascadeColumn('', childColumnKey, columns, row, updated, processedColumns);
      }
    }
  }
  return updated;
};

export const isFrozen = (column) => {
  if (!column) return false;
  return column.frozen === true;
};

export const findLastFrozenColumnIndex = (columns) => {
  for (let i = 0; i < columns.length; i++) {
    if (isFrozen(columns[i])) {
      return i;
    }
  }
  return -1;
};

export const setColumnOffsets = (columns) => {
  let nextColumns = [];
  let left = 0;
  columns.forEach((column) => {
    nextColumns.push({ ...column, left });
    left += column.width;
  });
  return nextColumns;
};

export function isColumnSupportEdit(cell, columns) {
  const column = columns[cell.idx];
  if (column?.type === CellType.LINK_FORMULA && [CellType.IMAGE, CellType.FILE].includes(column?.data?.array_type)) {
    return true;
  }
  return false;
}

export function isColumnSupportDirectEdit(cell, columns) {
  const column = columns[cell.idx];
  return [].includes(column?.type);
}

const _getCustomColumnsWidth = () => {
  // todo
  return {};
};

export const recalculate = (columns, allColumns, tableId) => {
  const displayColumns = columns;
  const displayAllColumns = allColumns;
  const pageColumnsWidth = _getCustomColumnsWidth(); // get columns width from local storage
  const totalWidth = displayColumns.reduce((total, column) => {
    const key = `${tableId}-${column.key}`;
    const width = pageColumnsWidth[key] || column.width;
    total += width;
    return total;
  }, 0);
  let left = SEQUENCE_COLUMN_WIDTH;
  const frozenColumns = displayColumns.filter(c => isFrozen(c));
  const frozenColumnsWidth = frozenColumns.reduce((w, column) => {
    const key = `${tableId}-${column.key}`;
    const width = pageColumnsWidth[key] || column.width;
    return w + width;
  }, 0);
  const lastFrozenColumnKey = frozenColumnsWidth > 0 ? frozenColumns[frozenColumns.length - 1].key : null;
  const newColumns = displayColumns.map((column, index) => {
    const key = `${tableId}-${column.key}`;
    const width = pageColumnsWidth[key] || column.width;
    column.idx = index; // set column idx
    column.left = left; // set column offset
    column.width = width;
    left += width;
    return column;
  });

  return {
    totalWidth,
    lastFrozenColumnKey,
    frozenColumnsWidth,
    columns: newColumns,
    allColumns: displayAllColumns,
  };
};
