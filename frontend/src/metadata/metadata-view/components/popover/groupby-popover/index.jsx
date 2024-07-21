import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { UncontrolledPopover, Button } from 'reactstrap';
import {
  COLUMNS_ICON_CONFIG,
  DISPLAY_GROUP_DATE_GRANULARITY,
  DISPLAY_GROUP_GEOLOCATION_GRANULARITY,
  MAX_GROUP_LEVEL,
  SORT_TYPE,
  getColumnByKey,
} from 'sf-metadata-utils';
import CommonAddTool from '../../common/common-add-tool';
import GroupbyItem from '../groupby-popover-widgets/groupby-item';
import GroupbyService from '../../services/groupby-service';
import { isEsc } from '../../utils/hotkey';
import { getEventClassName } from '../../utils/utils';
import { generateDefaultGroupby, getDefaultCountType, getGroupbyColumns } from '../../../utils/groupby-utils';
import eventBus from '../../../../../components/common/event-bus';
import { GROUPBY_ACTION_TYPE, GROUPBY_DATE_GRANULARITY_LIST, GROUPBY_GEOLOCATION_GRANULARITY_LIST } from '../../constants/groupby';
import { EVENT_BUS_TYPE } from '../../../constants';
import { gettext } from '../../../utils';

import './index.css';

class GroupbyPopover extends Component {

  constructor(props) {
    super(props);
    const { groupbys, columns } = this.props;
    this.groupbyService = new GroupbyService({ groupbys });
    this.columnsOptions = this.createColumnsOptions(columns);
    this.geoCountTypeOptions = this.createGeoCountTypeOptions();
    this.dateCountTypeOptions = this.createDateCountTypeOptions();
    this.sortTypeOptions = this.createSortTypeOptions();
    this.state = {
      groupbys: this.groupbyService.getGroupbys(),
    };
    this.isSelectOpen = false;
  }

  componentDidMount() {
    document.addEventListener('click', this.hideDTablePopover, true);
    document.addEventListener('keydown', this.onHotKey);
    this.unsubscribeOpenSelect = eventBus.subscribe(EVENT_BUS_TYPE.OPEN_SELECT, this.setSelectStatus);
  }

  componentDidUpdate(prevProps) {
    const { columns } = this.props;
    if (columns !== prevProps.columns) {
      this.columnsOptions = this.createColumnsOptions(columns);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideDTablePopover, true);
    document.removeEventListener('keydown', this.onHotKey);
    this.unsubscribeOpenSelect();
  }

