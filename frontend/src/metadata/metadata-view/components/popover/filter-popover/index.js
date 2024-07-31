import React, { Component } from 'react';
import PropTypes from 'prop-types';
import isHotkey from 'is-hotkey';
import { Button, UncontrolledPopover } from 'reactstrap';
import { CustomizeAddTool } from '@seafile/sf-metadata-ui-component';
import {
  FILTER_COLUMN_OPTIONS,
  getValidFilters,
} from '../../../_basic';
import { getEventClassName, gettext } from '../../../utils';
import { getFilterByColumn } from '../../../utils/filters-utils';
import FiltersList from './widgets';
import { EVENT_BUS_TYPE } from '../../../constants';

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
      filters: getValidFilters(props.filters, props.columns),
      filterConjunction: props.filterConjunction || 'And',
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

  isNeedSubmit = () => {
    return this.props.isNeedSubmit;
  };

  update = (filters) => {
    if (this.isNeedSubmit()) {
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

  updateFilterConjunction = (conjunction) => {
    if (this.isNeedSubmit()) {
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
    const { filters, filterConjunction } = this.state;
    const update = { filters, filter_conjunction: filterConjunction };
    this.props.update(update);
    this.props.hidePopover();
  };

  onPopoverInsideClick = (e) => {
    e.stopPropagation();
  };

  render() {
    const { target, columns, placement } = this.props;
    const { filters, filterConjunction } = this.state;
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
            <FiltersList
              filterConjunction={filterConjunction}
              filters={filters}
              columns={columns}
              emptyPlaceholder={gettext('No filters')}
              updateFilter={this.updateFilter}
              deleteFilter={this.deleteFilter}
              updateFilterConjunction={this.updateFilterConjunction}
              collaborators={this.props.collaborators}
              readOnly={false}
              scheduleUpdate={scheduleUpdate}
              isPre={this.props.isPre}
            />
            <CustomizeAddTool
              className={`popover-add-tool ${canAddFilter ? '' : 'disabled'}`}
              callBack={canAddFilter ? () => this.addFilter(scheduleUpdate) : () => {}}
              footerName={gettext('Add filter')}
              addIconClassName="popover-add-icon"
            />
            {this.isNeedSubmit() && (
              <div className='sf-metadata-filter-popover-footer'>
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
  isLocked: PropTypes.bool,
  columns: PropTypes.array.isRequired,
  filterConjunction: PropTypes.string,
  filters: PropTypes.array,
  collaborators: PropTypes.array,
  isPre: PropTypes.bool,
  hidePopover: PropTypes.func,
  update: PropTypes.func,
};

export default FilterPopover;
