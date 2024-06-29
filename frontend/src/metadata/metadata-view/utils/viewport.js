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
