import React from 'react';
import PropTypes from 'prop-types';

function DragHandler({ onDragStart, onDragEnd }) {
  return (
    <div
      className="drag-handle"
      draggable="true"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  );
}

DragHandler.propTypes = {
  onDragStart: PropTypes.func.isRequired,
  onDragEnd: PropTypes.func.isRequired,
};

export default DragHandler;
