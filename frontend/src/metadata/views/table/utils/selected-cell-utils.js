import { Utils } from '../../../../utils/utils';
import { getCellValueByColumn, getFileNameFromRecord } from '../../../utils/cell';
import { getGroupByPath } from '../../../utils/view';
import { getColumnByIndex, canEditCell } from '../../../utils/column';
import { CellType, PRIVATE_COLUMN_KEY, SUPPORT_PREVIEW_COLUMN_TYPES, metadataZIndexes } from '../../../constants';
import { getGroupRecordByIndex } from './group-metrics';
import { checkIsDir } from '../../../utils/row';

const SELECT_DIRECTION = {
  UP: 'upwards',
  DOWN: 'downwards',
};

export const getRowTop = (rowIdx, rowHeight) => rowIdx * rowHeight;

export const getSelectedRow = ({ selectedPosition, isGroupView, recordGetterByIndex }) => {
  const { groupRecordIndex, rowIdx } = selectedPosition;
  return recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
};

export const getSelectedColumn = ({ selectedPosition, columns }) => {
  const { idx } = selectedPosition;
  if (!columns || idx < 0 || idx >= columns.length) {
    return null;
  }
  return getColumnByIndex(idx, columns);
};

export const getSelectedCellValue = ({ selectedPosition, columns, isGroupView, recordGetterByIndex }) => {
  const column = getSelectedColumn({ selectedPosition, columns });
  const record = getSelectedRow({ selectedPosition, isGroupView, recordGetterByIndex });
  if (!column || !record) {
    return null;
  }
  return getCellValueByColumn(record, column);
};

export const isSelectedCellSupportOpenEditor = (cell, columns, isGroupView, recordGetterByIndex) => {
  const { idx, groupRecordIndex, rowIdx } = cell;
  const column = columns[idx];
  if (!column) return false;
  if (SUPPORT_PREVIEW_COLUMN_TYPES.includes(column.type)) {
    return true;
  }

  const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
  if (!record) return false;
  return true;
};

export const isSelectedCellEditable = ({ enableCellSelect, selectedPosition, columns, isGroupView, recordGetterByIndex, onCheckCellIsEditable }) => {
  const column = getSelectedColumn({ selectedPosition, columns });
  const row = getSelectedRow({ selectedPosition, isGroupView, recordGetterByIndex });
  if (!window.sfMetadataContext.canModifyRow(row)) return false;
  let isCellEditable = Utils.isFunction(onCheckCellIsEditable) ? onCheckCellIsEditable({ row, column, ...selectedPosition }) : true;
  const fileName = getFileNameFromRecord(row);
  const imageRow = row && (Utils.imageCheck(fileName) || Utils.videoCheck(fileName));
  isCellEditable = isCellEditable && canEditCell(column, row, enableCellSelect);
  if (imageRow) return isCellEditable;
  if (column?.key === PRIVATE_COLUMN_KEY.CAPTURE_TIME) return false;
  if (column?.type === CellType.TAGS && checkIsDir(row)) return false;
  return isCellEditable;
};

export function selectedRangeIsSingleCell(selectedRange) {
  const { topLeft, bottomRight } = selectedRange;
  if (
    topLeft.idx !== bottomRight.idx ||
    topLeft.rowIdx !== bottomRight.rowIdx
  ) {
    return false;
  }
  return true;
}

export const getSelectedDimensions = ({
  selectedPosition, columns, rowHeight, scrollLeft, isGroupView, groupOffsetLeft,
  getRecordTopFromRecordsBody,
}) => {
  const { idx, rowIdx, groupRecordIndex } = selectedPosition;
  const defaultDimensions = { width: 0, left: 0, top: 0, height: rowHeight, zIndex: 1 };

  if (idx >= 0 && columns && columns.length > 0) {
    const column = columns[idx];
    if (!column) {
      return defaultDimensions;
    }
    const { frozen, width } = column;
    let left = frozen ? scrollLeft + column.left : column.left;
    let top;
    if (isGroupView) {
      left += groupOffsetLeft;
      // group view uses border-top, No group view uses border-bottom (for group animation) so selected top should be increased 1
      top = getRecordTopFromRecordsBody(groupRecordIndex) + 1;
    } else {
      top = getRecordTopFromRecordsBody(rowIdx);
    }
    const zIndex = frozen ? metadataZIndexes.FROZEN_CELL_MASK : metadataZIndexes.CELL_MASK;
    return { width, left, top, height: rowHeight, zIndex };
  }
  return defaultDimensions;
};

export function getNewSelectedRange(startCell, nextCellPosition) {
  const { idx: currentIdx, rowIdx: currentRowIdx, groupRecordIndex: currentGroupRecordIndex } = startCell;
  const { idx: newIdx, rowIdx: newRowIdx, groupRecordIndex: newGroupRecordIndex } = nextCellPosition;
  const colIndexes = [currentIdx, newIdx].sort((a, b) => a - b);
  const rowIndexes = [currentRowIdx, newRowIdx].sort((a, b) => a - b);
  const groupRecordIndexes = [currentGroupRecordIndex, newGroupRecordIndex].sort((a, b) => a - b);
  const topLeft = { idx: colIndexes[0], rowIdx: rowIndexes[0], groupRecordIndex: groupRecordIndexes[0] };
  const bottomRight = { idx: colIndexes[1], rowIdx: rowIndexes[1], groupRecordIndex: groupRecordIndexes[1] };
  return { topLeft, bottomRight };
}

