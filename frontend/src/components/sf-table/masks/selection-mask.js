import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import CellMask from './cell-mask';

function SelectionMask({ innerRef, selectedPosition, getSelectedDimensions, children, className }) {
  const dimensions = getSelectedDimensions(selectedPosition);
  return (
    <CellMask
      className={classnames('rdg-selected', className)}
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
  className: PropTypes.string,
  children: PropTypes.element,
};

export default SelectionMask;
