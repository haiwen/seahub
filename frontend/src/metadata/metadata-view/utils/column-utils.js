import deepCopy from 'deep-copy';
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

export const recalculate = (columns, allColumns) => {
  const displayColumns = columns;
  const displayAllColumns = allColumns;
  const totalWidth = displayColumns.reduce((total, column) => {
    const width = column.width;
    total += width;
    return total;
  }, 0);
  let left = SEQUENCE_COLUMN_WIDTH;
  const frozenColumns = displayColumns.filter(c => isFrozen(c));
  const frozenColumnsWidth = frozenColumns.reduce((w, column) => {
    const width = column.width;
    return w + width;
  }, 0);
  const lastFrozenColumnKey = frozenColumnsWidth > 0 ? frozenColumns[frozenColumns.length - 1].key : null;
  const newColumns = displayColumns.map((column, index) => {
    const width = column.width;
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

export const recalculateColumnMetricsByResizeColumn = (columnMetrics, columnKey, width) => {
  let newColumnMetrics = deepCopy(columnMetrics);
  const columnIndex = columnMetrics.columns.findIndex((column) => column.key === columnKey);
  const column = columnMetrics.columns[columnIndex];
  const updatedColumn = { ...column, width };
  newColumnMetrics.columns[columnIndex] = updatedColumn;

  const columnAllIndex = columnMetrics.allColumns.findIndex((column) => column.key === columnKey);
  newColumnMetrics.allColumns[columnAllIndex] = { ...columnMetrics.columns[columnIndex], width };

  return recalculate(newColumnMetrics.columns, newColumnMetrics.allColumns);
};

export const getColumnDisplayName = (key, name) => {
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
      return '';
    case PRIVATE_COLUMN_KEY.PARENT_DIR:
      return gettext('Parent folder');
    case PRIVATE_COLUMN_KEY.FILE_NAME:
      return gettext('File name');
    case PRIVATE_COLUMN_KEY.FILE_TYPE:
      return gettext('File type');
    case PRIVATE_COLUMN_KEY.FILE_COLLABORATORS:
      return gettext('Document collaborators');
    case PRIVATE_COLUMN_KEY.FILE_EXPIRE_TIME:
      return gettext('File expire time');
    case PRIVATE_COLUMN_KEY.FILE_KEYWORDS:
      return gettext('Document keywords');
    case PRIVATE_COLUMN_KEY.FILE_DESCRIPTION:
      return gettext('Description');
    case PRIVATE_COLUMN_KEY.FILE_EXPIRED:
      return gettext('Is expired');
    case PRIVATE_COLUMN_KEY.FILE_STATUS:
      return gettext('File status');
    case PRIVATE_COLUMN_KEY.LOCATION:
      return gettext('Image location');
    case PRIVATE_COLUMN_KEY.SIZE:
      return gettext('Size');
    case PRIVATE_COLUMN_KEY.FILE_DETAILS:
      return gettext('File details');
    default:
      return name;
  }
};

export const getColumnOriginName = (column) => {
  const { key, name } = column;
  if (PRIVATE_COLUMN_KEYS.includes(key)) return key;
  return name;
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
    case PRIVATE_COLUMN_KEY.FILE_DESCRIPTION:
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
    '_picture': { name: gettext('Picture'), color: '#FFFCB5', textColor: '#202428' },
    '_document': { name: gettext('Document'), color: '#B7CEF9', textColor: '#202428' },
    '_video': { name: gettext('Video'), color: '#9860E5', textColor: '#FFFFFF', borderColor: '#844BD2' },
    '_audio': { name: gettext('Audio'), color: '#FBD44A', textColor: '#FFFFFF', borderColor: '#E5C142' },
    '_code': { name: gettext('Code'), color: '#4ad8fb', textColor: '#FFFFFF', borderColor: '#4283e5' },
  };
  let newData = { ...data };
  newData.options = Array.isArray(data.options) ? data.options.map(o => {
    return { ...o, ..._OPTIONS[o.id] };
  }) : [];
  return newData;
};

export const getDefaultFileStatusOptions = () => {
  return [
    { id: '_in_progress', name: '_in_progress' },
    { id: '_in_review', name: '_in_review' },
    { id: '_done', name: '_done' },
  ];
};

const getFileStatusColumnData = (column) => {
  const { data } = column;
  let newData = { ...data };
  const _OPTIONS = {
    '_in_progress': { name: gettext('In progress'), color: '#EED5FF', textColor: '#202428' },
    '_in_review': { name: gettext('In review'), color: '#FFFDCF', textColor: '#202428' },
    '_done': { name: gettext('Done'), color: '#59CB74', textColor: '#FFFFFF', borderColor: '#844BD2' },
  };
  newData.options = Array.isArray(data?.options) ? data.options.map(o => {
    return { ...o, ..._OPTIONS[o.id] };
  }) : [];
  return newData;
};

const getFileSizeColumnData = (column) => {
  return {
    ...column.data,
    format: 'byte'
  };
};

export const normalizeColumnData = (column) => {
  const { key, data } = column;
  if (PRIVATE_COLUMN_KEYS.includes(key)) {
    if (key === PRIVATE_COLUMN_KEY.FILE_TYPE) return getFileTypeColumnData(column);
    if (key === PRIVATE_COLUMN_KEY.FILE_STATUS) return getFileStatusColumnData(column);
    if (key === PRIVATE_COLUMN_KEY.SIZE) return getFileSizeColumnData(column);
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

export function canEditCell(col, record, enableCellSelect) {
  if (!col) return false;
  if (window.sfMetadataContext.canModifyColumn(col) === false) return false;
  if (col.editable != null && typeof (col.editable) === 'function') {
    return enableCellSelect === true && col.editable(record);
  }
  return enableCellSelect === true && !!col.editable;
}
