import React from 'react';
import FilterByText from './filter-by-text';
import FilterByCreator from './filter-by-creator';
import FilterByDate from './filter-by-date';

import './index.css';

const SearchFilters = ({ repoID, onChange }) => {
  return (
    <div className="search-filters-container">
      <FilterByText onSelect={onChange} />
      <FilterByCreator repoID={repoID} onSelect={onChange} />
      <FilterByDate onSelect={onChange} />
    </div>
  );
};

export default SearchFilters;
