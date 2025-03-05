import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { debounce } from '../../../../../../utils/utils';

class ResizeColumnHandle extends Component {

  componentWillUnmount() {
    this.cleanUp();
  }

  cleanUp = () => {
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchend', this.onMouseUp);
    window.removeEventListener('touchmove', this.onMouseMove);
  };

  onMouseDown = (e) => {
    if (e.preventDefault) {
      e.preventDefault();
    }

    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchend', this.onMouseUp);
    window.addEventListener('touchmove', this.onMouseMove);
  };

  onMouseUp = (e) => {
    this.props.onDragEnd && this.props.onDragEnd(e);
    this.cleanUp();
  };

  onMouseMove = (e) => {
    if (e.preventDefault) {
      e.preventDefault();
    }
    debounce(this.props.onDrag(e), 100);
  };

  render() {
    return (
      <div
        className="record-HeaderCell__draggable"
        onClick={(e) => e.stopPropagation()}
        onDrag={this.props.onDrag}
        onMouseDown={this.onMouseDown}
        onTouchStart={this.onMouseDown}
      />
    );
  }
}

ResizeColumnHandle.propTypes = {
  onDrag: PropTypes.func,
  onDragEnd: PropTypes.func,
};

export default ResizeColumnHandle;
