import React, { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { SEARCH_CONTAINER } from '../../../constants/zIndexes';
import Icon from '../../icon';
import Tooltip from '@/components/tooltip';

import './index.css';

export const SearchStatus = {
  LOADING: 'loading',
  RESULTS: 'results',
};

const Searcher = ({
  className = '',
  onUpdateSearchStatus,
  onUpdateSearchResults,
  searchResults = [],
  onInputArrowKeyDown,
  onInputEnterKeyDown,
  inputRef,
}) => {
  const [inputValue, setInputValue] = useState('');

  const searchTimer = useRef(null);
  const source = useRef(null);
  const isComposingRef = useRef(false);

  const clearSearchRequest = useCallback(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    if (source.current) {
      source.current.cancel('prev request is cancelled');
      source.current = null;
    }
  }, []);

  const getSearchResult = useCallback((queryData) => {
    if (source.current) {
      source.current.cancel('prev request is cancelled');
    }

    const requestSource = seafileAPI.getSource();
    source.current = requestSource;
    seafileAPI.searchFiles(queryData, requestSource.token).then(res => {
      if (source.current !== requestSource) return;
      onUpdateSearchStatus(SearchStatus.RESULTS);
      onUpdateSearchResults(res.data.total ? formatResultItems(res.data.results) : []);
      source.current = null;
    }).catch(err => {
      if (source.current === requestSource) {
        source.current = null;
      }
    });
  }, [onUpdateSearchStatus, onUpdateSearchResults]);

  useEffect(() => {
    return clearSearchRequest;
  }, [clearSearchRequest]);

  const handleSearchInputChange = useCallback((e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue.trim().length === 0) {
      clearSearchRequest();
      onUpdateSearchStatus('');
      onUpdateSearchResults([]);
      return;
    }

    onUpdateSearchStatus(SearchStatus.LOADING);
    clearSearchRequest();
    onUpdateSearchResults([]);

    const queryData = {
      q: newValue.trim(),
      search_repo: 'all',
      search_ftypes: 'all',
      obj_type: 'dir',
    };

    searchTimer.current = setTimeout(() => {
      getSearchResult(queryData);
    }, 500);
  }, [onUpdateSearchStatus, onUpdateSearchResults, getSearchResult, clearSearchRequest]);

  const formatResultItems = (data) => {
    let items = [];
    let length = data.length > 10 ? 10 : data.length;
    for (let i = 0; i < length; i++) {
      items[i] = {};
      items[i]['index'] = [i];
      items[i]['name'] = data[i].name;
      items[i]['path'] = data[i].fullpath;
      items[i]['repo_id'] = data[i].repo_id;
      items[i]['repo_name'] = data[i].repo_name;
      items[i]['is_dir'] = data[i].is_dir;
      items[i]['content'] = data[i].content_highlight;
    }
    return items;
  };

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  const handleKeyDown = useCallback((e) => {
    const isImeComposing = isComposingRef.current || e.nativeEvent?.isComposing || e.keyCode === 229;
    if (isImeComposing) {
      e.stopPropagation();
      return;
    }

    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && searchResults.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      if (onInputArrowKeyDown) {
        onInputArrowKeyDown(e.key);
      }
      return;
    }

    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      if (onInputEnterKeyDown) {
        onInputEnterKeyDown();
      }
      return;
    }

    e.stopPropagation();
  }, [onInputArrowKeyDown, onInputEnterKeyDown, searchResults.length]);

  const onCloseSearching = useCallback(() => {
    clearSearchRequest();
    setInputValue('');
    onUpdateSearchStatus('');
    onUpdateSearchResults([]);
  }, [onUpdateSearchResults, onUpdateSearchStatus, clearSearchRequest]);

  return (
    <div className={`search-container file-chooser-searcher ${className}`} style={{ zIndex: SEARCH_CONTAINER }}>
      <div className='search-input-container'>
        <span className="search-icon-left input-icon-addon"><Icon symbol="search" /></span>
        <Input
          className='search-input'
          placeholder={gettext('Search')}
          type='text'
          value={inputValue}
          onChange={handleSearchInputChange}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          innerRef={inputRef}
          autoFocus
        />
        {inputValue.length !== 0 && (
          <span id="clear-search-btn" className="search-control op-icon op-icon-bg-light m-0" onClick={onCloseSearching}>
            <Icon symbol="close" />
            <Tooltip target="clear-search-btn">{gettext('Clear search')}</Tooltip>
          </span>
        )}
      </div>
    </div>
  );
};

Searcher.propTypes = {
  className: PropTypes.string,
  onUpdateSearchStatus: PropTypes.func,
  onUpdateSearchResults: PropTypes.func,
  searchResults: PropTypes.array,
  onInputArrowKeyDown: PropTypes.func,
  onInputEnterKeyDown: PropTypes.func,
  inputRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]),
};

export default Searcher;
