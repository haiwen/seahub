import React, { Component } from 'react';
import { repoID, siteRoot } from './constance';
import SearchResultItem from './SearchResultItem';
import cookie from 'react-cookies';
import { SeafileAPI } from 'seafile-js';

let seafileAPI = new SeafileAPI();
let xcsrfHeaders = cookie.load('csrftoken');
seafileAPI.initForSeahubUsage({ siteRoot, xcsrfHeaders });

class Search extends Component {

  constructor(props) {
    super(props);
    this.state = {
      width: 'default',
      resultItems: [],
      isMaskShow: false,
      isResultShow: false,
      isResultGetted: false,
    };
    this.inputValue = '';
    this.repoid = '';
  }

  onFocusHandler = () => {
    this.setState({
      width: '30rem',
      isMaskShow: true
    })
  }

  onCloseHandler = () => {
    this.resetToDefault();
  }

  onKeyUpHandler = () => {
    let _this = this;
    let newValue = this.refs.searchInput.value;
    if (!this.repoid) {
      this.repoid = this.refs.searchInput.getAttribute('data-repoid');
    }
    if (this.inputValue === newValue.trim()) {
      return false;
    }
    this.inputValue = newValue.trim();

    if (this.inputValue === '') {
      this.setState({
        isResultShow: false,
        isResultGetted: false
      })
      return false;
    }

    let queryData = {
      q: newValue,
      search_repo: this.repoid,
      search_ftypes: 'custom',
      ftype: 'Markdown',
      input_fexts: 'md'
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(_this.getSearchResult(queryData), 500);
  }

  getSearchResult(queryData) {
    var _this = this;
    this.setState({
      isResultShow: true,
      isResultGetted: false
    })
    
    seafileAPI.getSearchedFiles(queryData).then(res => {
      if (!res.data.total) {
        _this.setState({
          resultItems: [],
          isResultGetted: true
        })
        return;
      }

      let items = _this.formatResultItems(res.data.results);
      _this.setState({
        resultItems: items,
        isResultGetted: true
      })
    })
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
    let pathname = decodeURI(window.location.pathname);
    let prefix =  '';
    for (let i = 0; i < length; i++) {
      items[i] = {};
      items[i]['index'] = [i];
      items[i]['name'] = data[i].name;
      if (!prefix) {
        let repo_name = data[i].repo_name;
        prefix = pathname.substring(0, pathname.lastIndexOf(repo_name) + repo_name.length);
      }
      items[i]['link'] = prefix + data[i].fullpath;
      items[i]['link_content'] = decodeURI(data[i].fullpath).substring(1);
      items[i]['content'] = data[i].content_highlight;
    }
    return items;
  }

  resetToDefault() {
    this.inputValue = null;
    this.repoid = null;
    this.refs.searchInput.value = '';
    this.setState({
      width: '',
      isMaskShow: false,
      isResultShow: false,
      isResultGetted: false,
      resultItems: []
    })
  }

  renderSearchResult() {
    var _this = this;
    if (!this.state.isResultShow) {
      return;
    }
    if (!this.state.isResultGetted || this.getValueLength(this.inputValue) < 3) {
      return (
        <span className="loading-icon loading-tip"></span>
      )
    }
    if (!this.state.resultItems.length) {
      return (
        <div className="search-result-none">你检索的内容不存在</div>
      )
    }
    return (
      <ul className="search-result-list">
        {this.state.resultItems.map(item => {
          return (
            <SearchResultItem
              key={item.index}
              item={item}
              onLinkClick={_this.onLinkClick}
            />
          )
        })}
      </ul>
    )
  }

  render() {
    let width = this.state.width !== 'default' ? this.state.width : '';
    let style = {'width': width};
    return (
      <div className="search">
        <div className={`search-mask ${this.state.isMaskShow ? "" : "hide"}`} onClick={this.onCloseHandler}></div>
        <div className="search-container">
          <div className="search-input-container">
            <input 
              ref="searchInput"
              type="text" 
              className="search-input" 
              name="query"
              placeholder="Search files in this wiki"
              style={style}
              data-repoid={repoID}
              onFocus={this.onFocusHandler}
              onKeyUp={this.onKeyUpHandler}
              autoComplete="off"
            />
            <a className="search-icon icon-search"></a>
            <a className="search-icon sf2-icon-x3" onClick={this.onCloseHandler}></a>
          </div>
          <div className="search-result-container">
            {this.renderSearchResult()}
          </div>
        </div>
      </div>
    )
  }
}

export default Search;
