import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { isFrozen } from '../../../../../../utils/column';
import { GROUP_HEADER_HEIGHT, SEQUENCE_COLUMN_WIDTH, metadataZIndexes } from '../../../../../../constants';

class GroupHeaderCell extends React.PureComponent {

  fixedFrozenDOMs = (scrollLeft, scrollTop) => {
    if (this.headerCell) {
      const { firstColumnWidth, groupOffsetLeft } = this.props;
      this.headerCell.style.position = 'fixed';
      this.headerCell.style.marginLeft = (SEQUENCE_COLUMN_WIDTH + firstColumnWidth + groupOffsetLeft) + 'px';
      this.headerCell.style.marginTop = (-scrollTop) + 'px';
    }
  };

  cancelFixFrozenDOMs = (scrollLeft) => {
    if (this.headerCell) {
      this.headerCell.style.position = 'absolute';
      this.headerCell.style.marginLeft = scrollLeft + 'px';
      this.headerCell.style.marginTop = 0;
    }
  };

  getStyle = () => {
    let { offsetLeft, column, isExpanded } = this.props;
    const style = {
      position: 'absolute',
      width: column.width,
      height: GROUP_HEADER_HEIGHT - (isExpanded ? 1 : 2), // header height - border-top(1px) - !isExpanded && border-bottom(1px)
      left: offsetLeft
    };
    if (isFrozen(column)) {
      style.zIndex = metadataZIndexes.GROUP_FROZEN_HEADER;
    }
    return style;
  };

  render() {
    const { column, isLastFrozenColumn } = this.props;
    return (
      <div
        ref={ref => this.headerCell = ref}
        className={classnames('summary-item group-header-cell', {
          'table-last--frozen': isLastFrozenColumn
        })}
        style={this.getStyle()}
        data-column_key={column.key}
      >
      </div>
    );
  }
}

GroupHeaderCell.propTypes = {
  column: PropTypes.object.isRequired,
  isExpanded: PropTypes.bool,
  isLastFrozenColumn: PropTypes.bool,
  firstColumnWidth: PropTypes.number,
  offsetLeft: PropTypes.number.isRequired,
  groupOffsetLeft: PropTypes.number,
  summary: PropTypes.object,
  summaryMethod: PropTypes.string,
};

export default GroupHeaderCell;
