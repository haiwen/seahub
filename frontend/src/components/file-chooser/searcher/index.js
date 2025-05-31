import React, { useState, useRef, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { SEARCH_CONTAINER } from '../../../constants/zIndexes';
import { MODE_TYPE_MAP } from '../../../constants';

import './index.css';

export const SearchStatus = {
  LOADING: 'loading',
  RESULTS: 'results',
};

const Searcher = ({ onUpdateMode, onUpdateSearchStatus, onUpdateSearchResults, onClose }) => {
  const [inputValue, setInputValue] = useState('');

  const inputRef = useRef(null);

  const searchTimer = useRef(null);
  const source = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target) && inputValue === '') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [inputValue, onClose]);

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
    const newValue = e.target.value.trim();
    setInputValue(newValue);

    if (newValue.length === 0) {
      onUpdateSearchResults([]);
      return;
    }

    onUpdateSearchStatus(SearchStatus.LOADING);

    const queryData = {
      q: newValue,
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
      items[i]['link_content'] = decodeURI(data[i].fullpath).substring(1);
      items[i]['content'] = data[i].content_highlight;
    }
    return items;
  };

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();

    if (e.key === 'Enter' && inputValue.trim().length > 0) {
      onUpdateMode(MODE_TYPE_MAP.SEARCH_RESULTS);
    }
  }, [inputValue, onUpdateMode]);

  const onCloseSearching = useCallback(() => {
    setInputValue('');
    onClose();
  }, [onClose]);

  return (
    <div className='search-container file-chooser-searcher' style={{ zIndex: SEARCH_CONTAINER }}>
      <div className='search-input-container'>
        <i className="search-icon-left input-icon-addon sf3-font sf3-font-search"></i>
        <Input
          innerRef={inputRef}
          className='search-input'
          placeholder={gettext('Search')}
          type='text'
          value={inputValue}
          onChange={handleSearchInputChange}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {inputValue.length !== 0 && (
          <span className="search-control op-icon op-icon-bg-light m-0 sf3-font sf3-font-x-01" onClick={onCloseSearching}></span>
        )}
      </div>
    </div>
  );
};

Searcher.propTypes = {
  onUpdateMode: PropTypes.func,
  onUpdateSearchStatus: PropTypes.func,
  onUpdateSearchResults: PropTypes.func,
  onClose: PropTypes.func,
};

export default Searcher;
