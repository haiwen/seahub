import React, { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import classnames from 'classnames';
import { UncontrolledPopover } from 'reactstrap';
import SFTableSearcher from '../components/sf-table/searcher';
import { EVENT_BUS_TYPE } from '../metadata/constants';
import { gettext } from '../utils/constants';
import { debounce, Utils } from '../utils/utils';
import IconBtn from '../components/icon-btn';
import TrashFilters from '../components/dialog/trash-dialog/trash-search/search-filters';

const Search = () => {
  const [searchValue, setSearchValue] = useState('');
  const [isFiltersShown, setFiltersShown] = useState(false);
  const [isFiltersActive, setFiltersActive] = useState(false);
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

  const sourceRef = useRef(null);

  const searchTrash = useCallback((query, filters) => {
    if (sourceRef.current) {
      sourceRef.current.cancel('prev request is cancelled');
    }
    sourceRef.current = axios.CancelToken.source();
    const { suffixes, date, creator_list } = filters;
    const creators = creator_list.map(user => user.email).join(',');
    window.sfMetadataContext.eventBus && window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SEARCH_TRASH_RECORDS, query.trim(), { suffixes, date, creators });
  }, []);

  const debouncedSearch = useRef(debounce(searchTrash, 300));
  const searchRows = useCallback((value) => {
    setSearchValue(value);
    debouncedSearch.current(value, filters);
  }, [filters]);

  const closeSearcher = useCallback(() => {
    setSearchValue('');
    searchTrash('', filters);
  }, [filters, searchTrash]);

  const toggleFiltersShown = useCallback(() => {
    setFiltersShown(!isFiltersShown);
  }, [isFiltersShown]);

  const handleFiltersChange = useCallback((key, value) => {
    const newFilters = { ...filters, [key]: value };
    const hasActiveFilter = newFilters.suffixes || newFilters.date.value || newFilters.creator_list.length;
    setFilters(newFilters);
    setFiltersActive(hasActiveFilter);
    searchTrash(searchValue, newFilters);
  }, [filters, searchValue, searchTrash]);

  const filterIconID = 'library-trash-filter-icon';
  return (
    <div className="sf-metadata-tool">
      <SFTableSearcher
        key={'search-trash'}
        recordsCount={0}
        columnsCount={0}
        searchResult={null}
        searchCells={searchRows}
        closeSearcher={closeSearcher}
        showResultNavigation={false}
        searchValue={searchValue}
      />
      <IconBtn
        symbol="filter"
        title={gettext('Filters')}
        size={24}
        className={classnames('sf-metadata-view-tool-operation-btn sf-metadata-view-tool-filter', { 'active bg-gray': isFiltersActive })}
        onClick={toggleFiltersShown}
        aria-label={gettext('Filters')}
        tabIndex={0}
        role="button"
        onKeyDown={Utils.onKeyDown}
        id={filterIconID}
      />
      {isFiltersShown &&
      <UncontrolledPopover
        placement={'bottom-end'}
        target={filterIconID}
        isOpen={true}
        fade={false}
        hideArrow={true}
        className="sf-metadata-filter-popover"
        boundariesElement={document.body}
      >
        <TrashFilters filters={filters} onChange={handleFiltersChange} />
      </UncontrolledPopover>
      }
    </div>
  );
};

export default Search;
