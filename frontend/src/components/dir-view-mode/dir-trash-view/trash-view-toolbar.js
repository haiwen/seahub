import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import OpIcon from '../../op-icon';
import { enableUserCleanTrash, gettext, username } from '../../../utils/constants';
import { KeyCodes } from '../../../constants';
import EventBus from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';
import Icon from '../../icon';
import HistoryFilterSetter from '../dir-history-view/history-filter-setter';
import { TRASH_MODE } from '../constants';
import CleanTrash from '../../dialog/clean-trash';

const DEFAULT_FILTER = {
  date: {
    value: '',
    from: null,
    to: null,
  },
  creators: [],
  suffixes: '',
};

const TrashViewToolbar = ({ repoID, currentRepoInfo }) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTER);
  const [allCommits, setAllCommits] = useState([]);
  let [canSearch, setCanSearch] = useState(true);
  let [isCleanTrashDialogOpen, setCleanTrashDialogOpen] = useState(false);

  const isRepoAdmin = useMemo(() => {
    const { owner_email, is_admin } = currentRepoInfo;
    const isRepoAdmin = owner_email === username || is_admin;
    return isRepoAdmin;
  }, [currentRepoInfo]);

  const searchInputRef = useRef(null);
  const inputTimer = useRef(null);

  useEffect(() => {
    const eventBus = EventBus.getInstance();
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
    const eventBus = EventBus.getInstance();
    eventBus.dispatch(EVENT_BUS_TYPE.TRASH_SEARCH, '');
  }, []);

  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (inputTimer.current) clearTimeout(inputTimer.current);
    inputTimer.current = setTimeout(() => {
      const eventBus = EventBus.getInstance();
      eventBus.dispatch(EVENT_BUS_TYPE.TRASH_SEARCH, query);
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
    const eventBus = EventBus.getInstance();
    eventBus.dispatch(EVENT_BUS_TYPE.TRASH_FILTER, newFilters);
  }, []);

  const toggleCleanTrashDialog = useCallback(() => {
    setCleanTrashDialogOpen(!isCleanTrashDialogOpen);
  }, [isCleanTrashDialogOpen]);

  const refreshTrash = useCallback(() => {
    const eventBus = EventBus.getInstance();
    eventBus.dispatch(EVENT_BUS_TYPE.REFRESH_TRASH);
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
          mode={TRASH_MODE}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          allCommits={allCommits}
        />
        {(enableUserCleanTrash && isRepoAdmin) && (
          <button className="btn btn-sm btn-secondary clean flex-shrink-0 ml-4" onClick={toggleCleanTrashDialog}>{gettext('Clean')}</button>
        )}
        {isCleanTrashDialogOpen && (
          <CleanTrash
            repoID={repoID}
            refreshTrash={refreshTrash}
            toggleDialog={toggleCleanTrashDialog}
          />
        )}
      </div>
    </div>
  );
};

export default TrashViewToolbar;

