import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, username } from '../../utils/constants';
import SearchResultItem from './search-result-item';
import More from '../more';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const propTypes = {
  repoID: PropTypes.string,
  placeholder: PropTypes.string,
  onSearchedClick: PropTypes.func.isRequired,
};

class Search extends Component {

  constructor(props) {
    super(props);
    this.baseSearchPageURL = `${siteRoot}search/`;
    this.state = {
      width: 'default',
      value: '',
      resultItems: [],
      total: 0,
      isMaskShow: false,
      isResultShow: false,
      isResultGetted: false,
      isCloseShow: false,
      isSearchInputShow: false, // for mobile
      searchPageUrl: this.baseSearchPageURL
    };
    this.inputValue = '';
    this.source = null; // used to cancel request;
  }

  onFocusHandler = () => {
    this.setState({
      width: '30rem',
      isMaskShow: true,
      isCloseShow: true
    });
  }

  onCloseHandler = () => {
    this.resetToDefault();
  }

  onItemClickHandler = (item) => {
    this.resetToDefault();
    this.props.onSearchedClick(item);
  }

  onChangeHandler = (event) => {
    let _this = this;
    this.setState({value: event.target.value});
    let newValue = event.target.value;
    if (this.inputValue === newValue.trim()) {
      return false;
    }
    this.inputValue = newValue.trim();

    if (this.inputValue === '' || _this.getValueLength(this.inputValue) < 3) {
      this.setState({
        isResultShow: false,
        isResultGetted: false
      });
      return false;
    }
    let repoID = this.props.repoID;
    let queryData = {
      q: newValue,
      search_repo: repoID ? repoID : 'all',
      search_ftypes: 'all',
    };

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(_this.getSearchResult(queryData), 500);
  }

  getSearchResult(queryData) {

    if(this.source){
      this.cancelRequest();
    }
    this.setState({
      isResultShow: true,
      isResultGetted: false
    });

    this.source = seafileAPI.getSource();
    this.sendRequest(queryData, this.source.token);
  }

