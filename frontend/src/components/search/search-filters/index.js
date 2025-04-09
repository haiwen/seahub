import React from 'react';
import PropTypes from 'prop-types';
import FilterByText from './filter-by-text';
import FilterByCreator from './filter-by-creator';
import FilterByDate from './filter-by-date';
import FilterBySuffix from './filter-by-suffix';

import './index.css';

const SCROLLABLE_CONTAINER_HEIGHT = 44;

const SearchFilters = ({ repoID, onChange }) => {
  return (
    <div className="search-filters-container" style={{ height: SCROLLABLE_CONTAINER_HEIGHT }}>
      <FilterByText onSelect={onChange} />
      <FilterByCreator repoID={repoID} onSelect={onChange} />
      <FilterByDate onSelect={onChange} />
      <FilterBySuffix onSelect={onChange} />
    </div>
  );
};

SearchFilters.propTypes = {
  repoID: PropTypes.string,
  onChange: PropTypes.func,
};

export default SearchFilters;
