import React from 'react';
import PropTypes from 'prop-types';
import CellMask from './cell-mask';

function DragMask({ draggedRange, getSelectedRangeDimensions, getSelectedDimensions }) {
  const { overRecordIdx, bottomRight } = draggedRange;
  const { idx: endColumnIdx, rowIdx: endRowIdx, groupRecordIndex: endGroupRowIndex } = bottomRight;
  if (overRecordIdx !== null && endRowIdx < overRecordIdx) {
    let dimensions = getSelectedRangeDimensions(draggedRange);
    for (let currentRowIdx = endRowIdx + 1; currentRowIdx <= overRecordIdx; currentRowIdx++) {
      const { height } = getSelectedDimensions({ idx: endColumnIdx, rowIdx: currentRowIdx, groupRecordIndex: endGroupRowIndex });
      dimensions.height += height;
    }
    return (
      <CellMask
        {...dimensions}
        className="react-grid-cell-dragged-over-down"
        id="sf-table-cell-dragged-over-down"
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
