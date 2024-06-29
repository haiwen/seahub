import { CellType, isEmptyObject } from '../_basic';
import ObjectUtils from './object-utils';

export const isCellValueChanged = (oldVal, newVal, columnType) => {
  if (oldVal === newVal) {
    return false;
  }
  if (oldVal === undefined || oldVal === null) {
    if (columnType === CellType.GEOLOCATION && isEmptyObject(newVal)) {
      return false;
    }
    if ((columnType === CellType.DATE || columnType === CellType.NUMBER || columnType === CellType.AUTO_NUMBER) && newVal === null) {
      return false;
    }
    if (Array.isArray(newVal)) {
      return newVal.length !== 0;
    }
    return newVal !== false && newVal !== '';
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
