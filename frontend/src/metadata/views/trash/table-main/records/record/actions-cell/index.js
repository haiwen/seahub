import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Tooltip } from 'reactstrap';
import { gettext } from '../../../../../../../utils/constants';
import { isMobile, Utils } from '../../../../../../../utils/utils';
import { SEQUENCE_COLUMN_WIDTH } from '../../../../../../constants';
import IconBtn from '../../../../../../../components/icon-btn';

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

  handleShowExpandedProps = () => {
    this.props.onShowExpandedPropsDialog(this.props.recordId);
  };

  render() {
    const { isSelected, isLastFrozenCell, index, height, recordId } = this.props;
    const cellStyle = {
      height,
      width: SEQUENCE_COLUMN_WIDTH,
      minWidth: SEQUENCE_COLUMN_WIDTH,
    };
    const enableExpandRow = false;
    return (
      <div
        className={classnames('sf-metadata-result-table-cell column actions-cell', { 'table-last--frozen': isLastFrozenCell })}
        id={`action-cell-${recordId}`}
        style={{ ...cellStyle }}
        onMouseEnter={this.onCellMouseEnter}
        onMouseLeave={this.onCellMouseLeave}
      >
        {!isSelected && <div className="sf-metadata-result-column-content row-index text-truncate">{index + 1}</div>}
        <label
          className='sf-metadata-result-column-content actions-checkbox'
          htmlFor={`select-cell-checkbox-${recordId}`}
          title={gettext('Select')}
          aria-label={gettext('Select')}
        >
          <div className='select-cell-checkbox-container'>
            <input
              id={`select-cell-checkbox-${recordId}`}
              className='select-cell-checkbox form-check-input'
              type='checkbox'
              name='row-selection'
              title={gettext('Select')}
              aria-label={gettext('Select')}
              checked={isSelected || false}
              onChange={this.props.onSelectRecord}
              onKeyDown={Utils.onKeyDown}
            />
          </div>
        </label>
        {enableExpandRow &&
        <IconBtn
          symbol="expand"
          className="row-expand"
          iconClassName="row-expand-icon"
          onClick={this.handleShowExpandedProps}
          tabIndex="0"
          role="button"
          onKeyDown={Utils.onKeyDown}
        />
        }
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
  onShowExpandedPropsDialog: PropTypes.func,
};

export default ActionsCell;
