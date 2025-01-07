import { OVER_SCAN_COLUMNS } from '../constants/grid';

export const getColOverScanStartIdx = (colVisibleStartIdx) => {
  return Math.max(0, Math.floor(colVisibleStartIdx / 10) * 10 - OVER_SCAN_COLUMNS);
};

export const getColOverScanEndIdx = (colVisibleEndIdx, totalNumberColumns) => {
  return Math.min(Math.ceil(colVisibleEndIdx / 10) * 10 + OVER_SCAN_COLUMNS, totalNumberColumns);
};
