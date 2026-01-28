import { isMobile } from '../../../../utils/utils';
import { isFrozen } from '../../../utils/column';

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
      if (isFrozen(column)) {
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
  for (let i = 0; i < columns.length; i++) {
    let { width } = columns[i];
    remainingScroll -= width;
    if (remainingScroll < 0) {
      return i;
    }
  }
};

export const getColVisibleEndIdx = (columns, recordBodyWidth, scrollLeft) => {
  let usefulWidth = recordBodyWidth + scrollLeft;
  for (let i = 0; i < columns.length; i++) {
    let { width } = columns[i];
    usefulWidth -= width;
    if (usefulWidth < 0) {
      return i - 1 - 1;
    }
  }
  return columns.length - 1;
};
