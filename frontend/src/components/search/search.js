import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import { siteRoot } from '../../utils/constants';
import SearchResultItem from './search-result-item';
import editorUtilities from '../../utils/editor-utilties';
import More from '../more';

const propTypes = {
  repoID: PropTypes.string,
  placeholder: PropTypes.string,
  onSearchedClick: PropTypes.func.isRequired,
};

class Search extends Component {

  constructor(props) {
    super(props);
    this.state = {
      width: 'default',
      value: '',
      resultItems: [],
      isMaskShow: false,
      isResultShow: false,
      isResultGetted: false,
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

    this.source = editorUtilities.getSource();
    this.sendRequest(queryData, this.source.token);
  }

  sendRequest(queryData, cancelToken) {
    var _this = this;
    editorUtilities.searchFiles(queryData,cancelToken).then(res => {
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

  cancelRequest() {
    this.source.cancel('prev request is cancelled');
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
        <div className="search-result-none">No results matching.</div>
      );
    }
    let isShowMore = this.state.resultItems.length >= 5 ? true : false;
    return (
      <ul className="search-result-list">
        {this.state.resultItems.map(item => {
          return (
            <SearchResultItem
              key={item.index}
              item={item}
              onItemClickHandler={_this.onItemClickHandler}
            />
          );
        })}
        {isShowMore && <More onShowMore={this.onShowMore}/>}
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
                {this.state.isCloseShow && <i className='search-icon-right input-icon-addon fas fa-times' onClick={this.onCloseHandler}></i>}
              </div>
              <div className="search-result-container">
                {this.renderSearchResult()}
              </div>
            </div>
          </div>
        </MediaQuery>
        <MediaQuery query="(max-width: 768px)">
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
                  {this.state.isCloseShow && <i className='search-icon-right input-icon-addon fas fa-times' onClick={this.onCloseHandler}></i>}
                </div>
                <div className="search-result-container">
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
