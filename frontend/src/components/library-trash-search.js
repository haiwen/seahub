import React, { useCallback, useMemo, useState } from 'react';
import axios from 'axios';
import SFTableSearcher from '../components/sf-table/searcher';
import { EVENT_BUS_TYPE } from '../metadata/constants';
import { debounce } from '../utils/utils';

const Search = () => {
  const [searchResult, setSearchResult] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const initialFilters = {
    date: {
      value: '',
      from: null,
      to: null,
    },
    suffixes: '',
    creator_list: [],
  };
  const [filters, setFilters] = useState(initialFilters);

  let source = null;

  const searchTrash = useCallback((query) => {
    if (source) {
      source.cancel('prev request is cancelled');
    }
    source = axios.CancelToken.source();
    const { suffixes, date, creator_list } = filters;
    const creators = creator_list.map(user => user.email).join(',');
    window.sfMetadataContext.eventBus && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SEARCH_TRASH_RECORDS, query.trim(), { suffixes, date, creators });
  }, [filters]);

  const searchRows = useCallback((value) => {
    setSearchValue(value);
    const debouncedSearch = debounce(searchTrash, 300);
    debouncedSearch(value);
  }, [searchTrash]);

  const closeSearcher = useCallback(() => {
    searchTrash('');
    setSearchResult(null);
  }, [searchTrash]);

  return (
    <SFTableSearcher
      key={'search-trash'}
      recordsCount={0}
      columnsCount={0}
      searchResult={searchResult}
      searchCells={searchRows}
      closeSearcher={closeSearcher}
      showResultNavigation={false}
      searchValue={searchValue}
    />
  );
};

export default Search;
