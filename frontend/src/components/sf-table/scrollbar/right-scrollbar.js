import React from 'react';
import PropTypes from 'prop-types';
import { SCROLL_BAR as Z_INDEX_SCROLL_BAR } from '../constants/z-index';

const propTypes = {
  getScrollHeight: PropTypes.func.isRequired,
  onScrollbarScroll: PropTypes.func.isRequired,
  onScrollbarMouseUp: PropTypes.func.isRequired,
};

class RightScrollbar extends React.Component {

  isSelfScroll = true;

  setScrollTop = (scrollTop) => {
    this.isSelfScroll = false;
    this.rightScrollContainer.scrollTop = scrollTop;
  };

  onScroll = (event) => {
    event.stopPropagation();

    // only update canvas's scrollTop via scroll by itself.
    // e.g. forbid to update canvas's scrollTop when the scrollbar's scrollTop changed by other component
    if (!this.isSelfScroll) {
      this.isSelfScroll = true;
      return;
    }
    const { scrollTop } = event.target;
    this.props.onScrollbarScroll(scrollTop);
  };

  onMouseUp = (event) => {
    if (this.props.onScrollbarMouseUp) {
      this.props.onScrollbarMouseUp(event);
    }
  };

  getScrollbarStyle = () => {
    if (this.props.getScrollHeight) {
      return { height: this.props.getScrollHeight() };
    }
    return {};
  };

  getContainerStyle = () => {
    const style = {};
    if (this.props.getClientHeight) {
      style.height = this.props.getClientHeight();
      style.zIndex = Z_INDEX_SCROLL_BAR;
    }

    /* sf-table-header have 33px height */
    style.top = 33;

    /* sf-table-wrapper have 0px margin */
    style.right = 0;
    return style;
  };

  setScrollbarRef = (ref) => {
    this.scrollbar = ref;
  };

  setContainerRef = (ref) => {
    this.rightScrollContainer = ref;
  };

  render() {
    const containerStyle = this.getContainerStyle();
    const scrollbarStyle = this.getScrollbarStyle();

    return (
      <div
        className="right-scrollbar-container"
        style={containerStyle}
        ref={this.setContainerRef}
        onScroll={this.onScroll}
        onMouseUp={this.onMouseUp}
      >
        <div ref={this.setScrollbarRef} className="right-scrollbar-inner" style={scrollbarStyle}></div>
      </div>
    );
  }
}

RightScrollbar.propTypes = propTypes;

export default RightScrollbar;
