import React from 'react';
import PropTypes from 'prop-types';
import FilterByCreator from './filter-by-creator';
import FilterByDate from './filter-by-date';
import FilterBySuffix from './filter-by-suffix';

import './index.css';

const TrashFilters = ({ filters, onChange }) => {
  return (
    <div className="search-filters-container p-0 m-0 border-0">
      <FilterBySuffix suffixes={filters.suffixes} onChange={onChange} />
      <FilterByCreator creatorList={filters.creator_list} onChange={onChange} />
      <FilterByDate date={filters.date} onChange={onChange} />
    </div>
  );
};

TrashFilters.propTypes = {
  filters: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TrashFilters;
