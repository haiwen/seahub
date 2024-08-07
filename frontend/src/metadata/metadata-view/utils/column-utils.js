import {
  CellType,
  DEFAULT_DATE_FORMAT,
  PRIVATE_COLUMN_KEY,
  NOT_DISPLAY_COLUMN_KEYS,
  PRIVATE_COLUMN_KEYS,
} from '../_basic';
import {
  SEQUENCE_COLUMN_WIDTH
} from '../constants';
import {
  gettext
} from '../../../utils/constants';

export function getDateColumnFormat(column) {
  const format = (column && column.data && column.data.format) ? column.data.format : DEFAULT_DATE_FORMAT;
  // Old Europe format is D/M/YYYY new format is DD/MM/YYYY
  return format;
}

export function isCheckboxColumn(column) {
  return column.type === CellType.CHECKBOX;
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
  return column.key === '_name';
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
  return column.editable;
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
      return gettext('File expire time');
    case PRIVATE_COLUMN_KEY.FILE_KEYWORDS:
      return gettext('Document keywords');
    case PRIVATE_COLUMN_KEY.FILE_SUMMARY:
      return gettext('Document summary');
    case PRIVATE_COLUMN_KEY.FILE_EXPIRED:
      return gettext('Is expired');
    case PRIVATE_COLUMN_KEY.FILE_STATUS:
      return gettext('File status');
    case PRIVATE_COLUMN_KEY.LOCATION:
      return gettext('Image location');
    default:
      return name;
  }
};

export const getColumnType = (key, type) => {
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
    case PRIVATE_COLUMN_KEY.LOCATION:
      return CellType.GEOLOCATION;
    default:
      return type;
  }
};

const getFileTypeColumnData = (column) => {
  const { data } = column;
  const _OPTIONS = {
    '_picture': { name: gettext('Picture'), color: '#FFFCB5', textColor: '#202428', id: '_picture' },
    '_document': { name: gettext('Document'), color: '#B7CEF9', textColor: '#202428', id: '_document' },
    '_video': { name: gettext('Video'), color: '#9860E5', textColor: '#FFFFFF', borderColor: '#844BD2', id: '_video' },
    '_audio': { name: gettext('Audio'), color: '#FBD44A', textColor: '#FFFFFF', borderColor: '#E5C142', id: '_audio' },
    '_code': { name: gettext('Code'), color: '#4ad8fb', textColor: '#FFFFFF', borderColor: '#4283e5', id: '_code' },
  };
  let newData = { ...data };
  newData.options = Array.isArray(data.options) ? data.options.map(o => {
    return _OPTIONS[o.name];
  }) : Object.values(_OPTIONS);
  return newData;
};

export const getDefaultFileStatusOptions = () => {
  return [
    { name: gettext('Draft'), color: '#EED5FF', textColor: '#202428', id: '_draft' },
    { name: gettext('In review'), color: '#FFFDCF', textColor: '#202428', id: '_in_review' },
    { name: gettext('Done'), color: '#59CB74', textColor: '#FFFFFF', borderColor: '#844BD2', id: '_done' },
  ];
};

const getFileStatusColumnData = (column) => {
  const { data } = column;
  let newData = { ...data };
  newData.options = Array.isArray(data?.options) ? data.options : getDefaultFileStatusOptions();
  return newData;
};

export const normalizeColumnData = (column) => {
  const { key, data } = column;
  if (PRIVATE_COLUMN_KEYS.includes(key)) {
    if (key === PRIVATE_COLUMN_KEY.FILE_TYPE) return getFileTypeColumnData(column);
    if (key === PRIVATE_COLUMN_KEY.FILE_STATUS) return getFileStatusColumnData(column);
  }
  if (column.type === CellType.SINGLE_SELECT) {
    return { ...data, options: data?.options || [] };
  }
  if (column.type === CellType.DATE) {
    return { ...data, format: data?.format || DEFAULT_DATE_FORMAT };
  }
  return data;
};

export const normalizeColumns = (columns) => {
  if (!Array.isArray(columns) || columns.length === 0) return [];
  const columnsWidth = window.sfMetadataContext.localStorage.getItem('columns_width') || {};
  const validColumns = columns.map((column) => {
    const { type, key, ...params } = column;
    const columnType = getColumnType(key, type);
    return {
      ...params,
      key,
      type: columnType,
      width: columnsWidth[key] || 200,
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

export function canEdit(col, record, enableCellSelect) {
  if (!col) return false;
  if (window.sfMetadataContext.canModifyCell(col) === false) return false;
  if (col.editable != null && typeof (col.editable) === 'function') {
    return enableCellSelect === true && col.editable(record);
  }
  return enableCellSelect === true && !!col.editable;
}
