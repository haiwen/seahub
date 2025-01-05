import { shallowCloneObject } from '../../../utils/object';

export const checkIsNameColumn = (column) => {
  if (!column) return false;
  return !!column.is_name_column;
};

export const checkIsColumnFrozen = (column) => {
  if (!column) return false;
  return !!column.frozen;
};

export const checkEditableViaClickCell = (column) => {
  if (!column) return false;
  return !!column.editable_via_click_cell;
};

export const checkIsColumnSupportDirectEdit = (column) => {
  if (!column) return false;
  return !!column.is_support_direct_edit;
};

export const checkIsColumnSupportPreview = (column) => {
  if (!column) return false;
  return !!column.is_support_preview;
};

export const checkIsColumnEditable = (column) => {
  if (!column) return false;
  return !!column.editable;
};

export const checkIsPopupColumnEditor = (column) => {
  if (!column) return false;
  return !!column.is_popup_editor;
};

export const checkIsPrivateColumn = (column) => {
  if (!column) return false;
  return !!column.is_private;
};

export const getColumnOriginName = (column) => {
  if (checkIsPrivateColumn(column)) return column.key;
  return column.name;
};

export const getColumnByKey = (columns, columnKey) => {
  if (!Array.isArray(columns) || !columnKey) return null;
  return columns.find((column) => column.key === columnKey);
};

export const getColumnIndexByKey = (columnKey, columns) => {
  let index = 0;
  for (let i = 0; i < columns.length; i++) {
    if (columnKey === columns[i].key) {
      index = i;
      break;
    }
  }
  return index;
};

export function getColumnByIndex(index, columns) {
  if (Array.isArray(columns)) {
    return columns[index];
  }
  if (typeof Immutable !== 'undefined') {
    return columns.get(index);
  }
  return null;
}

export const getFrozenColumns = (columns) => {
  return columns.filter(column => checkIsColumnFrozen(column));
};

export const recalculate = (columns, allColumns, sequenceColumnWidth = 0) => {
  const displayColumns = columns;
  const displayAllColumns = allColumns;
  const totalWidth = displayColumns.reduce((total, column) => {
    const width = column.width;
    total += width;
    return total;
  }, 0);
  let left = sequenceColumnWidth;
  const frozenColumns = displayColumns.filter(c => checkIsColumnFrozen(c));
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

export const recalculateColumnMetricsByResizeColumn = (columnMetrics, sequenceColumnWidth, columnKey, width) => {
  let newColumnMetrics = shallowCloneObject(columnMetrics);
  let updatedColumns = columnMetrics.columns.map((column) => shallowCloneObject(column));
  const columnIndex = updatedColumns.findIndex((column) => column.key === columnKey);
  let updatedColumn = updatedColumns[columnIndex];
  updatedColumn.width = width;
  newColumnMetrics.columns = updatedColumns;

  const columnAllIndex = columnMetrics.allColumns.findIndex((column) => column.key === columnKey);
  newColumnMetrics.allColumns[columnAllIndex] = { ...columnMetrics.columns[columnIndex], width };

  return recalculate(newColumnMetrics.columns, newColumnMetrics.allColumns, sequenceColumnWidth);
};