const getColumnRangeProperties = (from, to, columns) => {
  let totalWidth = 0;
  let anyColFrozen = false;

  // Ensure indices are within bounds
  const validFrom = Math.max(0, Math.min(from, columns.length - 1));
  const validTo = Math.max(0, Math.min(to, columns.length - 1));

  for (let i = validFrom; i <= validTo; i++) {
    const column = columns[i];
    if (column) {
      totalWidth += column.width;
      anyColFrozen = anyColFrozen || column.frozen;
    }
  }

  // Safely get the left position from the first valid column
  const firstColumn = columns[validFrom];
  const left = firstColumn ? firstColumn.left : 0;

  return { totalWidth, anyColFrozen, left };
};

export const getSelectedRangeDimensions = ({
  selectedRange, columns, rowHeight, isGroupView, groups, groupMetrics,
  groupOffsetLeft, getRecordTopFromRecordsBody,
}) => {
  const { topLeft, bottomRight, startCell, cursorCell } = selectedRange;
  if (topLeft.idx < 0 || !columns || columns.length === 0) {
    return { width: 0, left: 0, top: 0, height: rowHeight, zIndex: metadataZIndexes.CELL_MASK };
  }

  // Check if the selected range indices are still valid after column deletion
  const maxColumnIndex = columns.length - 1;
  if (topLeft.idx > maxColumnIndex || bottomRight.idx > maxColumnIndex) {
    return { width: 0, left: 0, top: 0, height: rowHeight, zIndex: metadataZIndexes.CELL_MASK };
  }

  let { totalWidth, anyColFrozen, left } = getColumnRangeProperties(topLeft.idx, bottomRight.idx, columns);
  let height;
  let top;
  if (isGroupView) {
    let { groupRecordIndex: startGroupRecordIndex } = startCell;
    let { groupRecordIndex: endGroupRecordIndex } = cursorCell;
    const startGroupRow = getGroupRecordByIndex(startGroupRecordIndex, groupMetrics);
    const endGroupRow = getGroupRecordByIndex(endGroupRecordIndex, groupMetrics);
    const startGroupPathString = startGroupRow.groupPathString;
    const endGroupPathString = endGroupRow.groupPathString;
    let topGroupRowIndex;
    let selectDirection;
    if (startGroupRecordIndex < endGroupRecordIndex) {
      topGroupRowIndex = startGroupRecordIndex;
      selectDirection = SELECT_DIRECTION.DOWN;
    } else {
      topGroupRowIndex = endGroupRecordIndex;
      selectDirection = SELECT_DIRECTION.UP;
    }

    if (startGroupPathString === endGroupPathString) {
      // within the same group.
      height = (Math.abs(endGroupRecordIndex - startGroupRecordIndex) + 1) * rowHeight;
    } else if (selectDirection === SELECT_DIRECTION.DOWN) {
      // within different group: select cells from top to bottom.
      const groupPath = startGroupRow.groupPath;
      const group = getGroupByPath(groupPath, groups);
      const groupRowIds = group.row_ids || [];
      height = (groupRowIds.length - startGroupRow.rowIdx || 0) * rowHeight;
    } else if (selectDirection === SELECT_DIRECTION.UP) {
      // within different group: select cells from bottom to top.
      const startGroupRowIdx = startGroupRow.rowIdx || 0;
      topGroupRowIndex = startGroupRecordIndex - startGroupRowIdx;
      height = (startGroupRowIdx + 1) * rowHeight;
    }
    height += 1; // record height: 32
    left += groupOffsetLeft;
    top = getRecordTopFromRecordsBody(topGroupRowIndex);
  } else {
    height = (bottomRight.rowIdx - topLeft.rowIdx + 1) * rowHeight;
    top = getRecordTopFromRecordsBody(topLeft.rowIdx);
  }

  const zIndex = anyColFrozen ? metadataZIndexes.FROZEN_CELL_MASK : metadataZIndexes.CELL_MASK;
  return { width: totalWidth, left, top, height, zIndex };
};

export const getRecordsFromSelectedRange = ({ selectedRange, isGroupView, recordGetterByIndex }) => {
  const { topLeft, bottomRight } = selectedRange;
  const { rowIdx: startRecordIdx, groupRecordIndex } = topLeft;
  const { rowIdx: endRecordIdx } = bottomRight;
  let currentGroupRowIndex = groupRecordIndex;
  let records = [];
  for (let recordIndex = startRecordIdx, endIdx = endRecordIdx + 1; recordIndex < endIdx; recordIndex++) {
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex: currentGroupRowIndex, recordIndex });
    if (isGroupView) {
      currentGroupRowIndex++;
    }
    if (record) {
      records.push(record);
    }
  }
  return records;
};
