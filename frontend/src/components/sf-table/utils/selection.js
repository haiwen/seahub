import ObjectUtils, { isEmptyObject } from '../../../utils/object';
import { getCellValueByColumn } from './cell';
import { checkIsColumnEditable, checkIsColumnSupportPreview, getColumnByIndex } from './column';
import { getGroupByPath } from './group';
import { getGroupRecordByIndex } from './group-metrics';
import { CELL_MASK as Z_INDEX_CELL_MASK, FROZEN_CELL_MASK as Z_INDEX_FROZEN_CELL_MASK } from '../constants/z-index';

const SELECT_DIRECTION = {
  UP: 'upwards',
  DOWN: 'downwards',
};

export const checkCellValueChanged = (oldVal, newVal) => {
  if (oldVal === newVal) return false;
  if (oldVal === undefined || oldVal === null || oldVal === '') {
    if (newVal === undefined || newVal === null || newVal === '') return false;
    if (typeof newVal === 'object' && isEmptyObject(newVal)) return false;
    if (Array.isArray(newVal)) return newVal.length !== 0;
    if (typeof newVal === 'boolean') return newVal !== false;
  }
  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  }
  if (typeof oldVal === 'object' && typeof newVal === 'object' && newVal !== null) {
    return !ObjectUtils.isSameObject(oldVal, newVal);
  }
  return oldVal !== newVal;
};

export const cellCompare = (props, nextProps) => {
  const {
    record: oldRecord, column, isCellSelected, isLastCell, highlightClassName, height, bgColor,
    showRecordAsTree, treeNodeIndex, treeNodeDepth, hasChildNodes, isFoldedTreeNode,
  } = props;
  const {
    record: newRecord, highlightClassName: newHighlightClassName, height: newHeight, column: newColumn, bgColor: newBgColor,
  } = nextProps;

  const oldValue = getCellValueByColumn(oldRecord, column);
  const newValue = getCellValueByColumn(newRecord, column);
  let isCustomCellValueChanged = false;
  if (props.checkCellValueChanged) {
    isCustomCellValueChanged = props.checkCellValueChanged(column, oldRecord, newRecord);
  }
  let isLockStatusChanged = false;
  if (oldRecord._is_locked !== undefined) {
    isLockStatusChanged = oldRecord._is_locked !== newRecord._is_locked || oldRecord._is_freezed !== newRecord._is_freezed;
  }
  return (
    isCustomCellValueChanged ||
    checkCellValueChanged(oldValue, newValue) ||
    oldRecord._last_modifier !== newRecord._last_modifier ||
    isLockStatusChanged ||
    isCellSelected !== nextProps.isCellSelected ||
    isLastCell !== nextProps.isLastCell ||
    highlightClassName !== newHighlightClassName ||
    height !== newHeight ||
    column.name !== newColumn.name ||
    column.left !== newColumn.left ||
    column.width !== newColumn.width ||
    !ObjectUtils.isSameObject(column.data, newColumn.data) ||
    bgColor !== newBgColor ||
    showRecordAsTree !== nextProps.showRecordAsTree ||
    treeNodeIndex !== nextProps.treeNodeIndex ||
    treeNodeDepth !== nextProps.treeNodeDepth ||
    hasChildNodes !== nextProps.hasChildNodes ||
    isFoldedTreeNode !== nextProps.isFoldedTreeNode ||
    props.groupRecordIndex !== nextProps.groupRecordIndex ||
    props.recordIndex !== nextProps.recordIndex
  );
};

export const CELL_MASK = Z_INDEX_CELL_MASK;
export const FROZEN_CELL_MASK = Z_INDEX_FROZEN_CELL_MASK;

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

export const checkIsCellSupportOpenEditor = (cell, column, isGroupView, recordGetterByIndex, canModify) => {
  const { groupRecordIndex, rowIdx } = cell;
  if (!column) return false;

  if (checkIsColumnSupportPreview(column)) {
    return true;
  }

  if (!checkIsColumnEditable(column)) {
    return false;
  }

  const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex: rowIdx });
  if (!record || !canModify) return false;
  return !!canModify(record);
};

export const checkIsSelectedCellEditable = ({ enableCellSelect, selectedPosition, columns, isGroupView, recordGetterByIndex, canModify }) => {
  const column = getSelectedColumn({ selectedPosition, columns });
  if (!checkIsColumnEditable(column)) {
    return false;
  }

  const row = getSelectedRow({ selectedPosition, isGroupView, recordGetterByIndex });
  if (!row || !canModify) {
    return false;
  }
  return canModify(row);
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
      height = (Math.abs(endGroupRecordIndex - startGroupRecordIndex) + 1) * rowHeight;
    } else if (selectDirection === SELECT_DIRECTION.DOWN) {
      const groupPath = startGroupRow.groupPath;
      const group = getGroupByPath(groupPath, groups);
      const groupRowIds = group.row_ids || [];
      height = (groupRowIds.length - startGroupRow.rowIdx || 0) * rowHeight;
    } else if (selectDirection === SELECT_DIRECTION.UP) {
      const startGroupRowIdx = startGroupRow.rowIdx || 0;
      topGroupRowIndex = startGroupRecordIndex - startGroupRowIdx;
      height = (startGroupRowIdx + 1) * rowHeight;
    }
    height += 1;
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
