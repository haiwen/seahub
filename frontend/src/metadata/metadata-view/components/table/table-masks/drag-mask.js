import React from 'react';
import PropTypes from 'prop-types';

import CellMask from './cell-mask';

function DragMask({ draggedRange, getSelectedRangeDimensions, getSelectedDimensions }) {
  const { overRecordIdx, bottomRight } = draggedRange;
  const { idx: endColumnIdx, rowIdx: endRowIdx, groupRowIndex: endGroupRowIndex } = bottomRight;
  if (overRecordIdx !== null && endRowIdx < overRecordIdx) {
    const className = 'react-grid-cell-dragged-over-down';
    let dimensions = getSelectedRangeDimensions(draggedRange);
    for (let currentRowIdx = endRowIdx + 1; currentRowIdx <= overRecordIdx; currentRowIdx++) {
      const { height } = getSelectedDimensions({ idx: endColumnIdx, rowIdx: currentRowIdx, groupRowIndex: endGroupRowIndex });
      dimensions.height += height;
    }
    return (
      <CellMask
        {...dimensions}
        className={className}
      />
    );
  }
  return null;
}


DragMask.propTypes = {
  draggedRange: PropTypes.object.isRequired,
  getSelectedRangeDimensions: PropTypes.func.isRequired,
  getSelectedDimensions: PropTypes.func.isRequired
};

export default DragMask;
