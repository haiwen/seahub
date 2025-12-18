import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { gettext } from '../../../utils/constants';
import { KeyCodes } from '../../../constants';
import { isModG, isModShiftG } from '../../../utils/hotkey';
import SFTableSearcherInput from './searcher-input';
import { checkHasSearchResult } from '../utils/search';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';
import OpIcon from '../../../components/op-icon';
import Icon from '../../icon';

const SFTableSearcher = ({ recordsCount, columnsCount, searchResult, searchCells, closeSearcher, focusNextMatchedCell, focusPreviousMatchedCell, showResultNavigation = true }) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [hasSearchValue, setHasSearchValue] = useState(false);

  const hasSearchResult = useMemo(() => {
    return checkHasSearchResult(searchResult);
  }, [searchResult]);

  const onToggleSearch = () => {
    setIsSearchActive(!isSearchActive);
  };

  const handleCloseSearcher = useCallback(() => {
    setIsSearchActive(false);
    closeSearcher && closeSearcher();
  }, [closeSearcher]);

  const onKeyDown = (e) => {
    const isEmptySearchResult = !hasSearchResult;
    if (e.keyCode === KeyCodes.Escape) {
      e.preventDefault();
      handleCloseSearcher();
    } else if (isModG(e)) {
      e.preventDefault();
      if (isEmptySearchResult) return;
      focusNextMatchedCell && focusNextMatchedCell();
    } else if (isModShiftG(e)) {
      e.preventDefault();
      if (isEmptySearchResult) return;
      focusPreviousMatchedCell && focusPreviousMatchedCell();
    }
  };

  const renderSearchButtons = () => {
    if (!showResultNavigation) return null;
    return (
      <span className="input-icon-addon search-poll-button">
        {hasSearchValue &&
          <span className="search-description">
            {hasSearchResult ?
              (searchResult.currentSelectIndex + 1 + ' of ' + searchResult.matchedCells.length) : '0 of 0'
            }
          </span>
        }
        {hasSearchResult &&
          <>
            <span
              className='toolbar-search-btn'
              role="button"
              onClick={focusPreviousMatchedCell ? focusPreviousMatchedCell : () => {}}
            >
              <Icon symbol="down" className="rotate-180" />
            </span>
            <span
              role="button"
              className='toolbar-search-btn'
              onClick={focusNextMatchedCell ? focusNextMatchedCell : () => {}}
            >
              <Icon symbol="down" />
            </span>
          </>
        }
      </span>
    );
  };

  useEffect(() => {
    const eventBus = window.sfMetadataContext && window.sfMetadataContext.eventBus;
    const unsubscribeResetSearchBar = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.RESET_SEARCH_BAR, handleCloseSearcher);

    return () => {
      unsubscribeResetSearchBar && unsubscribeResetSearchBar();
    };
  }, [handleCloseSearcher]);

  return (
    <div className="sf-table-searcher-container">
      {!isSearchActive && (
        <OpIcon
          className="sf-table-searcher-btn active-search m-0"
          symbol="search"
          title={gettext('Search')}
          op={onToggleSearch}
        />
      )}
      {isSearchActive && (
        <div className='sf-table-searcher-input-wrapper'>
          <span className="input-icon-addon"><Icon symbol="search" /></span>
          <SFTableSearcherInput
            recordsCount={recordsCount}
            columnsCount={columnsCount}
            onKeyDown={onKeyDown}
            setHasSearchValue={setHasSearchValue}
            searchCells={searchCells}
          />
          {renderSearchButtons()}
          <OpIcon
            title={gettext('Close')}
            className="btn-close-searcher-wrapper input-icon-addon"
            symbol="close"
            op={handleCloseSearcher}
          />
        </div>
      )}
    </div>
  );
};

export default SFTableSearcher;
