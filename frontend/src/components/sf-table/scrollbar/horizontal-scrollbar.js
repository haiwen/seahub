import React from 'react';
import PropTypes from 'prop-types';
import { SCROLL_BAR as Z_INDEX_SCROLL_BAR } from '../constants/z-index';

const propTypes = {
  innerWidth: PropTypes.number,
  onScrollbarScroll: PropTypes.func.isRequired,
  onScrollbarMouseUp: PropTypes.func.isRequired,
};

class HorizontalScrollbar extends React.Component {

  isSelfScroll = true;

  setScrollLeft = (scrollLeft) => {
    this.isSelfScroll = false;
    this.container.scrollLeft = scrollLeft;
  };

  onScroll = (event) => {
    // only update grid's scrollLeft via scroll by itself.
    // e.g. forbid to update grid's scrollLeft when the scrollbar's scrollLeft changed by other component
    event.stopPropagation();
    if (!this.isSelfScroll) {
      this.isSelfScroll = true;
      return;
    }
    const { scrollLeft } = event.target;
    this.props.onScrollbarScroll(scrollLeft);
    return;
  };

  getScrollbarStyle = () => {
    return { width: this.props.innerWidth };
  };

  getContainerStyle = () => {
    return { zIndex: Z_INDEX_SCROLL_BAR };
  };

  setScrollbarRef = (ref) => {
    this.scrollbar = ref;
  };

  setContainerRef = (ref) => {
    this.container = ref;
  };

  render() {
    if (!this.props.innerWidth) {
      return null;
    }

    const containerStyle = this.getContainerStyle();
    const scrollbarStyle = this.getScrollbarStyle();

    return (
      <div
        className="horizontal-scrollbar-container"
        ref={this.setContainerRef}
        style={containerStyle}
        onScroll={this.onScroll}
        onMouseUp={this.props.onScrollbarMouseUp}
      >
        <div className="horizontal-scrollbar-inner" ref={this.setScrollbarRef} style={scrollbarStyle}></div>
      </div>
    );
  }
}

HorizontalScrollbar.propTypes = propTypes;

export default HorizontalScrollbar;
