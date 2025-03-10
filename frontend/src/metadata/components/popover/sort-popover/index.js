import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import isHotkey from 'is-hotkey';
import { UncontrolledPopover } from 'reactstrap';
import CustomizeSelect from '../../../../components/customize-select';
import CommonAddTool from '../../../../components/common-add-tool';
import Icon from '../../../../components/icon';
import { gettext } from '../../../../utils/constants';
import { getColumnByKey } from '../../../utils/column';
import { getEventClassName } from '../../../../utils/dom';
import {
  EVENT_BUS_TYPE, COLUMNS_ICON_CONFIG, VIEW_SORT_COLUMN_RULES, VIEW_FIRST_SORT_COLUMN_RULES, SORT_TYPE, VIEW_TYPE,
} from '../../../constants';
import { execSortsOperation, getDisplaySorts, isSortsEmpty, SORT_OPERATION } from './utils';

import './index.css';

const SORT_TYPES = [
  {
    name: gettext('Up'),
    value: SORT_TYPE.UP,
  }, {
    name: gettext('Down'),
    value: SORT_TYPE.DOWN,
  },
];

const propTypes = {
  readOnly: PropTypes.bool,
  target: PropTypes.string.isRequired,
  type: PropTypes.string,
  sorts: PropTypes.array,
  columns: PropTypes.array.isRequired,
  hidePopover: PropTypes.func,
  update: PropTypes.func,
};

class SortPopover extends Component {

  constructor(props) {
    super(props);
    const { sorts, columns, type } = this.props;
    this.sortTypeOptions = this.createSortTypeOptions();
    this.checkColumnEnableFirstSortRule = VIEW_FIRST_SORT_COLUMN_RULES[type || VIEW_TYPE.TABLE];
    this.checkColumnEnableSortRule = VIEW_SORT_COLUMN_RULES[type || VIEW_TYPE.TABLE];
    this.columnsOptions = this.createColumnsOptions(columns);
    this.state = {
      sorts: getDisplaySorts(sorts, columns),
      isChanged: false,
    };
    this.isSelectOpen = false;
  }

