import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import html5DragDropContext from '../../../../../pages/wiki2/wiki-nav/html5DragDropContext';

const OptionsContainer = ({ inputRef, options }) => {
  if (!Array.isArray(options) || options.length === 0) return null;
  return (
    <div className="sf-metadata-select-options-list" ref={inputRef}>
      {options}
    </div>
  );
};

OptionsContainer.propTypes = {
  inputRef: PropTypes.any,
  options: PropTypes.array
};

const DndOptionsContainer = DropTarget('Option', {}, connect => ({
  connectDropTarget: connect.dropTarget()
}))(OptionsContainer);

export default html5DragDropContext(DndOptionsContainer);
