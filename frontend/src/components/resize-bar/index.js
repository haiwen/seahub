import React from 'react';
import PropTypes from 'prop-types';
import { RESIZE_BAR } from '../../constants/zIndexes';

import './index.css';

function ResizeBar(props) {
  return (
    <div
      className="resize-bar"
      ref={props.resizeBarRef}
      style={Object.assign({ zIndex: RESIZE_BAR }, props.resizeBarStyle)}
      onMouseDown={props.onResizeMouseDown}
      onMouseOver={props.onResizeMouseOver}
    >
      <div className="resize-bar-line"></div>
      <div className="resize-bar-drag-handler" ref={props.dragHandlerRef} style={props.dragHandlerStyle}></div>
    </div>
  );
}

ResizeBar.propTypes = {
  resizeBarRef: PropTypes.object.isRequired,
  resizeBarStyle: PropTypes.object.isRequired,
  dragHandlerRef: PropTypes.object.isRequired,
  dragHandlerStyle: PropTypes.object.isRequired,
  onResizeMouseDown: PropTypes.func.isRequired,
  onResizeMouseOver: PropTypes.func.isRequired,
};

export default ResizeBar;