  componentDidMount() {
    document.addEventListener('click', this.hideDTablePopover, true);
    document.addEventListener('keydown', this.onHotKey);
    this.unsubscribeOpenSelect = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.OPEN_SELECT, this.setSelectStatus);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideDTablePopover, true);
    document.removeEventListener('keydown', this.onHotKey);
    this.unsubscribeOpenSelect();
  }

  hideDTablePopover = (e) => {
    if (this.sortPopoverRef && !getEventClassName(e).includes('popover') && !this.sortPopoverRef.contains(e.target)) {
      this.onClosePopover();
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  onHotKey = (e) => {
    if (isHotkey('esc', e) && !this.isSelectOpen) {
      e.preventDefault();
      this.onClosePopover();
    }
  };

  setSelectStatus = (status) => {
    this.isSelectOpen = status;
  };

  UNSAFE_componentWillReceiveProps(nextProps) {
    const newColumns = nextProps.columns;
    if (newColumns !== this.props.columns) {
      this.columnsOptions = this.createColumnsOptions(newColumns);
    }
  }

  addSort = () => {
    const { sorts } = this.state;
    const newSorts = execSortsOperation(SORT_OPERATION.ADD_SORT, { sorts });
    this.updateSorts(newSorts);
  };

  deleteSort = (event, index) => {
    event.nativeEvent.stopImmediatePropagation();
    const sorts = this.state.sorts.slice(0);
    const newSorts = execSortsOperation(SORT_OPERATION.DELETE_SORT, { sorts, index });
    this.updateSorts(newSorts);
  };

  onSelectColumn = (value, index) => {
    const sorts = this.state.sorts.slice(0);
    const newColumnKey = value.column.key;
    if (newColumnKey === sorts[index].column_key) {
      return;
    }
    const newSorts = execSortsOperation(SORT_OPERATION.MODIFY_SORT_COLUMN, { sorts, index, column_key: newColumnKey });
    this.updateSorts(newSorts);
  };

  onSelectSortType = (value, index) => {
    const sorts = this.state.sorts.slice(0);
    const newSortType = value.sortType;
    if (newSortType === sorts[index].sort_type) {
      return;
    }
    const newSorts = execSortsOperation(SORT_OPERATION.MODIFY_SORT_TYPE, { sorts, index, sort_type: newSortType });
    this.updateSorts(newSorts);
  };

  updateSorts = (sorts) => {
    this.setState({ sorts, isChanged: true });
  };

  onClosePopover = () => {
    const { sorts, isChanged } = this.state;
    if (isChanged) {
      this.props.update({ sorts });
    }
    this.props.hidePopover();
  };

  createColumnsOptions = (columns = []) => {
    const sortableColumns = columns.filter(column => this.checkColumnEnableSortRule(column));
    return sortableColumns.map((column) => {
      const { type, name } = column;
      return {
        value: { column },
        label: (
          <Fragment>
            <span className="sf-metadata-filter-header-icon"><Icon className="sf-metadata-icon" symbol={COLUMNS_ICON_CONFIG[type]} /></span>
            <span className=''>{name}</span>
          </Fragment>
        )
      };
    });
  };

  createSortTypeOptions = () => {
    return SORT_TYPES.map(sortType => {
      return {
        value: { sortType: sortType.value },
        label: <span className="select-option-name">{sortType.name}</span>
      };
    });
  };

  renderSortsList = () => {
    const { columns } = this.props;
    const { sorts } = this.state;
    return sorts.map((sort, index) => {
      const column = getColumnByKey(columns, sort.column_key) || {};
      return this.renderSortItem(column, sort, index);
    });
  };

  renderSortItem = (column, sort, index) => {
    const { name, type } = column;
    const { readOnly = false, type: viewType } = this.props;
    const selectedColumn = {
      label: (
        <Fragment>
          <span className="sf-metadata-filter-header-icon"><Icon className="sf-metadata-icon" symbol={COLUMNS_ICON_CONFIG[type]} /></span>
          <span className="select-option-name" title={name} aria-label={name}>{name}</span>
        </Fragment>
      )
    };

    const selectedType = sort.sort_type;
    const selectedTypeOption = SORT_TYPES.find(sortType => sortType.value === selectedType);
    const selectedSortType = selectedType && {
      label: <span className="select-option-name">{selectedTypeOption?.name || gettext('Up')}</span>
    };

    let columnsOptions = this.columnsOptions;
    if (index === 0) {
      columnsOptions = columnsOptions.filter(o => this.checkColumnEnableFirstSortRule(o.value.column));
    }

    return (
      <div key={'sort-item-' + index} className="sort-item">
        {!readOnly &&
          <div className="delete-sort" onClick={(viewType === VIEW_TYPE.GALLERY && index === 0) ? () => {} : (event) => this.deleteSort(event, index)}>
            {!(viewType === VIEW_TYPE.GALLERY && index === 0) && <Icon className="sf-metadata-icon" symbol="fork-number"/>}
          </div>
        }
        <div className="condition">
          <div className="sort-column">
            <CustomizeSelect
              readOnly={readOnly}
              value={selectedColumn}
              onSelectOption={(value) => this.onSelectColumn(value, index)}
              options={columnsOptions}
              searchable={true}
              searchPlaceholder={gettext('Search property')}
              noOptionsPlaceholder={gettext('No results')}
            />
          </div>
          <div className="sort-predicate ml-2">
            <CustomizeSelect
              readOnly={readOnly}
              value={selectedSortType}
              onSelectOption={(value) => this.onSelectSortType(value, index)}
              options={this.sortTypeOptions}
            />
          </div>
        </div>
      </div>
    );
  };

  onPopoverInsideClick = (e) => {
    e.stopPropagation();
  };

  render() {
    const { target, readOnly = false } = this.props;
    const { sorts } = this.state;
    const isEmpty = isSortsEmpty(sorts);
    return (
      <UncontrolledPopover
        placement="bottom-end"
        isOpen={true}
        target={target}
        fade={false}
        hideArrow={true}
        className="sf-metadata-sort-popover"
        boundariesElement={document.body}
      >
        <div ref={ref => this.sortPopoverRef = ref} onClick={this.onPopoverInsideClick}>
          <div className={`sorts-list ${isEmpty ? 'empty-sorts-container' : ''}`} >
            {isEmpty ?
              <div className="empty-sorts-list">{gettext('No sorts')}</div> :
              this.renderSortsList()
            }
          </div>
          {!readOnly &&
            <CommonAddTool
              callBack={this.addSort}
              footerName={gettext('Add sort')}
              className="popover-add-tool"
              addIconClassName="popover-add-icon"
            />
          }
        </div>
      </UncontrolledPopover>
    );
  }
}

SortPopover.propTypes = propTypes;

export default SortPopover;
