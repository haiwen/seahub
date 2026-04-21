/**
 * Viewport and visible column calculation utilities.
 * Handles scroll position, visible column range, and column scroll offset calculations.
 *
 * Key concepts:
 * - Used for render optimization (only visible columns are rendered)
 * - Handles frozen column offset calculations
 * - "records-body" refers to the main scrollable body area of the table
 */

import { isMobile } from '../../../utils/utils';
import { checkIsColumnFrozen } from './column';

export const getColumnScrollPosition = (columns, idx, tableContentWidth) => {
  let left = 0;
  let frozen = 0;
  const selectedColumn = getColumn(columns, idx);
  if (!selectedColumn) return null;

  for (let i = 0; i < idx; i++) {
    const column = getColumn(columns, i);
    if (column) {
      if (column.width) {
        left += column.width;
      }
      if (checkIsColumnFrozen(column)) {
        frozen += column.width;
      }
    }
  }
  return isMobile ? left - (tableContentWidth - selectedColumn.width) / 2 : left - frozen;
};

export const getColumn = (columns, idx) => {
  if (Array.isArray(columns)) {
    return columns[idx];
  } else if (typeof Immutable !== 'undefined') {
    return columns.get(idx);
  }
};

export const getColVisibleStartIdx = (columns, scrollLeft) => {
  let remainingScroll = scrollLeft;
  const nonFrozenColumns = columns.slice(0);
  for (let i = 0; i < nonFrozenColumns.length; i++) {
    let { width } = columns[i];
    remainingScroll -= width;
    if (remainingScroll < 0) {
      return i;
    }
  }
};

export const getColVisibleEndIdx = (columns, gridWidth, scrollLeft) => {
  let remainingWidth = gridWidth + scrollLeft;
  for (let i = 0; i < columns.length; i++) {
    let { width } = columns[i];
    remainingWidth -= width;
    if (remainingWidth < 0) {
      return i - 1;
    }
  }
  return columns.length - 1;
};

export const getVisibleBoundaries = (columns, scrollLeft, gridWidth) => {
  const colVisibleStartIdx = getColVisibleStartIdx(columns, scrollLeft);
  const colVisibleEndIdx = getColVisibleEndIdx(columns, gridWidth, scrollLeft);
  return { colVisibleStartIdx, colVisibleEndIdx };
};
