// import { Utils } from '../../../utils/utils';
import { CELL_MASK as Z_INDEX_CELL_MASK, FROZEN_CELL_MASK as Z_INDEX_FROZEN_CELL_MASK } from '../constants/z-index';
import { getCellValueByColumn } from './cell';
import { checkIsColumnEditable, checkIsColumnSupportPreview, getColumnByIndex } from './column';
import { getGroupByPath } from './group';
import { getGroupRecordByIndex } from './group-metrics';

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
  return getColumnByIndex(idx, columns);
};

export const getSelectedCellValue = ({ selectedPosition, columns, isGroupView, recordGetterByIndex }) => {
  const column = getSelectedColumn({ selectedPosition, columns });
  const record = getSelectedRow({ selectedPosition, isGroupView, recordGetterByIndex });
  return getCellValueByColumn(record, column);
};

export const checkIsCellSupportOpenEditor = (cell, column, isGroupView, recordGetterByIndex, checkCanModifyRecord) => {
  const { groupRecordIndex, rowIdx } = cell;
  if (!column) return false;

  // open the editor to preview cell value
  if (checkIsColumnSupportPreview(column)) {
    return true;
  }

  if (!checkIsColumnEditable(column)) {
    return false;
  }

  const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
  if (!record || !checkCanModifyRecord) return false;
  return !!checkCanModifyRecord(record);
};

export const checkIsSelectedCellEditable = ({ enableCellSelect, selectedPosition, columns, isGroupView, recordGetterByIndex, checkCanModifyRecord }) => {
  const column = getSelectedColumn({ selectedPosition, columns });
  if (!checkIsColumnEditable(column)) {
    return false;
  }

  const row = getSelectedRow({ selectedPosition, isGroupView, recordGetterByIndex });
  if (!row || !checkCanModifyRecord) {
    return false;
  }
  return checkCanModifyRecord(row);
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
  if (idx >= 0) {
    const column = columns && columns[idx];
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
    const zIndex = frozen ? Z_INDEX_FROZEN_CELL_MASK : Z_INDEX_CELL_MASK;
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

const getColumnRangeProperties = (from, to, columns, scrollLeft) => {
  let totalWidth = 0;
  let anyColFrozen = false;
  for (let i = from; i <= to; i++) {
    const column = columns[i];
    if (column) {
      totalWidth += column.width;
      anyColFrozen = anyColFrozen || column.frozen;
    }
  }
  return { totalWidth, anyColFrozen, left: anyColFrozen ? columns[from].left + scrollLeft : columns[from].left };
};

export const getSelectedRangeDimensions = ({
  selectedRange, columns, scrollLeft, rowHeight, isGroupView, groups, groupMetrics,
  groupOffsetLeft, getRecordTopFromRecordsBody,
}) => {
  const { topLeft, bottomRight, startCell, cursorCell } = selectedRange;
  if (topLeft.idx < 0) {
    return { width: 0, left: 0, top: 0, height: rowHeight, zIndex: Z_INDEX_CELL_MASK };
  }

  let { totalWidth, anyColFrozen, left } = getColumnRangeProperties(topLeft.idx, bottomRight.idx, columns, scrollLeft);
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

  const zIndex = anyColFrozen ? Z_INDEX_FROZEN_CELL_MASK : Z_INDEX_CELL_MASK;
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
