import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { FormGroup } from 'reactstrap';
import HistoryDateFilter from './date-filter';
import HistoryCreatorFilter from './creator-filter';

import './basic-filters.css';

const HistoryBasicFilters = ({ filters, onChange }) => {

  const onChangeDateFilter = useCallback((newValue) => {
    onChange({ ...filters, date: newValue });
  }, [filters, onChange]);

  const onChangeCreatorFilter = useCallback((newValue) => {
    onChange({ ...filters, creators: newValue });
  }, [filters, onChange]);

  return (
    <FormGroup className="filter-group-basic filter-group p-4">
      <div className="filter-group-container">
        <div className="sf-history-filters-list">
          <HistoryDateFilter
            value={filters.date}
            onChange={onChangeDateFilter}
          />
          <HistoryCreatorFilter
            value={filters.creators}
            onChange={onChangeCreatorFilter}
          />
        </div>
      </div>
    </FormGroup>
  );
};

HistoryBasicFilters.propTypes = {
  filters: PropTypes.shape({
    date: PropTypes.object,
    creators: PropTypes.array,
    tags: PropTypes.array,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default HistoryBasicFilters;

