import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import isHotkey from 'is-hotkey';
import classnames from 'classnames';
import MediaQuery from 'react-responsive';
import { seafileAPI } from '../../utils/seafile-api';
import searchAPI from '../../utils/search-api';
import { gettext, siteRoot } from '../../utils/constants';
import SearchResultItem from './search-result-item';
import SearchResultLibrary from './search-result-library';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import Loading from '../loading';
import { SEARCH_MASK, SEARCH_CONTAINER } from '../../constants/zIndexes';

const propTypes = {
  repoID: PropTypes.string,
  path: PropTypes.string,
  placeholder: PropTypes.string,
  onSearchedClick: PropTypes.func.isRequired,
  isPublic: PropTypes.bool,
  isViewFile: PropTypes.bool,
};

const PER_PAGE = 10;
const controlKey = Utils.isMac() ? '⌘' : 'Ctrl';

const isEnter = isHotkey('enter');
const isUp = isHotkey('up');
const isDown = isHotkey('down');

class Search extends Component {

  constructor(props) {
    super(props);
    this.baseSearchPageURL = `${siteRoot}search/`;
    this.state = {
      width: 'default',
      value: '',
      inputValue: '',
      resultItems: [],
      highlightIndex: 0,
      page: 0,
      isLoading: false,
      hasMore: true,
      isMaskShow: false,
      showRecent: true,
      isResultGetted: false,
      isCloseShow: false,
      isSearchInputShow: false, // for mobile
      searchPageUrl: this.baseSearchPageURL,
      searchTypesMax: 0,
      highlightSearchTypesIndex: 0,
    };
    this.highlightRef = null;
    this.source = null; // used to cancel request;
    this.inputRef = React.createRef();
    this.searchContainer = React.createRef();
    this.searchResultListRef = React.createRef();
    this.isChineseInput = false;
    this.searchResultListContainerRef = React.createRef();
    this.calculateStoreKey(props);
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onDocumentKeydown);
    document.addEventListener('compositionstart', this.onCompositionStart);
    document.addEventListener('compositionend', this.onCompositionEnd);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.calculateStoreKey(nextProps);
    this.isChineseInput = false;
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onDocumentKeydown);
    document.removeEventListener('compositionstart', this.onCompositionStart);
    document.removeEventListener('compositionend', this.onCompositionEnd);
    this.isChineseInput = false;
  }

  calculateStoreKey = (props) => {
    const { repoID } = props;
    let storeKey = 'sfVisitedSearchItems';
    if (repoID) {
      storeKey += repoID;
    }
    this.storeKey = storeKey;
  };

  onCompositionStart = () => {
    this.isChineseInput = true;
  };

  onCompositionEnd = () => {
    this.isChineseInput = false;
  };

  onDocumentKeydown = (e) => {
    if (isHotkey('mod+k')(e)) {
      e.preventDefault();
      this.onFocusHandler();
      if (this.inputRef && this.inputRef.current) {
        this.inputRef.current.focus();
      }
    }
    if (this.state.isMaskShow) {
      if (isHotkey('esc', e)) {
        e.preventDefault();
        this.inputRef && this.inputRef.current && this.inputRef.current.blur();
        this.resetToDefault();
      } else if (isEnter(e)) {
        this.onEnter(e);
      } else if (isUp(e)) {
        this.onUp(e);
      } else if (isDown(e)) {
        this.onDown(e);
      }
    }
  };

  onFocusHandler = () => {
    this.setState({ width: '570px', isMaskShow: true, isCloseShow: true });
    this.calculateHighlightType();
  };

  onCloseHandler = () => {
    this.resetToDefault();
  };

  onUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { highlightIndex, resultItems, isResultGetted } = this.state;

    // 01 init search, display and highlight recent search results
    if (this.state.showRecent) {
      if (highlightIndex > 0) {
        this.setState({ highlightIndex: highlightIndex - 1 }, () => {
          if (this.highlightRef) {
            const { top, height } = this.highlightRef.getBoundingClientRect();
            if (top - height < 0) {
              this.searchResultListContainerRef.current.scrollTop -= height;
            }
          }
        });
      }
      return;
    }

    // 02 global search, display and highlight searched repos
    if (!this.props.repoID && resultItems.length > 0 && !isResultGetted) {
      let highlightSearchTypesIndex = this.state.highlightSearchTypesIndex - 1;
      if (highlightSearchTypesIndex < 0) {
        highlightSearchTypesIndex = resultItems.length;
      }
      this.setState({ highlightSearchTypesIndex }, () => {
        if (this.highlightRef) {
          const { top, height } = this.highlightRef.getBoundingClientRect();
          if (top - height < 0) {
            this.searchResultListContainerRef.current.scrollTop -= height;
          }
        }
      });
      return;
    }

    // 03 Internal repo search, highlight search types
    if (!isResultGetted) {
      let highlightSearchTypesIndex = this.state.highlightSearchTypesIndex - 1;
      if (highlightSearchTypesIndex < 0) {
        highlightSearchTypesIndex = this.state.searchTypesMax;
      }
      this.setState({ highlightSearchTypesIndex });
      return;
    }

    // 04 When there are search results, highlighte searched items
    if (highlightIndex > 0) {
      this.setState({ highlightIndex: highlightIndex - 1 }, () => {
        if (this.highlightRef) {
          const { top, height } = this.highlightRef.getBoundingClientRect();
          if (top - height < 0) {
            this.searchResultListContainerRef.current.scrollTop -= height;
          }
        }
      });
    }
  };

  onDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { highlightIndex, resultItems, isResultGetted } = this.state;

    // 01 init search, display and highlight recent search results
    if (this.state.showRecent) {
      const visitedItems = JSON.parse(localStorage.getItem(this.storeKey)) || [];
      if (highlightIndex < visitedItems.length - 1) {
        this.setState({ highlightIndex: highlightIndex + 1 }, () => {
          if (this.highlightRef) {
            const { top, height } = this.highlightRef.getBoundingClientRect();
            const outerHeight = 300;
            if (top > outerHeight) {
              const newScrollTop = this.searchResultListContainerRef.current.scrollTop + height;
              this.searchResultListContainerRef.current.scrollTop = newScrollTop;
            }
          }
        });
      }
      return;
    }

    // 02 global search, display and highlight searched repos
    if (!this.props.repoID && resultItems.length > 0 && !isResultGetted) {
      let highlightSearchTypesIndex = this.state.highlightSearchTypesIndex + 1;
      if (highlightSearchTypesIndex > resultItems.length) {
        highlightSearchTypesIndex = 0;
      }
      this.setState({ highlightSearchTypesIndex }, () => {
        if (this.highlightRef) {
          const { top, height } = this.highlightRef.getBoundingClientRect();
          const outerHeight = 300;
          if (top > outerHeight) {
            const newScrollTop = this.searchResultListContainerRef.current.scrollTop + height;
            this.searchResultListContainerRef.current.scrollTop = newScrollTop;
          }
        }
      });
      return;
    }

    // 03 Internal repo search, highlight search types
    if (!this.state.isResultGetted) {
      let highlightSearchTypesIndex = this.state.highlightSearchTypesIndex + 1;
      if (highlightSearchTypesIndex > this.state.searchTypesMax) {
        highlightSearchTypesIndex = 0;
      }
      this.setState({ highlightSearchTypesIndex });
      return;
    }

    // 04 When there are search results, highlighte searched items
    if (highlightIndex < resultItems.length - 1) {
      this.setState({ highlightIndex: highlightIndex + 1 }, () => {
        if (this.highlightRef) {
          const { top, height } = this.highlightRef.getBoundingClientRect();
          const outerHeight = 300;
          if (top > outerHeight) {
            const newScrollTop = this.searchResultListContainerRef.current.scrollTop + height;
            this.searchResultListContainerRef.current.scrollTop = newScrollTop;
          }
        }
      });
    }
  };

  onEnter = (e) => {
    e.preventDefault();
    if (this.state.showRecent) {
      const visitedItems = JSON.parse(localStorage.getItem(this.storeKey)) || [];
      const item = visitedItems[this.state.highlightIndex];
      if (item) {
        if (document.activeElement) {
          document.activeElement.blur();
        }
        this.onItemClickHandler(item);
      }
      return;
    }
    // global searching, searched repos needs to support enter
    const { highlightSearchTypesIndex, resultItems, isResultGetted } = this.state;
    if (!this.props.repoID && resultItems.length > 0 && !isResultGetted) {
      if (highlightSearchTypesIndex === 0) {
        this.searchAllRepos();
      } else {
        let item = this.state.resultItems[highlightSearchTypesIndex - 1];
        if (item) {
          if (document.activeElement) {
            document.activeElement.blur();
          }
          this.onItemClickHandler(item);
        }
      }
    }
    if (!this.state.isResultGetted) {
      let highlightDom = document.querySelector('.search-types-highlight');
      if (highlightDom) {
        if (highlightDom.classList.contains('search-types-folder')) {
          this.searchFolder();
        }
        else if (highlightDom.classList.contains('search-types-repo')) {
          this.searchRepo();
        }
        else if (highlightDom.classList.contains('search-types-repos')) {
          this.searchAllRepos();
        }
        return;
      }
    }
    let item = this.state.resultItems[this.state.highlightIndex];
    if (item) {
      if (document.activeElement) {
        document.activeElement.blur();
      }
      this.onItemClickHandler(item);
    }
  };

  onItemClickHandler = (item) => {
    this.resetToDefault();
    this.keepVisitedItem(item);
    this.props.onSearchedClick(item);
  };

  calculateHighlightType = () => {
    let searchTypesMax = 0;
    const { repoID, path, isViewFile } = this.props;
    if (repoID) {
      searchTypesMax++;
    }
    if (path && path !== '/' && !isViewFile) {
      searchTypesMax++;
    }
    this.setState({
      searchTypesMax,
      highlightSearchTypesIndex: 0,
    });
  };

  keepVisitedItem = (targetItem) => {
    let targetIndex;
    const storeKey = this.storeKey;
    const items = JSON.parse(localStorage.getItem(storeKey)) || [];
    for (let i = 0, len = items.length; i < len; i++) {
      const { repo_id, path } = items[i];
      const { repo_id: targetRepoID, path: targetPath } = targetItem;
      if (repo_id == targetRepoID && path == targetPath) {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex != undefined) {
      items.splice(targetIndex, 1);
    }
    items.unshift(targetItem);
    if (items.length > 50) { // keep 50 items at most
      items.pop();
    }
    localStorage.setItem(storeKey, JSON.stringify(items));
  };

  onChangeHandler = (event) => {
    const newValue = event.target.value;
    if (this.state.showRecent) {
      this.setState({ showRecent: false });
    }
    this.setState({ value: newValue });
    setTimeout(() => {
      const trimmedValue = newValue.trim();
      const isInRepo = this.props.repoID;
      if (this.isChineseInput === false && this.state.inputValue !== newValue) {
        this.setState({
          inputValue: newValue,
          isLoading: false,
          highlightIndex: 0,
          // resultItems: [],
          isResultGetted: false,
        }, () => {
          if (!isInRepo && trimmedValue !== '') {
            this.getRepoSearchResult(newValue);
          }
        });
      }
    }, 1);
  };

  getRepoSearchResult = (query_str) => {
    if (this.source) {
      this.source.cancel('prev request is cancelled');
    }

    this.source = seafileAPI.getSource();

    const query_type = 'library';
    let results = [];
    searchAPI.searchItems(query_str, query_type, this.source.token).then(res => {
      results = [...results, ...this.formatResultItems(res.data.results)];
      this.setState({
        resultItems: results,
        isLoading: false,
        hasMore: false,
      });
    }).catch(error => {
      // eslint-disable-next-line no-console
      console.log(error);
      this.setState({ isLoading: false });
    });
  };

  getSearchResult = (queryData) => {
    if (this.source) {
      this.source.cancel('prev request is cancelled');
    }
    this.setState({
      isLoading: true,
      isResultGetted: false,
      resultItems: [],
      highlightIndex: 0,
    });
    this.source = seafileAPI.getSource();
    this.sendRequest(queryData, this.source.token, 1);
  };

  sendRequest = (queryData, cancelToken, page) => {
    let isPublic = this.props.isPublic;
    this.queryData = queryData;

    if (isPublic) {
      seafileAPI.searchFilesInPublishedRepo(queryData.search_repo, queryData.q, page, PER_PAGE).then(res => {
        this.source = null;
        if (res.data.total > 0) {
          this.setState({
            resultItems: [...this.state.resultItems, ...this.formatResultItems(res.data.results)],
            isResultGetted: true,
            page: page + 1,
            isLoading: false,
            hasMore: res.data.has_more,
          });
        } else {
          this.setState({
            highlightIndex: 0,
            resultItems: [],
            isLoading: false,
            isResultGetted: true,
            hasMore: res.data.has_more,
          });
        }
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
        this.setState({ isLoading: false });
      });
    } else {
      this.onNormalSearch(queryData, cancelToken, page);
    }
  };

  onNormalSearch = (queryData, cancelToken, page) => {
    this.updateSearchPageURL(queryData);
    queryData['per_page'] = PER_PAGE;
    queryData['page'] = page;
    seafileAPI.searchFiles(queryData, cancelToken).then(res => {
      this.source = null;
      if (res.data.total > 0) {
        this.setState({
          resultItems: [...this.state.resultItems, ...this.formatResultItems(res.data.results)],
          isResultGetted: true,
          isLoading: false,
          page: page + 1,
          hasMore: res.data.has_more,
        });
        return;
      }
      this.setState({
        highlightIndex: 0,
        resultItems: [],
        isLoading: false,
        isResultGetted: true,
        hasMore: res.data.has_more,
      });
    }).catch(error => {
      /* eslint-disable */
      console.log(error);
      this.setState({ isLoading: false });
    });
  };

  onResultListScroll = (e) => {
    // Load less than 100 results
    if (!this.state.hasMore || this.state.isLoading || this.state.resultItems.length > 100) {
      return;
    }
    const listPadding = 20;
    if (e.target.scrollTop + e.target.clientHeight + listPadding > this.searchResultListRef.current.clientHeight - 10) {
      this.setState({isLoading: true}, () => {
        this.source = seafileAPI.getSource();
        this.sendRequest(this.queryData, this.source.token, this.state.page);
      });
    }
  };

  updateSearchPageURL(queryData) {
    let params = '';
    for (let key in queryData) {
      params += key + '=' + encodeURIComponent(queryData[key]) + '&';
    }
    this.setState({searchPageUrl: `${this.baseSearchPageURL}?${params.substring(0, params.length - 1)}`});
  }

  formatResultItems(data) {
    let items = [];
    for (let i = 0; i < data.length; i++) {
      items[i] = {};
      let name = data[i].is_dir ? data[i].name : data[i].fullpath.split('/').pop();
      items[i]['index'] = [i];
      items[i]['name'] = name;
      items[i]['path'] = data[i].fullpath;
      items[i]['repo_id'] = data[i].repo_id;
      items[i]['repo_name'] = data[i].repo_name;
      items[i]['is_dir'] = data[i].is_dir;
      items[i]['link_content'] = decodeURI(data[i].fullpath).substring(1);
      items[i]['content'] = data[i].content_highlight;
      items[i]['thumbnail_url'] = data[i].thumbnail_url;
    }
    return items;
  }

  resetToDefault() {
    this.setState({
      width: '',
      value: '',
      inputValue: '',
      isMaskShow: false,
      isCloseShow: false,
      isResultGetted: false,
      resultItems: [],
      highlightIndex: 0,
      isSearchInputShow: false,
      showRecent: true,
    });
  }

  renderSearchResult() {
    const { resultItems, width, showRecent, isResultGetted, isLoading } = this.state;
    if (!width || width === 'default') return null;

    if (showRecent) {
      const visitedItems = JSON.parse(localStorage.getItem(this.storeKey)) || [];
      if (visitedItems.length > 0) {
        return this.renderResults(visitedItems, true);
      }
    }

    if (isLoading) {
      return <Loading />;
    }
    else if (this.state.inputValue.trim().length === 0) {
      return <div className="search-result-none">{gettext('Type characters to start search')}</div>;
    }
    else if (!isResultGetted) {
      return this.renderSearchTypes(this.state.inputValue.trim());
    }
    else if (resultItems.length > 0) {
      return this.renderResults(resultItems);
    }
    else {
      return <div className="search-result-none">{gettext('No results matching')}</div>;
    }
  }

  renderSearchTypes = (inputValue) => {
    const highlightIndex = this.state.highlightSearchTypesIndex;
    const { resultItems } = this.state;
    if (!this.props.repoID) {
      return (
        <div className="search-result-list-container" ref={this.searchResultListContainerRef}>
          <div className="search-types">
            <div
              className={classnames('search-types-repos', { 'search-types-highlight': highlightIndex === 0 })}
              onClick={this.searchAllRepos}
              tabIndex={0}
            >
              <i className="search-icon-left input-icon-addon sf3-font sf3-font-search"></i>
              {inputValue}
              <span className="search-types-text">{gettext('in all libraries')}</span>
              <i className="sf3-font sf3-font-enter"></i>
            </div>
          </div>
          {resultItems.length > 0 && (
            <div className="library-result-container">
              <hr className="library-result-divider" />
              <div className="library-result-header">{gettext('Libraries')}</div>
              <ul
                className="library-result-list"
                ref={this.searchResultListRef}
              >
                {resultItems.map((item, index) => {
                  return (
                    <SearchResultLibrary
                      key={index}
                      item={item}
                      onClick={this.onItemClickHandler}
                      isHighlight={highlightIndex === index + 1}
                      setRef={highlightIndex === index + 1 ? (ref) => {this.highlightRef = ref;} : () => {}}
                    />
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      );
    }
    if (this.props.repoID) {
      if (this.props.path && this.props.path !== '/' && !this.props.isViewFile) {
        return (
          <div className="search-types">
            <div className={`search-types-repo ${highlightIndex === 0 ? 'search-types-highlight' : ''}`} onClick={this.searchRepo} tabIndex={0}>
              <i className="search-icon-left input-icon-addon sf3-font sf3-font-search"></i>
              {inputValue}
              <span className="search-types-text">{gettext('in this library')}</span>
              {highlightIndex === 0 && <i className="sf3-font sf3-font-enter"></i>}
            </div>
            <div className={`search-types-folder ${highlightIndex === 1 ? 'search-types-highlight' : ''}`} onClick={this.searchFolder} tabIndex={0}>
              <i className="search-icon-left input-icon-addon sf3-font sf3-font-search"></i>
              {inputValue}
              <span className="search-types-text">{gettext('in this folder')}</span>
              {highlightIndex === 1 && <i className="sf3-font sf3-font-enter"></i>}
            </div>
            <div className={`search-types-repos ${highlightIndex === 2 ? 'search-types-highlight' : ''}`} onClick={this.searchAllRepos} tabIndex={0}>
              <i className="search-icon-left input-icon-addon sf3-font sf3-font-search"></i>
              {inputValue}
              <span className="search-types-text">{gettext('in all libraries')}</span>
              {highlightIndex === 2 && <i className="sf3-font sf3-font-enter"></i>}
            </div>
          </div>
        );
      } else {
        return (
          <div className="search-types">
            <div className={`search-types-repo ${highlightIndex === 0 ? 'search-types-highlight' : ''}`} onClick={this.searchRepo} tabIndex={0}>
              <i className="search-icon-left input-icon-addon sf3-font sf3-font-search"></i>
              {inputValue}
              <span className="search-types-text">{gettext('in this library')}</span>
              {highlightIndex === 0 && <i className="sf3-font sf3-font-enter"></i>}
            </div>
            <div className={`search-types-repos ${highlightIndex === 1 ? 'search-types-highlight' : ''}`} onClick={this.searchAllRepos} tabIndex={0}>
              <i className="search-icon-left input-icon-addon sf3-font sf3-font-search"></i>
              {inputValue}
              <span className="search-types-text">{gettext('in all libraries')}</span>
              {highlightIndex === 1 && <i className="sf3-font sf3-font-enter"></i>}
            </div>
          </div>
        );
      }
    }
  }

  searchRepo = () => {
    const { value } = this.state;
    const queryData = {
      q: value,
      search_repo: this.props.repoID,
      search_ftypes: 'all',
    };
    this.getSearchResult(queryData);
  };

  searchFolder = () => {
    const { value } = this.state;
    const queryData = {
      q: value,
      search_repo: this.props.repoID,
      search_ftypes: 'all',
      search_path: this.props.path,
    };
    this.getSearchResult(queryData);
  };

  searchAllRepos = () => {
    const { value } = this.state;
    const queryData = {
      q: value,
      search_repo: 'all',
      search_ftypes: 'all',
    };
    this.getSearchResult(queryData);
  };

  renderResults = (resultItems, isVisited) => {
    const { highlightIndex } = this.state;
    const results = (
      <>
      {isVisited && <h4 className="visited-search-results-title">{gettext('Search results visited recently')}</h4>}
      <ul className="search-result-list" ref={this.searchResultListRef}>
        {resultItems.map((item, index) => {
          const isHighlight = index === highlightIndex;
          return (
            <SearchResultItem
              key={index}
              item={item}
              onItemClickHandler={this.onItemClickHandler}
              isHighlight={isHighlight}
              setRef={isHighlight ? (ref) => {this.highlightRef = ref;} : () => {}}
            />
          );
        })}
      </ul>
      </>
    );

    return (
      <>
        <MediaQuery query="(min-width: 768px)">
          <div className="search-result-list-container" ref={this.searchResultListContainerRef}>{results}</div>
        </MediaQuery>
        <MediaQuery query="(max-width: 767.8px)">
          {results}
        </MediaQuery>
      </>
    );
  }

  onSearchToggle = () => {
    this.setState({
      isSearchInputShow: !this.state.isSearchInputShow,
      isMaskShow: !this.state.isMaskShow,
    });
  };

  render() {
    let width = this.state.width !== 'default' ? this.state.width : '';
    let style = {'width': width};
    const { isMaskShow } = this.state;
    const placeholder = `${this.props.placeholder}${isMaskShow ? '' : ` (${controlKey} + k )`}`;
    return (
      <Fragment>
        <MediaQuery query="(min-width: 768px)">
          <div className="search">
            <div className={`search-mask ${isMaskShow ? 'show' : 'hide'}`} onClick={this.onCloseHandler} style={{ zIndex: SEARCH_MASK }}></div>
            <div className={`search-container ${isMaskShow ? 'show' : ''}`} style={{ zIndex: SEARCH_CONTAINER }}>
              <div className={`input-icon ${isMaskShow ? 'mb-1' : ''}`}>
                <i className="search-icon-left input-icon-addon sf3-font sf3-font-search"></i>
                <input
                  type="text"
                  className="form-control search-input"
                  name="query"
                  placeholder={placeholder}
                  style={style}
                  value={this.state.value}
                  onFocus={this.onFocusHandler}
                  onChange={this.onChangeHandler}
                  autoComplete="off"
                  ref={this.inputRef}
                />
                {this.state.isCloseShow &&
                  <button type="button" className="search-icon-right input-icon-addon sf3-font sf3-font-x-01 border-0 bg-transparent mr-4" onClick={this.onCloseHandler} aria-label={gettext('Close')}></button>
                }
              </div>
              <div
                className="search-result-container dropdown-search-result-container"
                onScroll={this.onResultListScroll}
                ref={this.searchContainer}
              >
                {this.renderSearchResult()}
              </div>
            </div>
          </div>
        </MediaQuery>
        <MediaQuery query="(max-width: 767.8px)">
          <div className="search-icon-container">
            <i className="search-icon sf3-font sf3-font-search" onClick={this.onSearchToggle}></i>
          </div>
          {this.state.isSearchInputShow &&
            <div className="search">
              <div className={`search-mask ${isMaskShow ? '' : 'hide'}`} onClick={this.onCloseHandler} style={{ zIndex: SEARCH_MASK }}></div>
              <div className="search-container" style={{ zIndex: SEARCH_CONTAINER }}>
                <div className="input-icon">
                  <i className="search-icon-left input-icon-addon sf3-font sf3-font-search"></i>
                  <input
                    type="text"
                    className="form-control search-input"
                    name="query"
                    placeholder={placeholder}
                    style={style}
                    value={this.state.value}
                    onFocus={this.onFocusHandler}
                    onChange={this.onChangeHandler}
                    autoComplete="off"
                  />
                  {this.state.isCloseShow &&
                    <button type="button" className="search-icon-right input-icon-addon sf3-font sf3-font-x-01 border-0 bg-transparent" onClick={this.onCloseHandler} aria-label={gettext('Close')}></button>
                  }
                </div>
                <div className="search-result-container dropdown-search-result-container" onScroll={this.onResultListScroll}>
                  {this.renderSearchResult()}
                </div>
              </div>
            </div>
          }
        </MediaQuery>
      </Fragment>
    );
  }
}

Search.propTypes = propTypes;

export default Search;
