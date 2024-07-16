import {
  CellType,
  DEFAULT_DATE_FORMAT,
  PRIVATE_COLUMN_KEY,
  NOT_DISPLAY_COLUMN_KEYS,
} from '../_basic';
import {
  SEQUENCE_COLUMN_WIDTH
} from '../constants';
import {
  gettext
} from '../../../utils/constants';

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
  if (column.type === CellType.FILE_NAME) return true;
  return false;
}

export function isColumnSupportDirectEdit(cell, columns) {
  const column = columns[cell.idx];
  return [CellType.CHECKBOX].includes(column?.type);
}

const _getCustomColumnsWidth = () => {
  return window.sfMetadataContext.localStorage.getItem('columns_width') || {};
};

export const recalculate = (columns, allColumns) => {
  const displayColumns = columns;
  const displayAllColumns = allColumns;
  const pageColumnsWidth = _getCustomColumnsWidth(); // get columns width from local storage
  const totalWidth = displayColumns.reduce((total, column) => {
    const width = pageColumnsWidth[column.key] || column.width;
    total += width;
    return total;
  }, 0);
  let left = SEQUENCE_COLUMN_WIDTH;
  const frozenColumns = displayColumns.filter(c => isFrozen(c));
  const frozenColumnsWidth = frozenColumns.reduce((w, column) => {
    const width = pageColumnsWidth[column.key] || column.width;
    return w + width;
  }, 0);
  const lastFrozenColumnKey = frozenColumnsWidth > 0 ? frozenColumns[frozenColumns.length - 1].key : null;
  const newColumns = displayColumns.map((column, index) => {
    const width = pageColumnsWidth[column.key] || column.width;
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

export const getColumnName = (key, name) => {
  switch (key) {
    case PRIVATE_COLUMN_KEY.CTIME:
    case PRIVATE_COLUMN_KEY.FILE_CTIME:
      return gettext('Created time');
    case PRIVATE_COLUMN_KEY.MTIME:
    case PRIVATE_COLUMN_KEY.FILE_MTIME:
      return gettext('Last modified time');
    case PRIVATE_COLUMN_KEY.CREATOR:
    case PRIVATE_COLUMN_KEY.FILE_CREATOR:
      return gettext('Creator');
    case PRIVATE_COLUMN_KEY.LAST_MODIFIER:
    case PRIVATE_COLUMN_KEY.FILE_MODIFIER:
      return gettext('Last modifier');
    case PRIVATE_COLUMN_KEY.IS_DIR:
      return gettext('Is folder');
    case PRIVATE_COLUMN_KEY.PARENT_DIR:
      return gettext('Parent folder');
    case PRIVATE_COLUMN_KEY.FILE_NAME:
      return gettext('File name');
    case PRIVATE_COLUMN_KEY.FILE_TYPE:
      return gettext('File type');
    case PRIVATE_COLUMN_KEY.FILE_COLLABORATORS:
      return gettext('Collaborators');
    case PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME:
      return gettext('File Expire time');
    case PRIVATE_COLUMN_KEY.FILE_KEYWORDS:
      return gettext('Document keywords');
    case PRIVATE_COLUMN_KEY.FILE_SUMMARY:
      return gettext('Document summary');
    case PRIVATE_COLUMN_KEY.FILE_EXPIRED:
      return gettext('Is expired');
    case PRIVATE_COLUMN_KEY.FILE_STATUS:
      return gettext('File status');
    default:
      return name;
  }
};

const getColumnType = (key, type) => {
  switch (key) {
    case PRIVATE_COLUMN_KEY.CTIME:
    case PRIVATE_COLUMN_KEY.FILE_CTIME:
      return CellType.CTIME;
    case PRIVATE_COLUMN_KEY.MTIME:
    case PRIVATE_COLUMN_KEY.FILE_MTIME:
      return CellType.MTIME;
    case PRIVATE_COLUMN_KEY.CREATOR:
    case PRIVATE_COLUMN_KEY.FILE_CREATOR:
      return CellType.CREATOR;
    case PRIVATE_COLUMN_KEY.LAST_MODIFIER:
    case PRIVATE_COLUMN_KEY.FILE_MODIFIER:
      return CellType.LAST_MODIFIER;
    case PRIVATE_COLUMN_KEY.FILE_NAME:
      return CellType.FILE_NAME;
    case PRIVATE_COLUMN_KEY.IS_DIR:
      return CellType.CHECKBOX;
    case PRIVATE_COLUMN_KEY.FILE_COLLABORATORS:
      return CellType.COLLABORATOR;
    case PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME:
      return CellType.DATE;
    case PRIVATE_COLUMN_KEY.FILE_KEYWORDS:
      return CellType.TEXT;
    case PRIVATE_COLUMN_KEY.FILE_SUMMARY:
      return CellType.LONG_TEXT;
    case PRIVATE_COLUMN_KEY.FILE_EXPIRED:
      return CellType.CHECKBOX;
    case PRIVATE_COLUMN_KEY.FILE_STATUS:
      return CellType.SINGLE_SELECT;
    default:
      return type;
  }
};

export const getColumns = (columns) => {
  if (!Array.isArray(columns) || columns.length === 0) return [];
  const columnsWidth = window.sfMetadataContext.localStorage.getItem('columns_width') || {};
  const validColumns = columns.map((column) => {
    const { type, key, name, ...params } = column;
    return {
      ...params,
      key,
      type: getColumnType(key, type),
      name: getColumnName(key, name),
      width: columnsWidth[key] || 200,
      editable: !key.startsWith('_'),
    };
  }).filter(column => !NOT_DISPLAY_COLUMN_KEYS.includes(column.key));
  let displayColumns = [];
  validColumns.forEach(column => {
    if (column.key === '_name') {
      displayColumns.unshift(column);
    } else if (column.key === PRIVATE_COLUMN_KEY.PARENT_DIR) {
      const nameColumnIndex = displayColumns.findIndex(column => column.key === PRIVATE_COLUMN_KEY.PARENT_DIR);
      if (nameColumnIndex === -1) {
        displayColumns.unshift(column);
      } else {
        displayColumns.splice(nameColumnIndex, 0, column);
      }
    } else {
      displayColumns.push(column);
    }
  });
  return displayColumns;
};

export function canEdit(col, rowData, enableCellSelect) {
  if (!col) return false;
  if (window.sfMetadataContext.canModifyCell(col) === false) return false;
  if (col.editable != null && typeof (col.editable) === 'function') {
    return enableCellSelect === true && col.editable(rowData);
  }
  return enableCellSelect === true && !!col.editable;
}
