import React, { Component } from 'react';
import PropTypes from 'prop-types';
import GroupHeaderRight from './group-header-right';

class GroupContainerRight extends Component {

  fixedFrozenDOMs = (scrollLeft, scrollTop) => {
    this.rightHeader && this.rightHeader.fixedFrozenDOMs(scrollLeft, scrollTop);
  };

  cancelFixFrozenDOMs = (scrollLeft) => {
    this.rightHeader && this.rightHeader.cancelFixFrozenDOMs(scrollLeft);
  };

  render() {
    const {
      group, isExpanded, columns, summaryConfigs, rightPaneWidth, leftPaneWidth, height,
      groupOffsetLeft, lastFrozenColumnKey,
    } = this.props;
    const groupContainerRightStyle = {
      left: leftPaneWidth,
      width: rightPaneWidth,
      height,
    };

    return (
      <div className="group-container group-container-right" style={groupContainerRightStyle}>
        <GroupHeaderRight
          ref={ref => this.rightHeader = ref}
          groupOffsetLeft={groupOffsetLeft}
          lastFrozenColumnKey={lastFrozenColumnKey}
          group={group}
          isExpanded={isExpanded}
          columns={columns}
          summaryConfigs={summaryConfigs}
        />
      </div>
    );
  }
}

GroupContainerRight.propTypes = {
  group: PropTypes.object,
  isExpanded: PropTypes.bool,
  columns: PropTypes.array,
  summaryConfigs: PropTypes.object,
  rightPaneWidth: PropTypes.number,
  leftPaneWidth: PropTypes.number,
  height: PropTypes.number,
  groupOffsetLeft: PropTypes.number,
  lastFrozenColumnKey: PropTypes.string,
};

export default GroupContainerRight;
