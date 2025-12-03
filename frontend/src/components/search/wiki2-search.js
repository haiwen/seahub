import React, { useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody, Input, Button } from 'reactstrap';
import isHotkey from 'is-hotkey';
import searchAPI from '../../utils/search-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import Loading from '../loading';
import Wiki2SearchResult from './wiki2-search-result';
import IconBtn from '../icon-btn';
import Icon from '../icon';

import './wiki2-search.css';

const isEnter = isHotkey('enter');
const isUp = isHotkey('up');
const isDown = isHotkey('down');

function Wiki2Search({ setCurrentPage, config, getCurrentPageId, wikiId }) {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isResultGotten, setIsResultGotten] = useState(false);
  let searchResultListContainerRef = useRef(null);
  let highlightRef = useRef(null);

  const onDocumentKeyDown = useCallback((e) => {
    if (!isModalOpen && isHotkey('mod+k')(e)) {
      e.preventDefault();
      e.stopPropagation();
      setIsModalOpen(true);
      return;
    }
  }, [isModalOpen]);

  useEffect(() => {
    document.addEventListener('keydown', onDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', onDocumentKeyDown);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClearSearch = useCallback(() => {
    setValue('');
    setHighlightIndex(0);
    setResults([]);
    setIsResultGotten(false);
  }, []);

  const resetToDefault = useCallback(() => {
    onClearSearch();
    setIsModalOpen(false);
  }, [onClearSearch]);

  const onKeyDown = useCallback((e) => {
    if (isHotkey('esc', e)) {
      resetToDefault();
      return;
    }
    if (isResultGotten) {
      if (isEnter(e)) {
        const highlightResult = results[highlightIndex];
        if (highlightResult && highlightResult.page.id !== getCurrentPageId()) {
          setCurrentPage(highlightResult.page.id);
          resetToDefault();
        }
      } else if (isUp(e)) {
        onUp(e, highlightIndex);
      } else if (isDown(e)) {
        onDown(e, results, highlightIndex);
      }
    } else {
      if (isEnter(e)) {
        getWikiSearchResult(value);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResultGotten, value, results, highlightIndex]);

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

  const getWikiSearchResult = useCallback((searchValue) => {
    if (!searchValue.trim()) return;
    setIsLoading(true);
    setHighlightIndex(-1);
    setIsResultGotten(false);
    setResults([]);
    searchAPI.searchWiki(searchValue.trim(), wikiId).then(res => {
      if (res.data.results) {
        let newResults = [];
        res.data.results.forEach(result => {
          const page = config.pages.find(page => page.docUuid === result.doc_uuid);
          if (page) {
            result.page = Object.assign({}, page);
            newResults.push(result);
          }
        });
        setResults(newResults);
        setHighlightIndex(0);
        setIsLoading(false);
        setIsResultGotten(true);
      } else {
        setResults([]);
        setHighlightIndex(-1);
        setIsLoading(false);
        setIsResultGotten(true);
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      setIsLoading(false);
    });
  }, [config, wikiId]);

  const onInputChange = useCallback((e) => {
    const { value } = e.target;
    setValue(value);
    setIsResultGotten(false);
    setResults([]);
  }, []);

  return (
    <>
      <Button className="wiki2-search border-0 p-0 font-weight-normal" onClick={() => setIsModalOpen(true)}>
        <span className="w-6 h-6 d-flex align-items-center justify-content-center">
          <Icon symbol="search" aria-hidden="true" />
        </span>
        <span>{gettext('Search')}</span>
      </Button>
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
                placeholder={gettext('Search')}
                autoComplete="off"
                value={value}
                onChange={onInputChange}
                onKeyDown={onKeyDown}
                autoFocus={true}
              />
              <IconBtn
                symbol="x-01"
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
              {results.map((result, index) => {
                return (
                  <Wiki2SearchResult
                    result={result}
                    key={result._id}
                    getCurrentPageId={getCurrentPageId}
                    setCurrentPage={setCurrentPage}
                    resetToDefault={resetToDefault}
                    isHighlight={highlightIndex === index}
                    setRef={highlightIndex === index ? (ref) => {highlightRef.current = ref;} : () => {}}
                  />
                );
              })}
            </div>
          </ModalBody>
        </Modal>
      }
    </>
  );
}

Wiki2Search.propTypes = {
  wikiId: PropTypes.string.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  config: PropTypes.object.isRequired,
  getCurrentPageId: PropTypes.func.isRequired,
};

export default Wiki2Search;
