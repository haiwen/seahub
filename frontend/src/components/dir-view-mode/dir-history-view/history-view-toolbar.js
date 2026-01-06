import React, { useCallback, useState, useRef, useEffect } from 'react';
import OpIcon from '../../op-icon';
import { gettext } from '../../../utils/constants';
import { KeyCodes } from '../../../constants';
import { eventBus } from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';
import Icon from '../../icon';
import HistoryFilterSetter from './history-filter-setter';

const HistoryViewToolbar = () => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    const unsubscribe = eventBus.subscribe(EVENT_BUS_TYPE.HISTORY_COMMITS_UPDATED, (commits) => {
      setAllCommits(commits);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const onToggleSearch = useCallback(() => {
    setIsSearchActive(!isSearchActive);
    if (!isSearchActive) {
      setTimeout(() => {
        searchInputRef.current && searchInputRef.current.focus();
      }, 0);
    }
  }, [isSearchActive]);

  const handleCloseSearcher = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery('');
    eventBus.dispatch(EVENT_BUS_TYPE.HISTORY_SEARCH, '');
  }, []);

  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);

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
      </div>
    </div>
  );
};

export default HistoryViewToolbar;

