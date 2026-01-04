import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import SortMenu from '../../sort-menu';
import OpIcon from '../../op-icon';
import { gettext } from '../../../utils/constants';
import { KeyCodes } from '../../../constants';
import { eventBus } from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';
import Icon from '../../icon';
import HistoryFilterSetter from './history-filter-setter';

/**
 * History search, filter, and sort toolbar component
 * Renders in DirTool and communicates with DirHistoryView via EventBus
 * Pattern: Similar to TagsTableSearcher + AllTagsSortSetter + FilterSetter
 * Search UI: Consistent with SFTableSearcher
 * Filter UI: Consistent with metadata FilterSetter
 */
const HistoryViewToolbar = () => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('time');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filters, setFilters] = useState({
    date: {
      value: '',
      from: null,
      to: null,
    },
    creators: [],
    tags: [],
  });
  const [allCommits, setAllCommits] = useState([]);

  const searchInputRef = useRef(null);
  const inputTimer = useRef(null);

  // Subscribe to commits updates from DirHistoryView
  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENT_BUS_TYPE.HISTORY_COMMITS_UPDATED, (commits) => {
      setAllCommits(commits);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const sortOptions = useMemo(() => [
    { value: 'time-desc', text: gettext('Descending by time') },
    { value: 'time-asc', text: gettext('Ascending by time') },
    { value: 'creator-asc', text: gettext('Ascending by modifier') },
    { value: 'creator-desc', text: gettext('Descending by modifier') },
  ], []);

  const onToggleSearch = useCallback(() => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      // Auto-focus input when opening
      setTimeout(() => {
        searchInputRef.current && searchInputRef.current.focus();
      }, 0);
    }
  }, [isSearchActive]);

  const handleCloseSearcher = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery('');
    // Clear search when closing
    eventBus.dispatch(EVENT_BUS_TYPE.HISTORY_SEARCH, '');
  }, []);

  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Debounce search
    if (inputTimer.current) clearTimeout(inputTimer.current);
    inputTimer.current = setTimeout(() => {
      eventBus.dispatch(EVENT_BUS_TYPE.HISTORY_SEARCH, query);
    }, 300);
  }, []);

  const onKeyDown = useCallback((e) => {
    if (e.keyCode === KeyCodes.Escape) {
      e.preventDefault();
      handleCloseSearcher();
    }
  }, [handleCloseSearcher]);

  const handleSortChange = useCallback((item) => {
    const [newSortBy, newSortOrder] = item.value.split('-');
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    eventBus.dispatch(EVENT_BUS_TYPE.HISTORY_SORT, { sortBy: newSortBy, sortOrder: newSortOrder });
  }, []);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
    eventBus.dispatch(EVENT_BUS_TYPE.HISTORY_FILTER, newFilters);
  }, []);

  return (
    <div className="sf-history-tool">
      <div className="sf-history-tool-left-operations">
        <div className="sf-table-searcher-container lh-1">
          {!isSearchActive && (
            <OpIcon
              className="sf-table-searcher-btn active-search m-0"
              symbol="search"
              title={gettext('Search')}
              op={onToggleSearch}
            />
          )}
          {isSearchActive && (
            <div className="sf-table-searcher-input-wrapper">
              <span className="input-icon-addon"><Icon symbol="search" /></span>
              <input
                ref={searchInputRef}
                className='sf-table-searcher-input form-control'
                type='text'
                autoFocus
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={gettext('Search')}
                onKeyDown={onKeyDown}
              />
              <OpIcon
                title={gettext('Close')}
                className="btn-close-searcher-wrapper input-icon-addon"
                symbol="close"
                op={handleCloseSearcher}
              />
            </div>
          )}
        </div>

        <HistoryFilterSetter
          filters={filters}
          onFiltersChange={handleFiltersChange}
          allCommits={allCommits}
        />

        <SortMenu
          className="ml-2"
          sortBy={sortBy}
          sortOrder={sortOrder}
          sortOptions={sortOptions}
          onSelectSortOption={handleSortChange}
        />
      </div>
    </div>
  );
};

export default HistoryViewToolbar;

