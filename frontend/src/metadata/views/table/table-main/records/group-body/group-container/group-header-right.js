import React, { Component } from 'react';
import PropTypes from 'prop-types';
import GroupHeaderCell from './group-header-cell';
import { isFrozen } from '../../../../../../utils/column';
import { GROUP_HEADER_HEIGHT } from '../../../../../../constants';

class GroupHeaderRight extends Component {

  headerCells = {};

  setHeaderCellRef = (key) => (node) => {
    this.headerCells[key] = node;
  };

  fixedFrozenDOMs = (scrollLeft, scrollTop) => {
    this.props.columns.forEach((column) => {
      const headerCell = this.headerCells[column.key];
      if (isFrozen(column) && headerCell) {
        headerCell.fixedFrozenDOMs(scrollLeft, scrollTop);
      }
    });
  };

  cancelFixFrozenDOMs = (scrollLeft) => {
    this.props.columns.forEach((column) => {
      const headerCell = this.headerCells[column.key];
      if (isFrozen(column) && headerCell) {
        headerCell.cancelFixFrozenDOMs(scrollLeft);
      }
    });
  };

  getGroupSummaries = () => {
    const {
      group, isExpanded, columns, groupOffsetLeft, lastFrozenColumnKey, summaryConfigs,
    } = this.props;
    const summaryColumns = columns.slice(1); // get column from 2 index
    const firstColumnWidth = columns[0] ? columns[0].width : 0;
    let offsetLeft = 0;
    return summaryColumns.map((column, index) => {
      const { key } = column;
      const summaryMethod = summaryConfigs && summaryConfigs[key] ? summaryConfigs[key] : 'Sum';
      const summary = group.summaries[key];
      if (index !== 0) {
        offsetLeft += summaryColumns[index - 1].width;
      }

      return (
        <GroupHeaderCell
          key={key}
          ref={this.setHeaderCellRef(key)}
          firstColumnWidth={firstColumnWidth}
          groupOffsetLeft={groupOffsetLeft}
          isLastFrozenColumn={key === lastFrozenColumnKey}
          offsetLeft={offsetLeft}
          column={column}
          isExpanded={isExpanded}
          summary={summary}
          summaryMethod={summaryMethod}
        />
      );
    });
  };

  render() {
    return (
      <div className="group-header-right" style={{ height: GROUP_HEADER_HEIGHT }}>
        {this.getGroupSummaries()}
      </div>
    );
  }
}

GroupHeaderRight.propTypes = {
  group: PropTypes.object,
  isExpanded: PropTypes.bool,
  groupOffsetLeft: PropTypes.number,
  lastFrozenColumnKey: PropTypes.string,
  columns: PropTypes.array,
  summaryConfigs: PropTypes.object,
};

export default GroupHeaderRight;
