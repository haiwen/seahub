import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { checkIsColumnFrozen } from '../../../../utils/column';
import { GROUP_HEADER_HEIGHT } from '../../../../constants/group';
import { GROUP_FROZEN_HEADER as Z_INDEX_GROUP_FROZEN_HEADER } from '../../../../constants/z-index';

class GroupHeaderCell extends React.PureComponent {

  fixedFrozenDOMs = (scrollLeft, scrollTop) => {
    if (this.headerCell) {
      const { firstColumnWidth, groupOffsetLeft, sequenceColumnWidth } = this.props;
      this.headerCell.style.position = 'fixed';
      this.headerCell.style.marginLeft = (sequenceColumnWidth + firstColumnWidth + groupOffsetLeft) + 'px';
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
    if (checkIsColumnFrozen(column)) {
      style.zIndex = Z_INDEX_GROUP_FROZEN_HEADER;
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