  hideDTablePopover = (e) => {
    if (this.groupbysWrapper && !getEventClassName(e).includes('popover') && !this.groupbysWrapper.contains(e.target)) {
      this.props.onGroupbyPopoverToggle();
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  onHotKey = (e) => {
    if (isEsc(e) && !this.isSelectOpen) {
      e.preventDefault();
      this.props.onGroupbyPopoverToggle();
    }
  };

  setSelectStatus = (status) => {
    this.isSelectOpen = status;
  };

  createColumnsOptions = (columns = []) => {
    const validColumns = getGroupbyColumns(columns);
    return validColumns.map((column) => {
      const { type, name } = column;
      return {
        value: { column },
        label: (
          <Fragment>
            <span className='column-icon'><i className={COLUMNS_ICON_CONFIG[type]}></i></span>
            <span className='select-option-name'>{name}</span>
          </Fragment>
        )
      };
    });
  };

  createGeoCountTypeOptions = () => {
    return GROUPBY_GEOLOCATION_GRANULARITY_LIST.map(granularity => {
      const displayGranularity = DISPLAY_GROUP_GEOLOCATION_GRANULARITY[granularity];
      if (!displayGranularity) {
        return null;
      }
      return {
        value: { countType: granularity },
        label: <span className='select-option-name'>{gettext(displayGranularity)}</span>,
      };
    }).filter(Boolean);
  };

  createDateCountTypeOptions = () => {
    return GROUPBY_DATE_GRANULARITY_LIST.map(granularity => {
      const displayGranularity = DISPLAY_GROUP_DATE_GRANULARITY[granularity];
      if (!displayGranularity) {
        return null;
      }
      return {
        value: { countType: granularity },
        label: <span className='select-option-name'>{gettext(DISPLAY_GROUP_DATE_GRANULARITY[granularity])}</span>,
      };
    }).filter(Boolean);
  };

  createSortTypeOptions = () => {
    return [
      {
        value: { sortType: SORT_TYPE.UP },
        label: <span className='select-option-name'>{gettext(SORT_TYPE.UP)}</span>
      },
      {
        value: { sortType: SORT_TYPE.DOWN },
        label: <span className='select-option-name'>{gettext(SORT_TYPE.DOWN)}</span>
      },
    ];
  };

  addGroupby = (scheduleUpdate) => {
    const { groupbys } = this.state;
    // When the size of the popover is changed, need use scheduleUpdate to reposition the popover
    if (groupbys.length === 0) {
      scheduleUpdate();
    }
    const groupbyColumns = this.columnsOptions.map(option => option.value.column);
    const groupby = generateDefaultGroupby(groupbyColumns);
    this.groupbyService.update(GROUPBY_ACTION_TYPE.ADD, { groupby });
    this.updateGroups();
  };

  deleteGroupby = (index, event, scheduleUpdate) => {
    event.nativeEvent.stopImmediatePropagation();
    this.groupbyService.update(GROUPBY_ACTION_TYPE.DELETE, { index });
    // use scheduleUpdate to reposition the popover
    scheduleUpdate();
    this.updateGroups();
  };

  isNeedSubmit = () => {
    return this.props.isNeedSubmit;
  };

  selectColumn = ({ column }, index) => {
    const { groupbys } = this.state;
    const updatedGroupby = groupbys[index];
    const newColumnKey = column.key;
    if (newColumnKey === updatedGroupby.column_key) {
      return;
    }
    const newGroupby = {
      ...updatedGroupby,
      column_key: newColumnKey,
      sort_type: SORT_TYPE.UP,
      count_type: getDefaultCountType(column),
    };
    this.groupbyService.update(GROUPBY_ACTION_TYPE.UPDATE, { index, groupby: newGroupby });
    this.updateGroups();
  };

  selectCountType = ({ countType }, index) => {
    const { groupbys } = this.state;
    const updatedGroupby = groupbys[index];
    if (countType === updatedGroupby.count_type) {
      return;
    }
    const newGroupby = {
      ...updatedGroupby,
      count_type: countType,
    };
    this.groupbyService.update(GROUPBY_ACTION_TYPE.UPDATE, { index, groupby: newGroupby });
    this.updateGroups();
  };

  selectSortType = ({ sortType }, index) => {
    const { groupbys } = this.state;
    const updatedGroupby = groupbys[index];
    if (sortType === updatedGroupby.sort_type) {
      return;
    }
    const newGroupby = {
      ...updatedGroupby,
      sort_type: sortType,
    };
    this.groupbyService.update(GROUPBY_ACTION_TYPE.UPDATE, { index, groupby: newGroupby });
    this.updateGroups();
  };

  submitDefaultGroupbys = () => {
    const { groupbys } = this.state;
    this.props.modifyGroupbys(groupbys);
    this.props.onGroupbyPopoverToggle();
  };

  updateGroups = () => {
    const groupbys = this.groupbyService.getGroupbys();
    this.setState({ groupbys }, () => {
      if (this.isNeedSubmit()) return;
      this.props.modifyGroupbys(groupbys);
    });
  };

  onPopoverInsideClick = (e) => {
    e.stopPropagation();
  };

  renderGroupbys = (scheduleUpdate) => {
    const { columns } = this.props;
    const { groupbys } = this.state;
    return groupbys.map((groupby, index) => {
      const column = getColumnByKey(columns, groupby.column_key) || {};
      return (
        <GroupbyItem
          key={'groupby-item-' + index}
          index={index}
          column={column}
          groupby={groupby}
          columnsOptions={this.columnsOptions}
          geoCountTypeOptions={this.geoCountTypeOptions}
          dateCountTypeOptions={this.dateCountTypeOptions}
          sortTypeOptions={this.sortTypeOptions}
          onDeleteGroupby={this.deleteGroupby}
          scheduleUpdate={scheduleUpdate}
          onSelectColumn={this.selectColumn}
          onSelectCountType={this.selectCountType}
          onSelectSortType={this.selectSortType}
        />
      );
    });
  };

  onHideAllGroups = () => {
    eventBus.dispatch(EVENT_BUS_TYPE.COLLAPSE_ALL_GROUPS);
  };

  onShowAllGroups = () => {
    eventBus.dispatch(EVENT_BUS_TYPE.EXPAND_ALL_GROUPS);
  };

  render() {
    const { target } = this.props;
    const { groupbys } = this.state;
    const groupbysLen = Array.isArray(groupbys) ? groupbys.length : 0;
    const isEmpty = groupbysLen === 0;
    return (
      <UncontrolledPopover
        isOpen
        hideArrow
        fade={false}
        target={target}
        placement='bottom-end'
        className='groupby-popover no-user-select'
        boundariesElement={document.body}
      >
        {({ scheduleUpdate }) => (
          <div
            ref={ref => this.groupbysWrapper = ref}
            onClick={this.onPopoverInsideClick}
          >
            <div className={`groupbys ${isEmpty ? 'empty-groupbys-container' : ''}`} >
              {isEmpty ?
                <div className="empty-groupbys">{gettext('No_groupings')}</div> :
                this.renderGroupbys(scheduleUpdate)
              }
            </div>
            {groupbysLen < MAX_GROUP_LEVEL &&
            <CommonAddTool
              callBack={() => this.addGroupby(scheduleUpdate)}
              footerName={gettext('Add group')}
              className='popover-add-tool'
              addIconClassName='popover-add-icon'
            />
            }
            {!isEmpty &&
            <div className="groupbys-tools">
              <span className="groupbys-tool-item" onClick={this.onHideAllGroups}>{gettext('Collapse all')}</span>
              <span className="groupbys-tool-item" onClick={this.onShowAllGroups}>{gettext('Expand all')}</span>
            </div>
            }
            {this.isNeedSubmit() && (
              <div className="d-flex align-items-center justify-content-end p-4 border-top">
                <Button className="mr-2" onClick={this.props.onGroupbyPopoverToggle}>{gettext('Cancel')}</Button>
                <Button color='primary' onClick={this.submitDefaultGroupbys}>{gettext('Submit')}</Button>
              </div>
            )}
          </div>
        )}
      </UncontrolledPopover>
    );
  }
}

GroupbyPopover.propTypes = {
  target: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.node]),
  groupbys: PropTypes.array,
  columns: PropTypes.array,
  onGroupbyPopoverToggle: PropTypes.func,
  modifyGroupbys: PropTypes.func,
  isNeedSubmit: PropTypes.bool,
};

export default GroupbyPopover;
