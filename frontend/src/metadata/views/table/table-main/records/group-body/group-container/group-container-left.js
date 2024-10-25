import React, { Component } from 'react';
import PropTypes from 'prop-types';
import GroupHeaderLeft from './group-header-left';
import { metadataZIndexes } from '../../../../../../constants';

class GroupContainerLeft extends Component {

  fixedFrozenDOMs = (scrollLeft, scrollTop) => {
    if (this.leftContainer) {
      this.leftContainer.style.position = 'fixed';
      this.leftContainer.style.marginLeft = '0px';
      this.leftContainer.style.marginTop = (-scrollTop) + 'px';
    }
  };

  setContainerRef = (ref) => {
    this.leftContainer = ref;
  };

  cancelFixFrozenDOMs = (scrollLeft) => {
    if (this.leftContainer) {
      this.leftContainer.style.position = 'absolute';
      this.leftContainer.style.marginLeft = scrollLeft + 'px';
      this.leftContainer.style.marginTop = '0px';
    }
  };

  render() {
    const {
      isExpanded, maxLevel, group, formulaRow, leftPaneWidth, height,
      firstColumnFrozen, lastColumnFrozen, firstColumnKey,
    } = this.props;
    let containerStyle = {
      zIndex: firstColumnFrozen ? metadataZIndexes.GROUP_FROZEN_HEADER : 0,
      width: leftPaneWidth,
      height,
    };

    return (
      <div
        className="group-container group-container-left"
        style={containerStyle}
        ref={this.setContainerRef}
      >
        <GroupHeaderLeft
          ref={ref => this.leftHeader = ref}
          isExpanded={isExpanded}
          firstColumnFrozen={firstColumnFrozen}
          lastColumnFrozen={lastColumnFrozen}
          firstColumnKey={firstColumnKey}
          width={leftPaneWidth}
          maxLevel={maxLevel}
          group={group}
          formulaRow={formulaRow}
          onExpandGroupToggle={this.props.onExpandGroupToggle}
        />
      </div>
    );
  }
}

GroupContainerLeft.propTypes = {
  isExpanded: PropTypes.bool,
  firstColumnFrozen: PropTypes.bool,
  lastColumnFrozen: PropTypes.bool,
  firstColumnKey: PropTypes.string,
  maxLevel: PropTypes.number,
  group: PropTypes.object,
  formulaRow: PropTypes.object,
  leftPaneWidth: PropTypes.number,
  height: PropTypes.number,
  onExpandGroupToggle: PropTypes.func,
};

export default GroupContainerLeft;
