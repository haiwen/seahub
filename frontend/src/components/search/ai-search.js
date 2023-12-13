import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import isHotkey from 'is-hotkey';
import classnames from 'classnames';
import MediaQuery from 'react-responsive';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot } from '../../utils/constants';
import SearchResultItem from './search-result-item';
import { Utils } from '../../utils/utils';
import { isMac } from '../../utils/extra-attributes';
import toaster from '../toast';
import Switch from '../common/switch';
import { SEARCH_DELAY_TIME, getValueLength } from './constant';
import AISearchAsk from './ai-search-ask';
import AISearchRobot from './ai-search-widgets/ai-search-robot';

const INDEX_STATE = {
  RUNNING: 'running',
  UNCREATED: 'uncreated',
  FINISHED: 'finished'
};

const SEARCH_MODE = {
  QA: 'question-answering',
  COMBINED: 'combined-search',
};

const PER_PAGE = 10;
const controlKey = isMac() ? '⌘' : 'Ctrl';

export default class AISearch extends Component {

  static propTypes = {
    repoID: PropTypes.string,
    placeholder: PropTypes.string,
    onSearchedClick: PropTypes.func.isRequired,
    repoName: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.baseSearchPageURL = `${siteRoot}search/`;
    this.state = {
      width: 'default',
      value: '',
      resultItems: [],
      highlightIndex: 0,
      page: 0,
      isLoading: false,
      hasMore: true,
      isMaskShow: false,
      isResultShow: false,
      isResultGetted: false,
      isCloseShow: false,
      isSearchInputShow: false, // for mobile
      searchPageUrl: this.baseSearchPageURL,
      indexState: '',
      searchMode: SEARCH_MODE.COMBINED,
    };
    this.inputValue = '';
    this.highlightRef = null;
    this.source = null; // used to cancel request;
    this.inputRef = React.createRef();
    this.searchContainer = React.createRef();
    this.searchResultListRef = React.createRef();
    this.indexStateTimer = null;
    this.timer = null;
    this.isChineseInput = false;
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onDocumentKeydown);
    document.addEventListener('compositionstart', this.onCompositionStart);
    document.addEventListener('compositionend', this.onCompositionEnd);
    this.queryLibraryIndexState();
  }

  queryLibraryIndexState() {
    seafileAPI.queryLibraryIndexState(this.props.repoID).then(res => {
      const { state: indexState, task_id: taskId } = res.data;
      this.setState({ indexState }, () => {
        if (indexState === INDEX_STATE.RUNNING) {
          this.queryIndexTaskStatus(taskId);
        }
      });
    }).catch(error => {
      this.setState({ indexState: INDEX_STATE.UNCREATED });
    });
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onDocumentKeydown);
    document.removeEventListener('compositionstart', this.onCompositionStart);
    document.removeEventListener('compositionend', this.onCompositionEnd);
    this.isChineseInput = false;
    this.clearTimer();
    if (this.indexStateTimer) {
      clearInterval(this.indexStateTimer);
      this.indexStateTimer = null;
    }
  }

  clearTimer = () => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  };

  onCompositionStart = () => {
    this.isChineseInput = true;
    this.clearTimer();
  };

  onCompositionEnd = () => {
    this.isChineseInput = false;
    // chrome：compositionstart -> onChange -> compositionend
    // not chrome：compositionstart -> compositionend -> onChange
    // The onChange event will setState and change input value, then setTimeout to initiate the search
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.onSearch();
    }, SEARCH_DELAY_TIME);
  };

  onDocumentKeydown = (e) => {
    if (isHotkey('mod+f')(e)) {
      e.preventDefault();
      this.onFocusHandler();
      if (this.inputRef && this.inputRef.current) {
        this.inputRef.current.focus();
      }
    } else if (isHotkey('esc', e)) {
      e.preventDefault();
      this.inputRef && this.inputRef.current && this.inputRef.current.blur();
      this.resetToDefault();
    } else if (isHotkey('enter', e)) {
      this.onEnter(e);
    } else if (isHotkey('up', e)) {
      this.onUp(e);
    } else if (isHotkey('down', e)) {
      this.onDown(e);
    }
  };

  onFocusHandler = () => {
    this.setState({ width: '570px', isMaskShow: true, isCloseShow: true });
  };

  onCloseHandler = () => {
    this.resetToDefault();
  };

  onUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { highlightIndex } = this.state;
    if (highlightIndex > 0) {
      this.setState({ highlightIndex: highlightIndex - 1 }, () => {
        if (this.highlightRef) {
          const { top, height } = this.highlightRef.getBoundingClientRect();
          if (top - height < 0) {
            this.searchContainer.current.scrollTop -= height;
          }
        }
      });
    }
  };

  onDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { highlightIndex, resultItems } = this.state;
    if (highlightIndex < resultItems.length - 1) {
      this.setState({ highlightIndex: highlightIndex + 1 }, () => {
        if (this.highlightRef) {
          const { top, height } = this.highlightRef.getBoundingClientRect();
          const outerHeight = 300;
          if (top > outerHeight) {
            this.searchContainer.current.scrollTop += height;
          }
        }
      });
    }
  };

  onEnter = (e) => {
    e.preventDefault();
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

  keepVisitedItem = (targetItem) => {
    const { repoID } = this.props;
    let targetIndex;
    let storeKey = 'sfVisitedAISearchItems';
    if (repoID) {
      storeKey += repoID;
    }
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
    this.setState({ value: newValue }, () => {
      if (this.inputValue === newValue.trim()) return;
      this.inputValue = newValue.trim();
      if (!this.isChineseInput) {
        this.clearTimer();
        this.timer = setTimeout(() => {
          this.onSearch();
        }, SEARCH_DELAY_TIME);
      }
    });
  };

  onKeydownHandler = (event) => {
    if (isHotkey('enter', event)) {
      this.onSearch();
    }
  };

  onSearch = () => {
    const { value } = this.state;
    const { repoID } = this.props;
    if (this.inputValue === '' || getValueLength(this.inputValue) < 3) {
      this.setState({
        highlightIndex: 0,
        resultItems: [],
        isResultShow: false,
        isResultGetted: false
      });
      return;
    }
    const queryData = {
      q: value,
      search_repo: repoID ? repoID : 'all',
      search_ftypes: 'all',
    };
    this.getSearchResult(queryData);
  };

  getSearchResult = (queryData) => {
    if (this.source) {
      this.source.cancel('prev request is cancelled');
    }
    this.setState({
      isResultShow: true,
      isResultGetted: false,
      resultItems: [],
      highlightIndex: 0,
    });
    this.source = seafileAPI.getSource();
    this.sendRequest(queryData, this.source.token, 1);
  };

  sendRequest = (queryData, cancelToken, page) => {
    this.queryData = queryData;
    this.updateSearchPageURL(queryData);
    queryData['per_page'] = PER_PAGE;
    queryData['page'] = page;
     this.onAiSearch(queryData, cancelToken, page);
  };

  onAiSearch = (queryData, cancelToken, page) => {
    let results = [];
    seafileAPI.aiSearchFiles(queryData, cancelToken).then(res => {
      results = [...results, ...this.formatResultItems(res.data.results)];
      this.setState({
          resultItems: results,
          isResultGetted: true,
          isLoading: false,
          page: page + 1,
          hasMore: false,
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
      items[i]['index'] = [i];
      items[i]['name'] = data[i].name;
      items[i]['path'] = data[i].fullpath;
      items[i]['repo_id'] = data[i].repo_id;
      items[i]['is_dir'] = data[i].is_dir;
      items[i]['link_content'] = decodeURI(data[i].fullpath).substring(1);
    }
    return items;
  }

  resetToDefault() {
    this.inputValue = '';
    this.setState({
      width: '',
      value: '',
      isMaskShow: false,
      isCloseShow: false,
      isResultShow: false,
      isResultGetted: false,
      resultItems: [],
      highlightIndex: 0,
      isSearchInputShow: false,
    });
  }

  openAsk = () => {
    this.clearTimer();
    this.setState({ searchMode: SEARCH_MODE.QA });
  }

  closeAsk = () => {
    this.clearTimer();
    this.setState({ searchMode: SEARCH_MODE.COMBINED });
  }

  renderVisitedItems = (items) => {
    const { highlightIndex } = this.state;
    const results = (
      <>
        <h4 className="visited-search-results-title">{gettext('Search results visited recently')}</h4>
        <ul className="search-result-list" ref={this.searchResultListRef}>
          {items.map((item, index) => {
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
          <div className="search-result-list-container">{results}</div>
        </MediaQuery>
        <MediaQuery query="(max-width: 767.8px)">
          {results}
        </MediaQuery>
      </>
    );
  }

  renderSearchResult() {
    const { resultItems, highlightIndex, width, searchMode, answeringResult } = this.state;
    if (!width || width === 'default') return null;

    if (!this.state.isResultShow) {
      const { repoID } = this.props;
      let storeKey = 'sfVisitedAISearchItems';
      if (repoID) {
        storeKey += repoID;
      }
      const visitedItems = JSON.parse(localStorage.getItem(storeKey)) || [];
      return visitedItems.length ? this.renderVisitedItems(visitedItems) : null;
    }

    if (!this.state.isResultGetted || getValueLength(this.inputValue) < 3) {
      return (
        <span className="loading-icon loading-tip"></span>
      );
    }
    if (!resultItems.length) {
      return (
        <>
          <li className='search-result-item align-items-center' onClick={this.openAsk}>
            <AISearchRobot />
            <div className="item-content">
              <div className="item-name ellipsis">{gettext('Ask AI')}{': '}{this.state.value.trim()}</div>
            </div>
          </li>
          <div className="search-result-none">{gettext('No results matching.')}</div>
        </>
      );
    }

    const results = (
      <ul className="search-result-list" ref={this.searchResultListRef}>
        <li
          className={classnames('search-result-item align-items-center py-3', {'search-result-item-highlight': highlightIndex === 0 })}
          onClick={this.openAsk}
        >
          <AISearchRobot style={{width: 36}}/>
          <div className="item-content">
            <div className="item-name ellipsis">
            {gettext('Ask AI')}{': '}{this.state.value.trim()}
            </div>
          </div>
        </li>
        {resultItems.map((item, index) => {
          const isHighlight = (index + 1) === highlightIndex;
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
    );

    return (
      <>
        <MediaQuery query="(min-width: 768px)">
          <div className="search-result-list-container">{results}</div>
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

  queryIndexTaskStatus = (taskId) => {
    if (!taskId) return;
    this.indexStateTimer = setInterval(() => {
      seafileAPI.queryIndexTaskStatus(taskId).then(res => {
        const isFinished = res.data.is_finished;
        if (isFinished) {
          this.setState({ indexState: INDEX_STATE.FINISHED });
          this.indexStateTimer && clearInterval(this.indexStateTimer);
          this.indexStateTimer = null;
        }
      }).catch(error => {
        this.indexStateTimer && clearInterval(this.indexStateTimer);
        this.indexStateTimer = null;
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
        this.setState({ indexState: INDEX_STATE.UNCREATED });
      });
    }, 3000);
  };

  onCreateIndex = () => {
    this.setState({ indexState: INDEX_STATE.RUNNING });
    seafileAPI.createLibraryIndex(this.props.repoID).then(res => {
      const taskId = res.data.task_id;
      toaster.notify(gettext('Indexing the library. Semantic search will be available within a few minutes.'))
      this.queryIndexTaskStatus(taskId);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      this.setState({ indexState: INDEX_STATE.UNCREATED });
    });
  };

  renderSwitch = () => {
    const { indexState } = this.state;
    if (indexState === INDEX_STATE.FINISHED || indexState === INDEX_STATE.RUNNING) {
      return (
        <Switch
          checked={true}
          placeholder={gettext('Turn on semantic search for this library')}
          className="w-100 mt-1"
          size="small"
          textPosition='right'
          disabled
        />
      );
    } else if (indexState === '' || indexState === INDEX_STATE.UNCREATED) {
      return (
        <Switch
          checked={false}
          placeholder={gettext('Turn on semantic search for this library')}
          className="w-100 mt-1"
          size="small"
          onChange={this.onCreateIndex}
          textPosition='right'
        />
      );
    }
    return null;
  }

  render() {
    let width = this.state.width !== 'default' ? this.state.width : '';
    let style = {'width': width};
    const { isMaskShow, isCloseShow, searchMode, answeringResult, resultItems } = this.state;
    const placeholder = `${this.props.placeholder}${isMaskShow ? '' : ` (${controlKey} + f )`}`;

    if (searchMode === SEARCH_MODE.QA) {
      return (
        <AISearchAsk
          token={this.source ? this.source.token : null}
          indexState={this.state.indexState}
          repoID={this.props.repoID}
          value={this.state.value.trim()}
          closeAsk={this.closeAsk}
          onItemClickHandler={this.onItemClickHandler}
        />
      );
    }

    return (
      <Fragment>
        <MediaQuery query="(min-width: 768px)">
          <div className="search">
            <div className={`search-mask ${isMaskShow ? 'show' : 'hide'}`} onClick={this.onCloseHandler}></div>
            <div className={`search-container ${isMaskShow ? 'show' : ''}`}>
              <div className={`input-icon ${isMaskShow ? 'mb-1' : ''}`}>
                <i className="search-icon-left input-icon-addon fas fa-search"></i>
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
                  onKeyDown={this.onKeydownHandler}
                />
                {this.state.isCloseShow &&
                  <button type="button" className="search-icon-right input-icon-addon fas fa-times border-0 bg-transparent mr-4" onClick={this.onCloseHandler} aria-label={gettext('Close')}></button>
                }
              </div>
              <div
                className="search-result-container dropdown-search-result-container"
                onScroll={this.onResultListScroll}
                ref={this.searchContainer}
              >
                {isCloseShow && this.renderSwitch()}
                {this.renderSearchResult()}
              </div>
            </div>
          </div>
        </MediaQuery>
        <MediaQuery query="(max-width: 767.8px)">
          <div className="search-icon-container">
            <i className="search-icon fas fa-search" onClick={this.onSearchToggle}></i>
          </div>
          {this.state.isSearchInputShow &&
            <div className="search">
              <div className={`search-mask ${isMaskShow ? '' : 'hide'}`} onClick={this.onCloseHandler}></div>
              <div className="search-container">
                <div className="input-icon">
                  <i className="search-icon-left input-icon-addon fas fa-search"></i>
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
                    <button type="button" className="search-icon-right input-icon-addon fas fa-times border-0 bg-transparent" onClick={this.onCloseHandler} aria-label={gettext('Close')}></button>
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
