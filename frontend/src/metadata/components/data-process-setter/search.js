import React, { useCallback, useEffect, useMemo, useState } from 'react';
import SFTableSearcher from '../../../components/sf-table/searcher';
import { EVENT_BUS_TYPE } from '../../constants';

const Search = ({ viewId, columns }) => {
  const [searchResult, setSearchResult] = useState(null);

  const recordsCount = useMemo(() => {
    return window.sfMetadataStore?.view?.records_count || 0;
  }, []);
  const columnsCount = useMemo(() => {
    return columns?.length || 0;
  }, [columns]);

  const searchRows = useCallback((value) => {
    window.sfMetadataContext.eventBus && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SEARCH_ROWS, value, (result) => {
      setSearchResult(result);
    });
  }, []);

  const closeSearcher = useCallback(() => {
    setSearchResult(null);
    window.sfMetadataContext.eventBus && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SEARCH_ROWS);
  }, []);

  useEffect(() => {
    setSearchResult(null);
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
    />
  );
};

export default Search;
