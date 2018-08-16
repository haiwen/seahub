import React, { Component } from 'react';
import { repoID } from './constance';
import SearchResultItem from './SearchResultItem';

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
    };
    this.inputValue = '';
    this.source = null; // used to cancle request;
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

  onItemClickHandler = (path) => {
    this.resetToDefault();
    this.props.onSearchedClick(path);
  }

  onChangeHandler = (event) => {
    let _this = this;
    this.setState({value: event.target.value});
    let newValue = event.target.value;
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
      search_repo: repoID,
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
    
    if(this.source){
      this.cancelRequest();
    }
    this.setState({
      isResultShow: true,
      isResultGetted: false
    })

    this.source = this.props.seafileAPI.getSource();
    this.sendRequest(queryData, this.source.token);
  }

  sendRequest(queryData, cancelToken) {
    var _this = this;
    this.props.seafileAPI.searchFiles(queryData,cancelToken).then(res => {
      if (!res.data.total) {
        _this.setState({
          resultItems: [],
          isResultGetted: true
        })
        _this.source = null;
        return;
      }

      let items = _this.formatResultItems(res.data.results);
      _this.setState({
        resultItems: items,
        isResultGetted: true
      })
      _this.source = null;
    }).catch(res => {
      console.log(res);
    })
  }

  cancelRequest() {
    this.source.cancel("prev request is cancled");
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
      items[i]['link'] = data[i].fullpath;
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
        <div className="search-result-none">No results matching.</div>
      )
    }
    return (
      <ul className="search-result-list">
        {this.state.resultItems.map(item => {
          return (
            <SearchResultItem
              key={item.index}
              item={item}
              onItemClickHandler={_this.onItemClickHandler}
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
              type="text" 
              className="search-input" 
              name="query"
              placeholder="Search files in this wiki"
              style={style}
              value={this.state.value}
              onFocus={this.onFocusHandler}
              onChange={this.onChangeHandler}
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
