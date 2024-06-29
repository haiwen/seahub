import React from 'react';
import PropTypes from 'prop-types';
import { HEADER_HEIGHT_TYPE, isEmptyObject, Z_INDEX } from '../../_basic';
import { GRID_HEADER_DEFAULT_HEIGHT, GRID_HEADER_DOUBLE_HEIGHT } from '../../constants';

const propTypes = {
  table: PropTypes.object.isRequired,
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
    const component = window.sfMetadataBody;
    if (component && component.resultRef) {
      const resultRef = component.resultRef;
      return { height: resultRef.scrollHeight };
    }
    return {};
  };

  getGridHeaderHeight = () => {
    const headerSettings = this.props.table.header_settings || {};
    const headerHeight = isEmptyObject(headerSettings) ? HEADER_HEIGHT_TYPE.DEFAULT : headerSettings.header_height;
    const height = headerHeight === HEADER_HEIGHT_TYPE.DOUBLE ? GRID_HEADER_DOUBLE_HEIGHT : GRID_HEADER_DEFAULT_HEIGHT;
    return height;
  };

  getContainerStyle = () => {
    const style = {};
    const component = window.sfMetadataBody;
    if (component && component.resultContentRef) {
      style.height = component.resultContentRef.clientHeight;
      style.zIndex = Z_INDEX.SCROLL_BAR;
    }

    // sf-metadata footer have 20px height
    style.bottom = 30;
    /* sf-metadata-wrapper have 10px margin */
    style.right = '10px';
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
