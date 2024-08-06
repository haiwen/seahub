import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import SelectAll from './select-all';
import { SEQUENCE_COLUMN_WIDTH } from '../../../../../constants';

class ActionsCell extends Component {

  render() {
    const {
      isMobile, hasSelectedRecord, isSelectedAll, isLastFrozenCell, groupOffsetLeft, height
    } = this.props;
    const columnCellClass = 'sf-metadata-result-table-cell column';
    const columnCellStyle = {
      height,
      width: SEQUENCE_COLUMN_WIDTH + groupOffsetLeft,
      minWidth: SEQUENCE_COLUMN_WIDTH + groupOffsetLeft,
    };
    return (
      <div
        className={classnames(columnCellClass, { 'table-last--frozen': isLastFrozenCell })}
        style={{ ...columnCellStyle, backgroundColor: '#f9f9f9' }}
      >
        <SelectAll
          isMobile={isMobile}
          hasSelectedRecord={hasSelectedRecord}
          isSelectedAll={isSelectedAll}
          selectNoneRecords={this.props.selectNoneRecords}
          selectAllRecords={this.props.selectAllRecords}
        />
      </div>
    );
  }
}

ActionsCell.propTypes = {
  isMobile: PropTypes.bool,
  hasSelectedRecord: PropTypes.bool,
  isSelectedAll: PropTypes.bool,
  isLastFrozenCell: PropTypes.bool,
  height: PropTypes.number,
  groupOffsetLeft: PropTypes.number,
  selectNoneRecords: PropTypes.func,
  selectAllRecords: PropTypes.func,
};

export default ActionsCell;
