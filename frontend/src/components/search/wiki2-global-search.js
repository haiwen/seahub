import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import isHotkey from 'is-hotkey';
import MediaQuery from 'react-responsive';
import classNames from 'classnames';
import { SEARCH_CONTAINER, SEARCH_MASK } from '@/constants/zIndexes';
import wikiAPI from '../../utils/wiki-api';
import { gettext, siteRoot } from '../../utils/constants';
import { debounce, Utils } from '../../utils/utils';
import toaster from '../toast';
import Loading from '../loading';
import IconBtn from '../icon-btn';
import Icon from '../icon';
import Wiki2SearchResult from './wiki2-search-result';

import './wiki2-search.css';

const isEnter = isHotkey('enter');
const isUp = isHotkey('up');
const isDown = isHotkey('down');

function Wiki2GlobalSearch({ placeholder, onSearchedClick }) {

  const [isMaskShow, setMaskShow] = useState(false);
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isResultGotten, setIsResultGotten] = useState(false);
  const [width, setWidth] = useState('default');
  const [isSearchInputShow, setSearchInputShow] = useState(false);

  const searchResultListContainerRef = useRef(null);
  const highlightRef = useRef(null);

  useEffect(() => {
    const onDocumentKeyDown = (e) => {
      if (!isMaskShow && isHotkey('mod+k')(e)) {
        e.preventDefault();
        e.stopPropagation();
        setMaskShow(true);
      }
    };

    document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [isMaskShow]);

  const onClearSearch = useCallback(() => {
    setValue('');
    setHighlightIndex(-1);
    setResults([]);
    setIsResultGotten(false);
    setIsLoading(false);
  }, []);

  const resetToDefault = useCallback(() => {
    onClearSearch();
    setMaskShow(false);
    setSearchInputShow(false);
    setWidth('');
  }, [onClearSearch]);

  const onItemClick = useCallback((e, result) => {
    if (onSearchedClick) {
      onSearchedClick(result);
    } else {
      if (!result.doc_uuid) {
        toaster.danger(gettext('Page not found'));
        return;
      }
      const url = siteRoot + 'wikis/' + result.wiki_id + '/' + result.doc_uuid + '/';
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (newWindow) newWindow.opener = null;
    }
    resetToDefault();
  }, [onSearchedClick, resetToDefault]);

  const onUp = useCallback((e, highlightIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (highlightIndex > 0) {
      setHighlightIndex(highlightIndex - 1);
      setTimeout(() => {
        if (highlightRef.current) {
          const { top, height } = highlightRef.current.getBoundingClientRect();
          if (top - height < 0) {
            searchResultListContainerRef.current.scrollTop -= height;
          }
        }
      }, 1);
    }
  }, []);

  const onDown = useCallback((e, results, highlightIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (highlightIndex < results.length - 1) {
      setHighlightIndex(highlightIndex + 1);
      setTimeout(() => {
        if (highlightRef.current) {
          const { top, height } = highlightRef.current.getBoundingClientRect();
          const outerHeight = 300;
          if (top > outerHeight) {
            const newScrollTop = searchResultListContainerRef.current.scrollTop + height;
            searchResultListContainerRef.current.scrollTop = newScrollTop;
          }
        }
      }, 1);
    }
  }, []);

  const getWikisSearchResult = useCallback(async (searchValue) => {
    if (!searchValue.trim()) return;
    setIsLoading(true);
    setHighlightIndex(-1);
    setIsResultGotten(false);
    setResults([]);
    try {
      const res = await wikiAPI.searchWikis(searchValue.trim(), 50);
      const rawResults = res.data.results || [];
      if (rawResults.length === 0) {
        setResults([]);
        setHighlightIndex(-1);
        setIsResultGotten(true);
        return;
      }

      const mappedResults = rawResults.map(r => {
        const wiki_name = r.wiki_name || r.repo_name || r.name || '';
        return { ...r, wiki_name };
      });
      setResults(mappedResults);
      setHighlightIndex(0);
      setIsResultGotten(true);
    } catch (error) {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(() => {
    const fn = debounce((newValue) => {
      getWikisSearchResult(newValue);
    }, 300);
    return fn;
  }, [getWikisSearchResult]);

  useEffect(() => {
    return () => {
      if (debouncedSearch.cancel) {
        debouncedSearch.cancel();
      }
    };
  }, [debouncedSearch]);

  const onKeyDown = useCallback((e) => {
    if (isHotkey('esc', e)) {
      resetToDefault();
      return;
    }
    if (isResultGotten) {
      if (isEnter(e)) {
        const highlightResult = results[highlightIndex];
        if (highlightResult) {
          onItemClick(highlightResult);
        }
      } else if (isUp(e)) {
        onUp(e, highlightIndex);
      } else if (isDown(e)) {
        onDown(e, results, highlightIndex);
      }
    } else {
      if (isEnter(e)) {
        getWikisSearchResult(value);
      }
    }
  }, [getWikisSearchResult, onItemClick, highlightIndex, isResultGotten, onDown, onUp, resetToDefault, results, value]);

  const onInputChange = useCallback((e) => {
    const { value } = e.target;
    setValue(value);
    setHighlightIndex(-1);
    setIsResultGotten(false);
    setResults([]);

    debouncedSearch(value);
  }, [debouncedSearch]);

  const flatIndexMap = useMemo(() => {
    const map = new Map();
    results.forEach((result, index) => {
      map.set(result, index);
    });
    return map;
  }, [results]);

  const getFlatIndex = useCallback((result) => {
    return flatIndexMap.get(result) ?? -1;
  }, [flatIndexMap]);

  const onHighlightIdx = useCallback((idx) => {
    setHighlightIndex(idx);
  }, []);

  const onSearchToggle = useCallback(() => {
    setSearchInputShow(prev => !prev);
    setMaskShow(prev => !prev);
  }, []);

  const onFocus = useCallback(() => {
    setWidth('100%');
    setMaskShow(true);
  }, []);

  const renderSearchResult = useCallback(() => {
    if (!width || width === 'default') return null;
    return (
      <>
        {isLoading && <Loading />}
        {(value === '' && !isResultGotten) && (
          <div className="search-result-none">{gettext('Type characters to start search')}</div>
        )}
        {(value !== '' && isResultGotten && results.length === 0) && (
          <div className="search-result-none">{gettext('No result')}</div>
        )}
        {results.length > 0 && (
          <div className="wiki2-search-result mb-3">
            <h6 className="wiki2-search-result-header d-flex align-items-center mb-2">
              <span>{gettext('Wiki pages')}</span>
            </h6>
            <ul>
              {results.map((result, index) => {
                const flatIndex = getFlatIndex(result);
                const key = result._id || result.doc_uuid || `${result.wiki_id}-${result.page_id || ''}-${flatIndex}`;
                return (
                  <Wiki2SearchResult
                    key={key}
                    index={index}
                    result={result}
                    highlightIndex={highlightIndex}
                    setRef={highlightIndex === index ? (ref) => {highlightRef.current = ref;} : () => {}}
                    onHighlightIdx={onHighlightIdx}
                    onItemClick={onItemClick}
                  />
                );
              })}
            </ul>
          </div>
        )}
      </>
    );
  }, [results, value, width, highlightIndex, isLoading, isResultGotten, getFlatIndex, onHighlightIdx, onItemClick]);

  return (
    <>
      <MediaQuery query="(min-width: 768px)">
        <div className="search">
          <div className="search-container">
            <div className="input-icon cursor-pointer">
              <span className="search-icon-left input-icon-addon">
                <Icon symbol="search" />
              </span>
              <input
                type="text"
                className="form-control search-input"
                name="query"
                placeholder={placeholder || gettext('Search wikis')}
                readOnly
                onClick={() => setMaskShow(true)}
                autoComplete="off"
              />
            </div>
          </div>
        </div>
        {isMaskShow && (
          <div className="search">
            <div className="search-mask show" onClick={resetToDefault} style={{ zIndex: SEARCH_MASK }}></div>
            <div className="search-container show" style={{ zIndex: SEARCH_CONTAINER }}>
              <div className="wiki2-search-input">
                <span className="d-flex align-items-center search-icon-left input-icon-addon">
                  <Icon symbol="search" />
                </span>
                <input
                  type="text"
                  className="form-control search-input"
                  name="query"
                  placeholder={placeholder || gettext('Search')}
                  autoComplete="off"
                  value={value}
                  onChange={onInputChange}
                  onKeyDown={onKeyDown}
                  onFocus={onFocus}
                  autoFocus={true}
                />
                <IconBtn
                  symbol="close"
                  className="search-icon-right input-icon-addon mr-2"
                  onClick={onClearSearch}
                  aria-label={gettext('Close')}
                />
              </div>

              <div className="seafile-divider"></div>

              <div className="wiki2-search-result-container" style={{ maxHeight: (window.innerHeight - 200) }} ref={searchResultListContainerRef}>
                {renderSearchResult()}
              </div>
            </div>
          </div>
        )}
      </MediaQuery>

      <MediaQuery query="(max-width: 767px)">
        <div className="search-icon-container">
          <span className="search-icon" onClick={onSearchToggle}>
            <Icon symbol="search" />
          </span>
        </div>
        {isSearchInputShow && (
          <div className="search">
            <div className={classNames('search-mask', { 'hide': !isMaskShow })} onClick={resetToDefault} style={{ zIndex: SEARCH_MASK }}></div>
            <div className="search-container" style={{ zIndex: SEARCH_CONTAINER }}>
              <div className="input-icon">
                <Icon symbol="search" className="search-icon-left input-icon-addon" />
                <input
                  type="text"
                  className="form-control search-input"
                  name="query"
                  placeholder={placeholder || gettext('Search')}
                  autoComplete="off"
                  value={value}
                  onFocus={onFocus}
                  onChange={onInputChange}
                  onKeyDown={onKeyDown}
                  autoFocus={true}
                />
              </div>

              <div className="search-result-container" style={{ maxHeight: (window.innerHeight - 200) }} ref={searchResultListContainerRef}>
                {renderSearchResult()}
              </div>
            </div>
          </div>
        )}
      </MediaQuery>
    </>
  );
}

Wiki2GlobalSearch.propTypes = {
  placeholder: PropTypes.string,
  onSearchedClick: PropTypes.func,
};

export default Wiki2GlobalSearch;