  sendRequest(queryData, cancelToken) {
    var _this = this;
    let isPublic = this.props.isPublic;

    if (isPublic) {
      seafileAPI.searchFilesInPublishedRepo(queryData.search_repo, queryData.q).then(res => {
        if (!res.data.total) {
          _this.setState({
            resultItems: [],
            isResultGetted: true
          });
          _this.source = null;
          return;
        }

        let items = _this.formatResultItems(res.data.results);
        _this.setState({
          resultItems: items,
          isResultGetted: true
        });
        _this.source = null;
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      this.updateSearchPageURL(queryData);
      seafileAPI.searchFiles(queryData,cancelToken).then(res => {
        if (!res.data.total) {
          _this.setState({
            resultItems: [],
            isResultGetted: true
          });
          _this.source = null;
          return;
        }

        let items = _this.formatResultItems(res.data.results);
        _this.setState({
          resultItems: items,
          isResultGetted: true
        });
        _this.source = null;
      }).catch(res => {
        /* eslint-disable */
        console.log(res);
        /* eslint-enable */
      });
    }
  }

  cancelRequest() {
    this.source.cancel('prev request is cancelled');
  }

  updateSearchPageURL(queryData) {
    let params = '';
    for (let key in queryData) {
      params += key + '=' + encodeURIComponent(queryData[key]) + '&';
    }
    this.setState({searchPageUrl: `${this.baseSearchPageURL}?${params.substring(0, params.length - 1)}`});
  }

  getValueLength(str) {
    var i = 0, code, len = 0;
    for (; i < str.length; i++) {
      code = str.charCodeAt(i);
      if (code == 10) { //solve enter problem
        len += 2;
      } else if (code < 0x007f) {
        len += 1;
      } else if (code >= 0x0080 && code <= 0x07ff) {
        len += 2;
      } else if (code >= 0x0800 && code <= 0xffff) {
        len += 3;
      }
    }
    return len;
  }

  formatResultItems(data) {
    let items = [];
    let length = data.length > 5 ? 5 : data.length;
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
      items[i]['thumbnail_url'] = data[i].thumbnail_url;
    }
    return items;
  }

  resetToDefault() {
    this.inputValue = null;
    this.setState({
      width: '',
      value: '',
      isMaskShow: false,
      isCloseShow: false,
      isResultShow: false,
      isResultGetted: false,
      resultItems: [],
      isSearchInputShow: false,
    });
  }

  onShowMore = () => {
    let repoID = this.props.repoID;
    let newValue = this.state.value;
    let queryData = {
      q: newValue,
      search_repo: repoID ? repoID : 'all',
      search_ftypes: 'all',
    };
    let params = '';
    for (let key in queryData) {
      params += key + '=' + queryData[key] + '&';
    }

    window.location = siteRoot + 'search/?' + params.slice(0, params.length - 1);
  }

  renderSearchResult() {
    var _this = this;
    if (!this.state.isResultShow) {
      return;
    }
    if (!this.state.isResultGetted || this.getValueLength(this.inputValue) < 3) {
      return (
        <span className="loading-icon loading-tip"></span>
      );
    }
    if (!this.state.resultItems.length) {
      return (
        <div className="search-result-none">{gettext('No results matching.')}</div>
      );
    }
    const { resultItems, total } = this.state;
    const isShowMore = total > resultItems.length;
    return (
      <ul className="search-result-list">
        {this.state.resultItems.map((item, index) => {
          return (
            <SearchResultItem
              key={index}
              item={item}
              onItemClickHandler={_this.onItemClickHandler}
            />
          );
        })}
        {isShowMore && <More onShowMore={this.onShowMore} />}
      </ul>
    );
  }

  onSearchToggle = () => {
    this.setState({
      isSearchInputShow: !this.state.isSearchInputShow,
      isMaskShow: !this.state.isMaskShow,
    });
  }

  render() {
    let width = this.state.width !== 'default' ? this.state.width : '';
    let style = {'width': width};
    const { searchPageUrl } = this.state;
    return (
      <Fragment>
        <MediaQuery query="(min-width: 768px)">
          <div className="search">
            <div className={`search-mask ${this.state.isMaskShow ? '' : 'hide'}`} onClick={this.onCloseHandler}></div>
            <div className="search-container">
              <div className="input-icon">
                <i className="search-icon-left input-icon-addon fas fa-search"></i>
                <input
                  type="text"
                  className="form-control search-input"
                  name="query"
                  placeholder={this.props.placeholder}
                  style={style}
                  value={this.state.value}
                  onFocus={this.onFocusHandler}
                  onChange={this.onChangeHandler}
                  autoComplete="off"
                />
                {(this.state.isCloseShow && username) &&
                  <a href={searchPageUrl} className="search-icon-right input-icon-addon fas fa-external-link-alt search-icon-arrow"></a>
                }
                {this.state.isCloseShow &&
                  <button type="button" className="search-icon-right input-icon-addon fas fa-times border-0 bg-transparent" onClick={this.onCloseHandler} aria-label={gettext('Close')}></button>
                }
              </div>
              <div className="search-result-container dropdown-search-result-container">
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
              <div className={`search-mask ${this.state.isMaskShow ? '' : 'hide'}`} onClick={this.onCloseHandler}></div>
              <div className="search-container">
                <div className="input-icon">
                  <i className="search-icon-left input-icon-addon fas fa-search"></i>
                  <input
                    type="text"
                    className="form-control search-input"
                    name="query"
                    placeholder={this.props.placeholder}
                    style={style}
                    value={this.state.value}
                    onFocus={this.onFocusHandler}
                    onChange={this.onChangeHandler}
                    autoComplete="off"
                  />
                  {(this.state.isCloseShow && username) &&
                    <a href={searchPageUrl} className="search-icon-right input-icon-addon fas fa-external-link-alt search-icon-arrow"></a>
                  }
                  {this.state.isCloseShow &&
                    <button type="button" className="search-icon-right input-icon-addon fas fa-times border-0 bg-transparent" onClick={this.onCloseHandler} aria-label={gettext('Close')}></button>
                  }
                </div>
                <div className="search-result-container dropdown-search-result-container">
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
