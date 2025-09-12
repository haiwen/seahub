import React, { Component } from 'react';
import PropTypes from 'prop-types';
import isHotkey from 'is-hotkey';
import { FormGroup, Label, UncontrolledPopover } from 'reactstrap';
import CommonAddTool from '../../../../components/common-add-tool';
import AdvancedFilters from './advanced-filters';
import BasicFilters from './basic-filters';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE, FILTER_COLUMN_OPTIONS } from '../../../constants';
import { getValidFilters, getFilterByColumn } from '../../../utils/filter';
import { getEventClassName } from '../../../../utils/dom';

import './index.css';

/**
 * filter = {
 *  column_key: '',
 *  filter_predicate: '',
 *  filter_term: '',
 *  filter_term_modifier: '',
 * }
 */
class FilterPopover extends Component {

  constructor(props) {
    super(props);
    this.state = {
      basicFilters: props.basicFilters,
      filters: getValidFilters(props.filters, props.columns),
      filterConjunction: props.filterConjunction || 'And',
      isChanged: false,
    };
    this.isSelectOpen = false;
  }

  componentDidMount() {
    this.dtablePopoverRef && this.dtablePopoverRef.click();
    document.addEventListener('click', this.hideDTablePopover, true);
    document.addEventListener('keydown', this.onHotKey);
    this.unsubscribeOpenSelect = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.OPEN_SELECT, this.setSelectStatus);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideDTablePopover, true);
    document.removeEventListener('keydown', this.onHotKey);
    this.unsubscribeOpenSelect();
  }

  onClosePopover = () => {
    const { readOnly } = this.props;
    const { isChanged, filters, filterConjunction, basicFilters } = this.state;
    if (!readOnly && isChanged) {
      const update = { filters, filter_conjunction: filterConjunction, basic_filters: basicFilters };
      this.props.update(update);
    }
    this.props.hidePopover();
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

  hideDTablePopover = (e) => {
    if (this.dtablePopoverRef && !getEventClassName(e).includes('popover') && !this.dtablePopoverRef.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      this.onClosePopover();
      return false;
    }
  };

  update = (filters) => {
    this.setState({ filters, isChanged: true });
  };

  deleteFilter = (filterIndex, scheduleUpdate) => {
    const filters = this.state.filters.slice(0);
    filters.splice(filterIndex, 1);
    if (filters.length === 0) {
      scheduleUpdate();
    }
    this.update(filters);
  };

  updateFilter = (filterIndex, updated) => {
    const filters = this.state.filters.slice(0);
    filters[filterIndex] = updated;
    this.update(filters);
  };

  modifyFilterConjunction = (conjunction) => {
    this.setState({ filterConjunction: conjunction, isChanged: true });
  };

  addFilter = (scheduleUpdate) => {
    let { columns } = this.props;
    let defaultColumn = columns[0];
    if (!FILTER_COLUMN_OPTIONS[defaultColumn.type]) {
      defaultColumn = columns.find((c) => FILTER_COLUMN_OPTIONS[c.type]);
    }
    if (!defaultColumn) return;
    let filter = getFilterByColumn(defaultColumn);
    const filters = this.state.filters.slice(0);
    if (filters.length === 0) {
      scheduleUpdate();
    }
    filters.push(filter);
    this.update(filters);
  };

  onPopoverInsideClick = (e) => {
    e.stopPropagation();
  };

  onBasicFilterChange = (value) => {
    this.setState({ basicFilters: value, isChanged: true });
  };

  render() {
    const { readOnly, target, columns, placement = 'auto-start', viewType, filtersClassName = '' } = this.props;
    const { filters, filterConjunction, basicFilters } = this.state;
    const canAddFilter = columns.length > 0;
    return (
      <UncontrolledPopover
        placement={placement}
        isOpen={true}
        target={target}
        fade={false}
        hideArrow={true}
        className="sf-metadata-filter-popover"
        boundariesElement={document.body}
      >
        {({ update: scheduleUpdate }) => (
          <div ref={ref => this.dtablePopoverRef = ref} onClick={this.onPopoverInsideClick} className={filtersClassName}>
            <BasicFilters readOnly={readOnly} filters={basicFilters} onChange={this.onBasicFilterChange} viewType={viewType} />
            <FormGroup className="filter-group-advanced filter-group mb-0">
              <Label className="filter-group-name">{gettext('Advanced')}</Label>
              <div className="filter-group-container">
                <AdvancedFilters
                  filterConjunction={filterConjunction}
                  filters={filters}
                  columns={columns}
                  emptyPlaceholder={gettext('No filters')}
                  updateFilter={this.updateFilter}
                  deleteFilter={this.deleteFilter}
                  modifyFilterConjunction={this.modifyFilterConjunction}
                  collaborators={this.props.collaborators}
                  readOnly={readOnly}
                  scheduleUpdate={scheduleUpdate}
                  isPre={this.props.isPre}
                />
              </div>
            </FormGroup>
            {!readOnly && (
              <div className="sf-metadata-filter-popover-add-btns">
                <CommonAddTool
                  className={`popover-add-tool ${canAddFilter ? '' : 'disabled'}`}
                  callBack={canAddFilter ? () => this.addFilter(scheduleUpdate) : () => { }}
                  footerName={gettext('Add filter')}
                  addIconClassName="popover-add-icon"
                />
              </div>
            )}
          </div>
        )}
      </UncontrolledPopover>
    );
  }
}

FilterPopover.propTypes = {
  placement: PropTypes.string,
  filtersClassName: PropTypes.string,
  target: PropTypes.string.isRequired,
  readOnly: PropTypes.bool,
  columns: PropTypes.array.isRequired,
  filterConjunction: PropTypes.string,
  filters: PropTypes.array,
  collaborators: PropTypes.array,
  isPre: PropTypes.bool,
  basicFilters: PropTypes.array,
  hidePopover: PropTypes.func,
  update: PropTypes.func,
  viewType: PropTypes.string,
};

export default FilterPopover;
