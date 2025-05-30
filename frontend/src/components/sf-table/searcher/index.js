import React, { useMemo, useState } from 'react';
import { gettext } from '../../../utils/constants';
import { KeyCodes } from '../../../constants';
import { isModG, isModShiftG } from '../../../utils/hotkey';
import SFTableSearcherInput from './searcher-input';
import { checkHasSearchResult } from '../utils/search';

const SFTableSearcher = ({ recordsCount, columnsCount, searchResult, searchCells, closeSearcher, focusNextMatchedCell, focusPreviousMatchedCell }) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [hasSearchValue, setHasSearchValue] = useState(false);

  const hasSearchResult = useMemo(() => {
    return checkHasSearchResult(searchResult);
  }, [searchResult]);

  const onToggleSearch = () => {
    setIsSearchActive(!isSearchActive);
  };

  const handleCloseSearcher = () => {
    setIsSearchActive(false);
    closeSearcher && closeSearcher();
  };

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
              <i aria-hidden="true" className="sf3-font sf3-font-down rotate-180"></i>
            </span>
            <span
              role="button"
              className='toolbar-search-btn'
              onClick={focusNextMatchedCell ? focusNextMatchedCell : () => {}}
            >
              <i aria-hidden="true" className="sf3-font sf3-font-down"></i>
            </span>
          </>
        }
      </span>
    );
  };

  return (
    <div className="sf-table-searcher-container">
      {!isSearchActive && (
        <span
          className='sf-table-searcher-btn'
          onClick={onToggleSearch}
          onKeyDown={onToggleSearch}
          role="button"
          title={gettext('Search')}
          aria-label={gettext('Search')}
          tabIndex={0}
        >
          <i className='active-search m-0 sf3-font sf3-font-search' aria-hidden="true" ></i>
        </span>
      )}
      {isSearchActive && (
        <div className='sf-table-searcher-input-wrapper'>
          <i className='input-icon-addon sf3-font sf3-font-search' aria-hidden="true" />
          <SFTableSearcherInput
            recordsCount={recordsCount}
            columnsCount={columnsCount}
            onKeyDown={onKeyDown}
            setHasSearchValue={setHasSearchValue}
            searchCells={searchCells}
          />
          {renderSearchButtons()}
          <span className="btn-close-searcher-wrapper input-icon-addon" onClick={handleCloseSearcher} role="button">
            <i className='btn-close-searcher sf3-font sf3-font-x-01' aria-hidden="true"></i>
          </span>
        </div>
      )}
    </div>
  );
};

export default SFTableSearcher;
