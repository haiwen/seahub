import React from 'react';
import PropTypes from 'prop-types';
import FilterByText from './filter-by-text';
import FilterByCreator from './filter-by-creator';
import FilterByDate from './filter-by-date';
import FilterBySuffix from './filter-by-suffix';

import './index.css';

const SearchFilters = ({ onChange }) => {
  return (
    <div className="search-filters-container">
      <FilterBySuffix onSelect={onChange} />
      <FilterByText onSelect={onChange} />
      <FilterByCreator onSelect={onChange} />
      <FilterByDate onSelect={onChange} />
    </div>
  );
};

SearchFilters.propTypes = {
  onChange: PropTypes.func,
};

export default SearchFilters;
