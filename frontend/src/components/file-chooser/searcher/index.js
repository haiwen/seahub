import React, { useState, useRef, useCallback } from 'react';
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

const Searcher = ({ className = '', onUpdateSearchStatus, onUpdateSearchResults }) => {
  const [inputValue, setInputValue] = useState('');

  const searchTimer = useRef(null);
  const source = useRef(null);

  const getSearchResult = useCallback((queryData) => {
    if (source.current) {
      source.current.cancel('prev request is cancelled');
    }

    source.current = seafileAPI.getSource();
    seafileAPI.searchFiles(queryData, source.current.token).then(res => {
      onUpdateSearchStatus(SearchStatus.RESULTS);
      onUpdateSearchResults(res.data.total ? formatResultItems(res.data.results) : []);
      source.current = null;
    }).catch(err => {
      source.current = null;
    });
  }, [onUpdateSearchStatus, onUpdateSearchResults]);

  const handleSearchInputChange = useCallback((e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue.trim().length === 0) {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
      if (source.current) {
        source.current.cancel('prev request is cancelled');
        source.current = null;
      }
      onUpdateSearchStatus('');
      onUpdateSearchResults([]);
      return;
    }

    onUpdateSearchStatus(SearchStatus.LOADING);

    const queryData = {
      q: newValue.trim(),
      search_repo: 'all',
      search_ftypes: 'all',
      obj_type: 'dir',
    };

    if (searchTimer) {
      clearTimeout(searchTimer.current);
    }

    searchTimer.current = setTimeout(() => {
      getSearchResult(queryData);
    }, 500);
  }, [onUpdateSearchStatus, onUpdateSearchResults, getSearchResult]);

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

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const onCloseSearching = useCallback(() => {
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    if (source.current) {
      source.current.cancel('prev request is cancelled');
      source.current = null;
    }
    setInputValue('');
    onUpdateSearchStatus('');
    onUpdateSearchResults([]);
  }, [onUpdateSearchResults, onUpdateSearchStatus]);

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
};

export default Searcher;
