import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SFTableSearcher from '../components/sf-table/searcher';
import { EVENT_BUS_TYPE } from '../metadata/constants';

const Search = ({ viewId, columns }) => {
  const [searchResult, setSearchResult] = useState(null);
  const [searchValue, setSearchValue] = useState('');

  const recordsCount = useMemo(() => {
    return window.sfMetadataStore?.view?.records_count || 0;
  }, []);

  const columnsCount = useMemo(() => {
    return columns?.length || 0;
  }, [columns]);

  const searchRows = useCallback((value) => {
    setSearchValue(value);
    window.sfMetadataContext.eventBus && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SEARCH_ROWS, value, (result) => {
      setSearchResult(result);
    });
  }, []);

  const closeSearcher = useCallback(() => {
    setSearchValue('');
    setSearchResult(null);
    window.sfMetadataContext.eventBus && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SEARCH_ROWS);
  }, []);

  // Listen for search bar reset events from the context
  useEffect(() => {
    const handleResetSearchBar = () => {
      setSearchValue('');
      setSearchResult(null);
    };

    if (window.sfMetadataContext?.eventBus) {
      const unsubscribe = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.RESET_SEARCH_BAR, handleResetSearchBar);
      return unsubscribe;
    }
  }, []);

  // Reset search when viewId changes
  useEffect(() => {
    setSearchValue('');
    setSearchResult(null);
    // Also notify the context that search should be cleared
    if (window.sfMetadataContext?.eventBus) {
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SEARCH_ROWS, '');
    }
  }, [viewId]);

  return (
    <SFTableSearcher
      key={viewId}
      recordsCount={recordsCount}
      columnsCount={columnsCount}
      searchResult={searchResult}
      searchCells={searchRows}
      closeSearcher={closeSearcher}
      showResultNavigation={false}
      searchValue={searchValue}
    />
  );
};

export default Search;
