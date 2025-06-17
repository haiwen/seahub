import React from 'react';
import PropTypes from 'prop-types';
import CellMask from './cell-mask';

function SelectionMask({ innerRef, selectedPosition, getSelectedDimensions, children }) {
  const dimensions = getSelectedDimensions(selectedPosition);
  return (
    <CellMask
      className="rdg-selected"
      id="sf-table-rdg-selected"
      tabIndex="0"
      innerRef={innerRef}
      {...dimensions}
    >
      {children}
    </CellMask>
  );
}

SelectionMask.propTypes = {
  selectedPosition: PropTypes.object.isRequired,
  getSelectedDimensions: PropTypes.func.isRequired,
  innerRef: PropTypes.func.isRequired,
  children: PropTypes.element,
};

export default SelectionMask;
