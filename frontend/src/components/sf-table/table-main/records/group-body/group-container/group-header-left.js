import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import IconBtn from '../../../../../icon-btn';
import GroupTitle from './group-title';
import { GROUP_HEADER_HEIGHT } from '../../../../constants/group';
import { GROUP_FROZEN_HEADER as Z_INDEX_GROUP_FROZEN_HEADER } from '../../../../constants/z-index';
import { gettext } from '../../../../../../utils/constants';

class GroupHeaderLeft extends Component {

  render() {
    const {
      isExpanded, firstColumnFrozen, lastColumnFrozen, firstColumnKey, maxLevel,
      group, width,
    } = this.props;
    const { column, count, level, cell_value, original_cell_value } = group;
    let groupHeaderLeftStyle = {
      height: GROUP_HEADER_HEIGHT,
      width,
    };
    if (firstColumnFrozen) {
      groupHeaderLeftStyle.zIndex = Z_INDEX_GROUP_FROZEN_HEADER;
    }

    return (
      <div
        ref={ref => this.groupHeaderLeft = ref}
        className={classnames('group-header-left group-header-cell', { 'table-last--frozen': lastColumnFrozen })}
        style={groupHeaderLeftStyle}
        data-column_key={firstColumnKey}
      >
        <IconBtn
          className={classnames('group-toggle-btn', { 'hide': !isExpanded })}
          symbol="drop-down"
          onClick={this.props.onExpandGroupToggle}
        />
        <GroupTitle
          column={column || {}}
          originalCellValue={original_cell_value}
          cellValue={cell_value}
        />
        <div className="group-rows-count">
          <div className="group-rows-count-content">
            {level === maxLevel && <span className="count-title">{gettext('Count')}</span>}
            <span className="count-num">{count}</span>
          </div>
        </div>
      </div>
    );
  }
}

GroupHeaderLeft.propTypes = {
  isExpanded: PropTypes.bool,
  firstColumnFrozen: PropTypes.bool,
  lastColumnFrozen: PropTypes.bool,
  firstColumnKey: PropTypes.string,
  maxLevel: PropTypes.number,
  group: PropTypes.object,
  formulaRow: PropTypes.object,
  width: PropTypes.number,
  onExpandGroupToggle: PropTypes.func,
};

export default GroupHeaderLeft;
