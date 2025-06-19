import React from 'react';
import PropTypes from 'prop-types';
import CellMask from './cell-mask';

function SelectionRangeMask({ selectedRange, innerRef, getSelectedRangeDimensions, children }) {
  const dimensions = getSelectedRangeDimensions(selectedRange);
  return (
    <CellMask
      {...dimensions}
      className="rdg-selected-range"
      id="sf-table-rdg-selected-range"
      innerRef={innerRef}
    >
      {children}
    </CellMask>
  );
}

SelectionRangeMask.propTypes = {
  selectedRange: PropTypes.shape({
    topLeft: PropTypes.shape({ idx: PropTypes.number.isRequired, rowIdx: PropTypes.number.isRequired }).isRequired,
    bottomRight: PropTypes.shape({ idx: PropTypes.number.isRequired, rowIdx: PropTypes.number.isRequired }).isRequired,
    startCell: PropTypes.shape({ idx: PropTypes.number.isRequired, rowIdx: PropTypes.number.isRequired }).isRequired,
    cursorCell: PropTypes.shape({ idx: PropTypes.number.isRequired, rowIdx: PropTypes.number.isRequired })
  }).isRequired,
  columns: PropTypes.array.isRequired,
  rowHeight: PropTypes.number.isRequired,
  children: PropTypes.element,
  innerRef: PropTypes.func.isRequired,
  getSelectedRangeDimensions: PropTypes.func
};

export default SelectionRangeMask;
