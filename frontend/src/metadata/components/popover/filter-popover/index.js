import React, { Component } from 'react';
import PropTypes from 'prop-types';
import isHotkey from 'is-hotkey';
import { Button, FormGroup, Label, UncontrolledPopover } from 'reactstrap';
import { CustomizeAddTool } from '@seafile/sf-metadata-ui-component';
import AdvancedFilters from './advanced-filters';
import BasicFilters from './basic-filters';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE, FILTER_COLUMN_OPTIONS } from '../../../constants';
import { getValidFilters, getFilterByColumn } from '../../../utils/filter';
import { getEventClassName } from '../../../utils/common';

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

  static defaultProps = {
    filtersClassName: '',
    placement: 'auto-start',
  };

  constructor(props) {
    super(props);
    this.state = {
      basicFilters: props.basicFilters,
      filters: getValidFilters(props.filters, props.columns),
      filterConjunction: props.filterConjunction || 'And',
      isSubmitDisabled: true,
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

  onHotKey = (e) => {
    if (isHotkey('esc', e) && !this.isSelectOpen) {
      e.preventDefault();
      this.props.hidePopover();
    }
  };

  setSelectStatus = (status) => {
    this.isSelectOpen = status;
  };

  hideDTablePopover = (e) => {
    if (this.dtablePopoverRef && !getEventClassName(e).includes('popover') && !this.dtablePopoverRef.contains(e.target)) {
      this.props.hidePopover(e);
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  };

  update = (filters) => {
    if (this.props.isNeedSubmit) {
      const isSubmitDisabled = false;
      this.setState({ filters, isSubmitDisabled });
      return;
    }
    this.setState({ filters }, () => {
      const update = { filters, filter_conjunction: this.state.filterConjunction };
      this.props.update(update);
    });
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
    if (this.props.isNeedSubmit) {
      const isSubmitDisabled = false;
      this.setState({ filterConjunction: conjunction, isSubmitDisabled });
      return;
    }
    this.setState({ filterConjunction: conjunction }, () => {
      const update = { filters: this.state.filters, filter_conjunction: conjunction };
      this.props.update(update);
    });
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

  onClosePopover = () => {
    this.props.hidePopover();
  };

  onSubmitFilters = () => {
    const { filters, filterConjunction, basicFilters } = this.state;
    const update = { filters, filter_conjunction: filterConjunction, basic_filters: basicFilters };
    this.props.update(update);
    this.props.hidePopover();
  };

  onPopoverInsideClick = (e) => {
    e.stopPropagation();
  };

  onBasicFilterChange = (value) => {
    if (this.props.isNeedSubmit) {
      const isSubmitDisabled = false;
      this.setState({ basicFilters: value, isSubmitDisabled });
      return;
    }
    this.setState({ basicFilters: value }, () => {
      const update = { filters: this.state.filters, filter_conjunction: this.state.filterConjunction, basic_filters: value };
      this.props.update(update);
    });
  };

  render() {
    const { readOnly, target, columns, placement, viewType } = this.props;
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
        {({ scheduleUpdate }) => (
          <div ref={ref => this.dtablePopoverRef = ref} onClick={this.onPopoverInsideClick} className={this.props.filtersClassName}>
            <BasicFilters filters={basicFilters} onChange={this.onBasicFilterChange} viewType={viewType}/>
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
                {!readOnly && (
                  <CustomizeAddTool
                    className={`popover-add-tool ${canAddFilter ? '' : 'disabled'}`}
                    callBack={canAddFilter ? () => this.addFilter(scheduleUpdate) : () => {}}
                    footerName={gettext('Add filter')}
                    addIconClassName="popover-add-icon"
                  />
                )}
              </div>
            </FormGroup>
            {!readOnly && this.props.isNeedSubmit && (
              <div className="sf-metadata-popover-footer">
                <Button className='mr-2' onClick={this.onClosePopover}>{gettext('Cancel')}</Button>
                <Button color="primary" disabled={this.state.isSubmitDisabled} onClick={this.onSubmitFilters}>{gettext('Submit')}</Button>
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
  isNeedSubmit: PropTypes.bool,
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
