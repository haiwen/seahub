import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'reactstrap';
import { CustomizeSelect } from '@seafile/sf-metadata-ui-component';
import {
  COLUMNS_ICON_CONFIG,
  SORT_COLUMN_OPTIONS,
  isDateColumn,
} from '../../../_basic';
import { getSelectedCountType, isShowGroupCountType } from '../../../utils/groupby-utils';
import { gettext } from '../../../utils';

class GroupbyItem extends Component {

  constructor(props) {
    super(props);
    this.state = {
      tooltipOpen: false
    };
    this.filterToolTip = React.createRef();
  }

  toggleTipMessage = () => {
    this.setState({ tooltipOpen: !this.state.tooltipOpen });
  };

  getCountTypeOptions = (column) => {
    const { dateCountTypeOptions } = this.props;
    if (isDateColumn(column)) {
      return dateCountTypeOptions;
    }
  };

  renderTipMessage = () => {
    const { column, view } = this.props;
    const { tooltipOpen } = this.state;
    const { shown_column_keys } = view || {};

    if (!shown_column_keys || !Array.isArray(shown_column_keys) || shown_column_keys.includes(column.key)) {
      return null;
    }

    return (
      <div className="ml-2">
        <span ref={this.filterToolTip} className="sf-metadata-font sf-metadata-icon-exclamation-triangle"></span>
        <Tooltip placement="bottom" isOpen={tooltipOpen} target={this.filterToolTip} toggle={this.toggleTipMessage}>
          {gettext('Group tip message')}
        </Tooltip>
      </div>
    );
  };

  render() {
    const { index, column, groupby, columnsOptions, sortTypeOptions, scheduleUpdate } = this.props;
    const { name, type: columnType } = column;
    const { sort_type } = groupby;
    const selectedColumn = {
      label: (
        <Fragment>
          <span className='column-icon'><i className={COLUMNS_ICON_CONFIG[columnType]}></i></span>
          <span className='select-option-name' title={name} aria-label={name}>{name}</span>
        </Fragment>
      )
    };
    const countTypeOptions = this.getCountTypeOptions(column);
    const selectedCountType = getSelectedCountType(column, groupby.count_type);
    const selectedSortType = sort_type && sortTypeOptions.find(option => option.value.sortType === sort_type);
    return (
      <div className='groupby-item'>
        <div className='delete-groupby' onClick={(e) => this.props.onDeleteGroupby(index, e, scheduleUpdate)}>
          <i className='sf-metadata-font sf-metadata-icon-fork-number'></i>
        </div>
        <div className='condition'>
          <div className='groupby-column'>
            <CustomizeSelect
              value={selectedColumn}
              onSelectOption={(value) => this.props.onSelectColumn(value, index)}
              options={columnsOptions}
              searchable={true}
              searchPlaceholder={gettext('Search column')}
              noOptionsPlaceholder={gettext('No results')}
            />
          </div>
          {isShowGroupCountType(column) && (
            <div className='groupby-count-type ml-2'>
              <CustomizeSelect
                value={selectedCountType ? { label: <span className='select-option-name'>{gettext(selectedCountType)}</span> } : ''}
                onSelectOption={(value) => this.props.onSelectCountType(value, index)}
                options={countTypeOptions}
              />
            </div>
          )}
          <div className='groupby-predicate ml-2'>
            {(!column.key || SORT_COLUMN_OPTIONS.includes(columnType)) &&
              <CustomizeSelect
                value={selectedSortType}
                onSelectOption={(value) => this.props.onSelectSortType(value, index)}
                options={sortTypeOptions}
              />
            }
          </div>
          {this.renderTipMessage()}
        </div>
      </div>
    );
  }
}

GroupbyItem.propTypes = {
  index: PropTypes.number,
  column: PropTypes.object,
  view: PropTypes.object,
  groupby: PropTypes.object,
  columnsOptions: PropTypes.array,
  geoCountTypeOptions: PropTypes.array,
  dateCountTypeOptions: PropTypes.array,
  sortTypeOptions: PropTypes.array,
  onDeleteGroupby: PropTypes.func,
  onSelectColumn: PropTypes.func,
  onSelectCountType: PropTypes.func,
  onSelectSortType: PropTypes.func,
  scheduleUpdate: PropTypes.func,
};

export default GroupbyItem;
