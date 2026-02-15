import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Tooltip } from 'reactstrap';
import { isMobile, Utils } from '../../../../../../utils/utils';
import { gettext } from '../../../../../../utils/constants';
import { SEQUENCE_COLUMN_WIDTH } from '../../../../constants/grid';

import './index.css';

class ActionsCell extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isLockedRowTooltipShow: false,
    };
  }

  onCellMouseEnter = () => {
    const { isLocked } = this.props;
    if (!isLocked || isMobile) return;
    this.timer = setTimeout(() => {
      this.setState({ isLockedRowTooltipShow: true });
    }, 500);
  };

  onCellMouseLeave = () => {
    const { isLocked } = this.props;
    if (!isLocked || isMobile) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.setState({ isLockedRowTooltipShow: false });
  };

  getLockedRowTooltip = () => {
    const { recordId } = this.props;
    return (
      <Tooltip
        target={`action-cell-${recordId}`}
        placement='bottom'
        isOpen={this.state.isLockedRowTooltipShow}
        fade={false}
        hideArrow={true}
        className="readonly-cell-tooltip"
      >
        {gettext('The row is locked and cannot be modified')}
      </Tooltip>
    );
  };

  getRecordNo = () => {
    return (this.props.showRecordAsTree ? this.props.treeNodeIndex : this.props.index) + 1;
  };

  render() {
    const { isSelected, isLastFrozenCell, height, recordId, canModify = true, recordDraggable } = this.props;
    const cellStyle = {
      height,
      width: SEQUENCE_COLUMN_WIDTH,
      minWidth: SEQUENCE_COLUMN_WIDTH,
    };
    return (
      <div
        className={classnames('sf-table-cell column actions-cell', { 'table-last--frozen': isLastFrozenCell })}
        id={`action-cell-${recordId}`}
        style={{ ...cellStyle }}
        onMouseEnter={this.onCellMouseEnter}
        onMouseLeave={this.onCellMouseLeave}
      >
        {(recordDraggable && canModify) &&
          <div
            draggable
            className="drag-handler"
            onDragStart={this.props.handleDragStart}
          >
          </div>
        }
        {!isSelected && <div className="sf-table-column-content row-index text-truncate">{this.getRecordNo()}</div>}
        <label
          className="sf-table-column-content actions-checkbox"
          htmlFor={`select-cell-checkbox-${recordId}`}
          title={gettext('Select')}
          aria-label={gettext('Select')}
        >
          <div className="select-cell-checkbox-container">
            <input
              id={`select-cell-checkbox-${recordId}`}
              className="select-cell-checkbox form-check-input"
              type='checkbox'
              name='row-selection'
              checked={isSelected || false}
              onChange={this.props.onSelectRecord}
              onKeyDown={Utils.onKeyDown}
            />
          </div>
        </label>
        {/* {this.getLockedRowTooltip()} */}
      </div>
    );
  }
}

ActionsCell.propTypes = {
  isLocked: PropTypes.bool,
  isSelected: PropTypes.bool,
  isLastFrozenCell: PropTypes.bool,
  recordDraggable: PropTypes.bool,
  recordId: PropTypes.string,
  index: PropTypes.number,
  height: PropTypes.number,
  onSelectRecord: PropTypes.func,
  handleDragStart: PropTypes.func,
  canModify: PropTypes.bool,
};

export default ActionsCell;
