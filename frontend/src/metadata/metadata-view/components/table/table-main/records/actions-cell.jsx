import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Tooltip } from 'reactstrap';
import { SEQUENCE_COLUMN_WIDTH } from '../../../../constants';
import { isMobile, gettext } from '../../../../utils';
import { Icon } from '@seafile/sf-metadata-ui-component';

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

  render() {
    const { isSelected, isLastFrozenCell, index, height, recordId } = this.props;
    const cellStyle = {
      height,
      width: SEQUENCE_COLUMN_WIDTH,
      minWidth: SEQUENCE_COLUMN_WIDTH,
    };
    return (
      <div
        className={classnames('sf-metadata-result-table-cell column actions-cell', { 'table-last--frozen': isLastFrozenCell })}
        id={`action-cell-${recordId}`}
        style={{ ...cellStyle }}
        onMouseEnter={this.onCellMouseEnter}
        onMouseLeave={this.onCellMouseLeave}
      >
        {!isSelected && <div className="sf-metadata-result-column-content row-index text-truncate">{index + 1}</div>}
        <div className='sf-metadata-result-column-content actions-checkbox'>
          <div className='select-cell-checkbox-container' onClick={this.props.onSelectRecord}>
            <input
              className='select-cell-checkbox'
              type='checkbox'
              name='row-selection'
              checked={isSelected || false}
              readOnly
            />
            <label htmlFor="select-cell-checkbox" name={gettext('Select')} title={gettext('Select')} aria-label={gettext('Select')}></label>
          </div>
        </div>
        <span className='rdg-row-expand-icon' onClick={this.props.onRowExpand}>
          <Icon iconName="open" />
        </span>
        {/* {this.getLockedRowTooltip()} */}
      </div>
    );
  }
}

ActionsCell.propTypes = {
  isLocked: PropTypes.bool,
  isSelected: PropTypes.bool,
  isLastFrozenCell: PropTypes.bool,
  recordId: PropTypes.string,
  index: PropTypes.number,
  height: PropTypes.number,
  onSelectRecord: PropTypes.func,
  onRowExpand: PropTypes.func,
};

export default ActionsCell;
