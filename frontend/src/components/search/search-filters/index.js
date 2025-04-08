import React from 'react';
import PropTypes from 'prop-types';
import FilterByText from './filter-by-text';
import FilterByCreator from './filter-by-creator';
import FilterByDate from './filter-by-date';
import FilterBySuffix from './filter-by-suffix';

import './index.css';

const SCROLLABLE_CONTAINER_HEIGHT = 44;

const SearchFilters = ({ repoID, onChange, hasFileSearch }) => {
  return (
    <div className="search-filters-container" style={{ height: hasFileSearch && SCROLLABLE_CONTAINER_HEIGHT }}>
      {hasFileSearch && <FilterByText onSelect={onChange} />}
      {hasFileSearch && <FilterByCreator repoID={repoID} onSelect={onChange} />}
      {hasFileSearch && <FilterByDate onSelect={onChange} />}
      <FilterBySuffix onSelect={onChange} />
    </div>
  );
};

SearchFilters.propTypes = {
  repoID: PropTypes.string,
  onChange: PropTypes.func,
  hasFileSearch: PropTypes.bool,
};

export default SearchFilters;
