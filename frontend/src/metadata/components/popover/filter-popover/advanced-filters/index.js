import React, { Component } from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import FilterItem from './filter-item';
import { ValidateFilter } from '../../../../utils/validate';
import { getColumnByKey } from '../../../../utils/column';
import { FILTER_COLUMN_OPTIONS } from '../../../../constants';
import FilterItemUtils from './filter-item-utils';

import './index.css';

const propTypes = {
  readOnly: PropTypes.bool,
  className: PropTypes.string,
  filters: PropTypes.array,
  columns: PropTypes.array.isRequired,
  filterConjunction: PropTypes.string.isRequired,
  updateFilter: PropTypes.func.isRequired,
  deleteFilter: PropTypes.func.isRequired,
  modifyFilterConjunction: PropTypes.func,
  emptyPlaceholder: PropTypes.string,
  value: PropTypes.object,
  collaborators: PropTypes.array,
  scheduleUpdate: PropTypes.func,
  isPre: PropTypes.bool,
};

class AdvancedFilters extends Component {

  constructor(props) {
    super(props);
    this.conjunctionOptions = null;
    this.columnOptions = null;
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.columns !== this.props.columns) {
      this.columnOptions = null;
    }
  }

  updateFilter = (filterIndex, updatedFilter) => {
    if (!updatedFilter) return;
    this.props.updateFilter(filterIndex, updatedFilter);
  };

  deleteFilter = (index) => {
    const { scheduleUpdate } = this.props;
    this.props.deleteFilter(index, scheduleUpdate);
  };

  updateConjunction = (filterConjunction) => {
    this.props.modifyFilterConjunction(filterConjunction);
  };

  getConjunctionOptions = () => {
    if (!this.conjunctionOptions) {
      this.conjunctionOptions = FilterItemUtils.generatorConjunctionOptions();
    }
    return this.conjunctionOptions;
  };

  getFilterColumns = () => {
    const { columns } = this.props;
    return columns.filter(column => {
      let { type } = column;
      return Object.prototype.hasOwnProperty.call(FILTER_COLUMN_OPTIONS, type);
    });
  };

  getColumnOptions = () => {
    if (!this.columnOptions) {
      const filterColumns = this.getFilterColumns();
      this.columnOptions = filterColumns.map(column => {
        return FilterItemUtils.generatorColumnOption(column);
      });
    }
    return this.columnOptions;
  };

  renderFilterItem = (filter, index, errMsg, filterColumn) => {
    const { readOnly, filterConjunction, value } = this.props;
    const conjunctionOptions = this.getConjunctionOptions();
    const columnOptions = this.getColumnOptions();
    return (
      <FilterItem
        key={index}
        readOnly={readOnly}
        index={index}
        filter={filter}
        errMsg={errMsg}
        filterColumn={filterColumn}
        filterConjunction={filterConjunction}
        conjunctionOptions={conjunctionOptions}
        filterColumnOptions={columnOptions}
        value={value}
        deleteFilter={this.deleteFilter}
        updateFilter={this.updateFilter}
        updateConjunction={this.updateConjunction}
        collaborators={this.props.collaborators}
        isPre={this.props.isPre}
      />
    );
  };

  render() {
    let { filters, className, emptyPlaceholder, columns } = this.props;
    const isEmpty = filters.length === 0;
    return (
      <div className={classnames('sf-metadata-filters-list', { 'empty-filters-container': isEmpty }, { [className]: className })}>
        {isEmpty && <div className="empty-filters-list">{emptyPlaceholder}</div>}
        {!isEmpty &&
          filters.map((filter, index) => {
            const { column_key } = filter;
            const { error_message } = ValidateFilter.validate(filter, columns);
            const filterColumn = getColumnByKey(columns, column_key) || {};
            return this.renderFilterItem(filter, index, error_message, filterColumn);
          })
        }
      </div>
    );
  }
}

AdvancedFilters.propTypes = propTypes;

export default AdvancedFilters;
