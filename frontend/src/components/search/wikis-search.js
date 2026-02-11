import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, Input } from 'reactstrap';
import isHotkey from 'is-hotkey';
import wikiAPI from '../../utils/wiki-api';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import Loading from '../loading';
import IconBtn from '../icon-btn';
import Icon from '../icon';
import NavItemIcon from '../../pages/wiki2/common/nav-item-icon';

import './wiki2-search.css';
import './wiki2-search-result.css';

const isEnter = isHotkey('enter');
const isUp = isHotkey('up');
const isDown = isHotkey('down');

function WikisSearch({ placeholder, onSearchedClick }) {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isResultGotten, setIsResultGotten] = useState(false);
  const searchResultListContainerRef = useRef(null);
  const highlightRef = useRef(null);

  // Group results by wiki
  const groupedResults = useMemo(() => {
    const groups = {};
    results.forEach(result => {
      const wikiId = result.wiki_id;
      if (!groups[wikiId]) {
        groups[wikiId] = {
          wiki_id: wikiId,
          wiki_name: result.wiki_name,
          pages: []
        };
      }
      groups[wikiId].pages.push(result);
    });
    return Object.values(groups);
  }, [results]);

  useEffect(() => {
    const onDocumentKeyDown = (e) => {
      if (!isModalOpen && isHotkey('mod+k')(e)) {
        e.preventDefault();
        e.stopPropagation();
        setIsModalOpen(true);
      }
    };

    document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  }, [isModalOpen]);

  const onClearSearch = useCallback(() => {
    setValue('');
    setHighlightIndex(-1);
    setResults([]);
    setIsResultGotten(false);
    setIsLoading(false);
  }, []);

  const resetToDefault = useCallback(() => {
    onClearSearch();
    setIsModalOpen(false);
  }, [onClearSearch]);

  const handleItemClick = useCallback((result) => {
    if (onSearchedClick) {
      onSearchedClick(result);
    } else {
      if (!result.page_id) {
        toaster.danger(gettext('Page not found in wiki config'));
        return;
      }
      const url = siteRoot + 'wikis/' + result.wiki_id + '/' + result.page_id + '/';
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

  const onKeyDown = useCallback((e) => {
    if (isHotkey('esc', e)) {
      resetToDefault();
      return;
    }
    if (isResultGotten) {
      if (isEnter(e)) {
        const highlightResult = results[highlightIndex];
        if (highlightResult) {
          handleItemClick(highlightResult);
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
  }, [getWikisSearchResult, handleItemClick, highlightIndex, isResultGotten, onDown, onUp, resetToDefault, results, value]);

  const onInputChange = useCallback((e) => {
    const { value } = e.target;
    setValue(value);
    setHighlightIndex(-1);
    setIsResultGotten(false);
    setResults([]);
  }, []);

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

  return (
    <>
      <div className="search">
        <div className="search-container">
          <div className="input-icon">
            <span className="search-icon-left input-icon-addon">
              <Icon symbol="search" />
            </span>
            <input
              type="text"
              className="form-control search-input"
              name="query"
              placeholder={placeholder || gettext('Search wikis')}
              style={{ width: '15rem' }}
              readOnly
              onClick={() => setIsModalOpen(true)}
              autoComplete="off"
            />
          </div>
        </div>
      </div>
      {isModalOpen &&
        <Modal className="wiki2-search-modal" isOpen={isModalOpen} toggle={resetToDefault} autoFocus={false} size='lg'>
          <ModalBody>
            <div className="wiki2-search-input mb-4 position-relative">
              <span className="d-flex align-items-center search-icon-left input-icon-addon">
                <Icon symbol="search" />
              </span>
              <Input
                type="text"
                className="form-control search-input"
                name="query"
                placeholder={placeholder || gettext('Search')}
                autoComplete="off"
                value={value}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                autoFocus={true}
              />
              <IconBtn
                symbol="close"
                className="search-icon-right input-icon-addon mr-2"
                onClick={onClearSearch}
                aria-label={gettext('Close')}
              />
            </div>
            <div className="wiki2-search-result-container" style={{ maxHeight: (window.innerHeight - 200) + 'px' }} ref={searchResultListContainerRef}>
              {isLoading && <Loading />}
              {(value === '' && !isResultGotten) &&
                <p className='sf-tip-default d-flex justify-content-center'>{gettext('Type characters to start search')}</p>}
              {(value !== '' && isResultGotten && results.length === 0) &&
                <p className='sf-tip-default d-flex justify-content-center'>{gettext('No result')}</p>}
              {groupedResults.map((group) => (
                <div key={group.wiki_id} className="wikis-search-group mb-3">
                  <div className="wikis-search-group-header d-flex align-items-center mb-2">
                    <Icon symbol="wiki2" className="mr-2" />
                    <span className="font-weight-bold">{group.wiki_name}</span>
                  </div>
                  {group.pages.map((result) => {
                    const flatIndex = getFlatIndex(result);
                    const isHighlight = highlightIndex === flatIndex;
                    const key = result._id || result.doc_uuid || `${result.wiki_id}-${result.page_id || ''}-${flatIndex}`;
                    return (
                      <div
                        key={key}
                        className={`wiki2-search-result ${isHighlight ? 'wiki2-search-result-highlight' : ''}`}
                        onClick={() => handleItemClick(result)}
                        ref={isHighlight ? (ref) => { highlightRef.current = ref; } : null}
                        tabIndex={0}
                        role="option"
                        aria-selected={isHighlight}
                        onKeyDown={Utils.onKeyDown}
                      >
                        <div className='wiki2-search-result-top d-flex align-items-center'>
                          <NavItemIcon symbol={'file'} disable={true} />
                          <span className='wiki2-search-result-page-name text-truncate' title={result.title} style={{ flex: 1 }}>
                            {result.title ? <span dangerouslySetInnerHTML={{ __html: result.title }}></span> : gettext('Untitled')}
                          </span>
                          <span className="wiki2-search-result-enter">
                            <Icon symbol="enter" style={isHighlight ? { opacity: 1 } : {}} />
                          </span>
                        </div>
                        {result.content ?
                          <div className='wiki2-search-result-bottom'>
                            <p dangerouslySetInnerHTML={{ __html: result.content }} ></p>
                          </div>
                          :
                          <div className='py-1'></div>
                        }
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ModalBody>
        </Modal>
      }
    </>
  );
}

WikisSearch.propTypes = {
  placeholder: PropTypes.string,
  onSearchedClick: PropTypes.func,
};

export default WikisSearch;
