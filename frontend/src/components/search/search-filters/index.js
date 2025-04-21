import React from 'react';
import PropTypes from 'prop-types';
import FilterByText from './filter-by-text';
import FilterByCreator from './filter-by-creator';
import FilterByDate from './filter-by-date';
import FilterBySuffix from './filter-by-suffix';

import './index.css';

const SearchFilters = ({ filters, onChange }) => {
  return (
    <div className="search-filters-container">
      <FilterBySuffix suffixes={filters.suffixes} onSelect={onChange} />
      <FilterByText searchFilenameOnly={filters.search_filename_only} onSelect={onChange} />
      <FilterByCreator creatorList={filters.creator_list} onSelect={onChange} />
      <FilterByDate date={filters.date} onSelect={onChange} />
    </div>
  );
};

SearchFilters.propTypes = {
  filters: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default SearchFilters;
