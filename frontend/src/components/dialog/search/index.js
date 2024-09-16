import React, { useState, useRef, useCallback } from 'react';
import { Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import Loading from '../../loading';
import SearchedListView from '../../file-chooser/searched-list-view';
import RepoInfo from '../../../models/repo-info';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';

import './index.css';

export const SearchStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  RESULTS: 'results',
  NO_RESULTS: 'no_results',
  BROWSING: 'browsing',
};

const Search = ({ searchStatus, onUpdateSearchStatus, onDirentItemClick, onSelectedSearchedItem, onSelectedRepo, onSelectedPath, onBrowsingPath }) => {
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const searchTimer = useRef(null);
  const source = useRef(null);

  const handleSearchInputChange = (e) => {
    const newValue = e.target.value.trim();
    setInputValue(newValue);

    if (newValue.length === 0) {
      onUpdateSearchStatus(SearchStatus.IDLE);
      setSearchResults([]);
      return;
    }

    onUpdateSearchStatus(SearchStatus.SEARCHING);

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
  };

  const getSearchResult = useCallback((queryData) => {
    if (source.current) {
      source.current.cancel('prev request is cancelled');
    }

    source.current = seafileAPI.getSource();
    seafileAPI.searchFiles(queryData, source.current.token)
      .then(res => {
        setSearchResults(res.data.total ? formatResultItems(res.data.results) : []);
        onUpdateSearchStatus(res.data.results.length > 0 ? SearchStatus.RESULTS : SearchStatus.NO_RESULTS);
        source.current = null;
      })
      .catch(err => {
        onUpdateSearchStatus(SearchStatus.NO_RESULTS);
        source.current = null;
      });
  }, [onUpdateSearchStatus]);

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

  const onCloseSearching = () => {
    setInputValue('');
    setSearchResults([]);
    onUpdateSearchStatus(SearchStatus.IDLE);
    onSelectedSearchedItem(null);
  };

  const onSearchedItemClick = (item) => {
    item['type'] = item.is_dir ? 'dir' : 'file';
    let repo = new RepoInfo(item);
    onDirentItemClick(repo, item.path, item);
  };

  const onSearchedItemDoubleClick = (item) => {
    if (item.type !== 'dir') return;

    const selectedItemInfo = {
      repoID: item.repo_id,
      filePath: item.path,
    };

    onSelectedSearchedItem(selectedItemInfo);

    seafileAPI.getRepoInfo(item.repo_id)
      .then(res => {
        const repoInfo = new RepoInfo(res.data);
        const path = item.path.substring(0, item.path.length - 1);
        onSelectedRepo(repoInfo);
        onSelectedPath(path);
        onBrowsingPath(item.path.substring(0, item.path.length - 1));
      })
      .catch(err => {
        const errMessage = Utils.getErrorMsg(err);
        toaster.danger(errMessage);
      });

    onUpdateSearchStatus(SearchStatus.BROWSING);
  };

  const renderSearchResults = () => {
    switch (searchStatus) {
      case SearchStatus.IDLE:
        return null;
      case SearchStatus.LOADING:
        return <Loading />;
      case SearchStatus.NO_RESULTS:
        return (
          <div className='search-results-none'>{gettext('No results matching')}</div>
        );
      case SearchStatus.RESULTS:
        return (
          <SearchedListView
            searchResults={searchResults}
            onItemClick={onSearchedItemClick}
            onSearchedItemDoubleClick={onSearchedItemDoubleClick}
          />
        );
    }
  };

  return (
    <>
      <div className='search-input-container'>
        <Input className='search-input' placeholder={gettext('Search')} type='text' value={inputValue} onChange={handleSearchInputChange} />
        {inputValue.length !== 0 && (
          <span className="search-control attr-action-icon sf3-font sf3-font-x-01" onClick={onCloseSearching}></span>
        )}
      </div>
      {searchStatus !== SearchStatus.IDLE && (
        <div className='search-results-container'>
          {renderSearchResults()}
        </div>
      )}
    </>
  );
};

export default Search;
