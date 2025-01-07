import ObjectUtils, { isEmptyObject } from '../../../utils/object';
import { getCellValueByColumn } from './cell';

export const checkCellValueChanged = (oldVal, newVal) => {
  if (oldVal === newVal) return false;
  if (oldVal === undefined || oldVal === null || oldVal === '') {
    if (newVal === undefined || newVal === null || newVal === '') return false;
    if (typeof newVal === 'object' && isEmptyObject(newVal)) return false;
    if (Array.isArray(newVal)) return newVal.length !== 0;
    if (typeof newVal === 'boolean') return newVal !== false;
  }
  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    // [{}].toString(): [object Object]
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
  } = props;
  const {
    record: newRecord, highlightClassName: newHighlightClassName, height: newHeight, column: newColumn, bgColor: newBgColor,
  } = nextProps;

  // the modification of column is not currently supported, only the modification of cell data is considered
  const oldValue = getCellValueByColumn(oldRecord, column);
  const newValue = getCellValueByColumn(newRecord, column);
  let isCustomCellValueChanged = false;
  if (props.checkCellValueChanged) {
    isCustomCellValueChanged = props.checkCellValueChanged(column, oldRecord, newRecord);
  }
  return (
    isCustomCellValueChanged ||
    checkCellValueChanged(oldValue, newValue) ||
    oldRecord._last_modifier !== newRecord._last_modifier ||
    isCellSelected !== nextProps.isCellSelected ||
    isLastCell !== nextProps.isLastCell ||
    highlightClassName !== newHighlightClassName ||
    height !== newHeight ||
    column.name !== newColumn.name ||
    column.left !== newColumn.left ||
    column.width !== newColumn.width ||
    !ObjectUtils.isSameObject(column.data, newColumn.data) ||
    bgColor !== newBgColor ||
    props.groupRecordIndex !== nextProps.groupRecordIndex ||
    props.recordIndex !== nextProps.recordIndex
  );
};
