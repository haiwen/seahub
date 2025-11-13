import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import SearchResultItem from './search-result-item';
import More from '../more';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import { getValueLength } from './constant';
import { SEARCH_MASK, SEARCH_CONTAINER } from '../../constants/zIndexes';
import Icon from '../icon';

const propTypes = {
  repoID: PropTypes.string,
  placeholder: PropTypes.string,
  onSearchedClick: PropTypes.func.isRequired
};

class Search extends Component {

  constructor(props) {
    super(props);
    this.state = {
      width: 'default',
      value: '',
      resultItems: [],
      page: 1,
      perPage: 5,
      total: 0,
      isMaskShow: false,
      isResultShow: false,
      isResultGotten: false,
      isCloseShow: false,
      isSearchInputShow: false, // for mobile
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
  };

  onCloseHandler = () => {
    this.resetToDefault();
  };

  onItemClickHandler = (item) => {
    this.resetToDefault();
    this.props.onSearchedClick(item);
  };

  onChangeHandler = (event) => {
    let _this = this;
    this.setState({ value: event.target.value });
    let newValue = event.target.value;
    if (this.inputValue === newValue.trim()) {
      return false;
    }
    this.inputValue = newValue.trim();

    if (this.inputValue === '' || getValueLength(this.inputValue) < 3) {
      this.setState({
        isResultShow: false,
        isResultGotten: false
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
  };

  getSearchResult(queryData) {

    if (this.source) {
      this.cancelRequest();
    }
    this.setState({
      isResultShow: true,
      isResultGotten: false
    });

    this.source = seafileAPI.getSource();
    this.sendRequest(queryData, this.source.token);
  }

  searchWiki(search_repo, q, page, perPage) {
    var _this = this;
    seafileAPI.searchFilesInPublishedRepo(search_repo, q, page, perPage).then(res => {
      if (!res.data.total) {
        _this.setState({
          resultItems: [],
          isResultGotten: true
        });
        _this.source = null;
        return;
      }

      const items = _this.formatResultItems(res.data.results);
      _this.setState({
        total: res.data.total,
        resultItems: page == 1 ? items : this.state.resultItems.concat(items),
        isResultGotten: true
      });
      _this.source = null;
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  sendRequest(queryData) {
    // 'page=1' for this first request
    this.setState({ page: 1 }, () => {
      const { search_repo, q } = queryData;
      const { page, perPage } = this.state;
      this.searchWiki(search_repo, q, page, perPage);
    });
  }

  cancelRequest() {
    this.source.cancel('prev request is cancelled');
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
      isResultGotten: false,
      resultItems: [],
      isSearchInputShow: false,
    });
  }

  onShowMore = () => {
    let repoID = this.props.repoID;
    let newValue = this.state.value;

    this.setState({
      page: this.state.page + 1
    }, () => {
      const { page, perPage } = this.state;
      this.searchWiki(repoID, newValue, page, perPage);
    });
  };

  renderSearchResult() {
    var _this = this;
    if (!this.state.isResultShow) {
      return;
    }
    if (!this.state.isResultGotten || getValueLength(this.inputValue) < 3) {
      return (
        <span className="loading-icon loading-tip"></span>
      );
    }
    if (!this.state.resultItems.length) {
      return (
        <div className="search-result-none">{gettext('No results matching')}</div>
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
  };

  render() {
    let width = this.state.width !== 'default' ? this.state.width : '';
    let style = { 'width': width };
    return (
      <Fragment>
        <MediaQuery query="(min-width: 768px)">
          <div className="search">
            <div className={`search-mask ${this.state.isMaskShow ? '' : 'hide'}`} onClick={this.onCloseHandler} style={{ zIndex: SEARCH_MASK }}></div>
            <div className="search-container" style={{ zIndex: SEARCH_CONTAINER }}>
              <div className="input-icon">
                <span className="search-icon-left input-icon-addon">
                  <Icon symbol="search" />
                </span>
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
                {this.state.isCloseShow && (
                  <span className="search-icon-right input-icon-addon" onClick={this.onCloseHandler}>
                    <Icon symbol="x-01" />
                  </span>
                )}
              </div>
              <div className="search-result-container dropdown-search-result-container">
                {this.renderSearchResult()}
              </div>
            </div>
          </div>
        </MediaQuery>
        <MediaQuery query="(max-width: 767.8px)">
          <div className="search-icon-container">
            <Icon className="search-icon" symbol="search" onClick={this.onSearchToggle} />
          </div>
          {this.state.isSearchInputShow &&
            <div className="search">
              <div className={`search-mask ${this.state.isMaskShow ? '' : 'hide'}`} onClick={this.onCloseHandler} style={{ zIndex: SEARCH_MASK }}></div>
              <div className="search-container" style={{ zIndex: SEARCH_CONTAINER }}>
                <div className="input-icon">
                  <span className="search-icon-left input-icon-addon">
                    <Icon symbol="search" />
                  </span>
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
                  {this.state.isCloseShow && (
                    <span className="search-icon-right input-icon-addon" onClick={this.onCloseHandler}>
                      <Icon symbol="x-01" />
                    </span>
                  )}
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
