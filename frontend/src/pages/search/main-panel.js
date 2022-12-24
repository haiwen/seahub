import React from 'react';
import deepCopy from 'deep-copy';
import { gettext } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import SearchResults from './search-results';
import AdvancedSearch from './advanced-search';
import toaster from '../../components/toast';
import Loading from '../../components/loading';

import '../../css/search.css';

const { q, search_repo, search_ftypes } = window.search.pageOptions;

class SearchViewPanel extends React.Component {

  constructor(props) {
    super(props);
    this.stateHistory = null;
    this.state = {
      isCollapseOpen: search_repo !== 'all',
      isFileTypeCollapseOpen: false,
      isResultGot: false,
      isLoading: true,
      isAllRepoCheck: search_repo === 'all',
      isShowSearchFilter: false,
      // advanced search index
      q: q.trim(),
      search_repo: search_repo,
      search_ftypes: search_ftypes,
      fileTypeItemsStatus: [false, false, false, false, false, false, false],
      input_fexts: '',
      time_from: null,
      time_to: null,
      size_from: '',
      size_to: '',
      // search result
      hasMore: false,
      resultItems: [],
      page: 1,
      per_page: 20,
      errorMsg: '',
      errorDateMsg: '',
      errorSizeMsg: '',
    };
  }

  getSearchResults(params) {
    this.setState({
      isLoading: true,
      isResultGot: false,
    });
    const stateHistory = deepCopy(this.state);
    seafileAPI.searchFiles(params, null).then(res => {
      const { results, has_more, total } = res.data;
      this.setState({
        isLoading: false,
        isResultGot: true,
        resultItems: results,
        hasMore: has_more,
        total: total,
        page: params.page,
        isShowSearchFilter: true,
      });
      this.stateHistory = stateHistory;
      this.stateHistory.resultItems = results;
      this.stateHistory.hasMore = has_more;
      this.stateHistory.page = params.page;
    }).catch((error) => {
      this.setState({ isLoading: false });
      if (error.response) {
        toaster.danger(error.response.data.detail || error.response.data.error_msg || gettext('Error'), {duration: 3});
      } else {
        toaster.danger(gettext('Please check the network.'), {duration: 3});
      }
    });
  }

  handleSearchParams = (page) => {
    let params = { q: this.state.q.trim(), page: page };
    const ftype = this.getFileTypesList();
    if (this.state.search_repo) {params.search_repo = this.state.search_repo;}
    if (this.state.search_ftypes) {params.search_ftypes = this.state.search_ftypes;}
    if (this.state.per_page) {params.per_page = this.state.per_page;}
    if (this.state.input_fexts) {params.input_fexts = this.state.input_fexts;}
    const { time_from, time_to } = this.state;
    if (time_from) {params.time_from = parseInt(time_from.valueOf() / 1000);}
    if (time_to) {params.time_to = parseInt(time_to.valueOf() / 1000);}
    if (this.state.size_from) {params.size_from = this.state.size_from * 1000 *1000;}
    if (this.state.size_to) {params.size_to = this.state.size_to * 1000 * 1000;}
    if (ftype.length !== 0) {params.ftype = ftype;}
    return params;
  };

  handleSubmit = () => {
    if (this.compareNumber(this.state.size_from, this.state.size_to)) {
      this.setState({ errorSizeMsg: gettext('Invalid file size range.') });
      return;
    }
    if (this.getValueLength(this.state.q.trim()) < 3) {
      if (this.state.q.trim().length === 0) {
        this.setState({ errorMsg: gettext('It is required.') });
      } else {
        this.setState({ errorMsg: gettext('Required at least three letters.') });
      }
      if (this.state.isLoading) {
        this.setState({ isLoading: false });
      }
    } else {
      const params = this.handleSearchParams(1);
      this.getSearchResults(params);
    }
    if (this.state.isCollapseOpen) this.setState({ isCollapseOpen: false });
  };

  compareNumber = (num1, num2) => {
    if (!num1 || !num2) return false;
    if (parseInt(num1.replace(/\-/g, '')) >= parseInt(num2.replace(/\-/g, ''))) {
      return true;
    } else {
      return false;
    }
  }

  showSearchFilter = () => {
    this.setState({ isShowSearchFilter: true });
  }

  hideSearchFilter = () => {
    this.setState({ isShowSearchFilter: false });
  }

  handleReset = () => {
    this.setState({
      q: q.trim(),
      search_repo: search_repo,
      search_ftypes: search_ftypes,
      fileTypeItemsStatus: [false, false, false, false, false, false, false],
      input_fexts: '',
      time_from: null,
      time_to: null,
      size_from: '',
      size_to: '',
      errorMsg: '',
      errorDateMsg: '',
      errorSizeMsg: '',
    });
  }

  handlePrevious = (e) => {
    e.preventDefault();
    if (this.stateHistory && this.state.page > 1) {
      this.setState(this.stateHistory,() => {
        const params = this.handleSearchParams(this.state.page - 1);
        this.getSearchResults(params);
      });
    } else {
      toaster.danger(gettext('Error'), {duration: 3});
    }
  };

  handleNext = (e) => {
    e.preventDefault();
    if (this.stateHistory && this.state.hasMore) {
      this.setState(this.stateHistory,() => {
        const params = this.handleSearchParams(this.state.page + 1);
        this.getSearchResults(params);
      });
    } else {
      toaster.danger(gettext('Error'), {duration: 3});
    }
  };

  getValueLength(str) {
    let code, len = 0;
    for (let i = 0, length = str.length; i < length; i++) {
      code = str.charCodeAt(i);
      if (code === 10) { //solve enter problem
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

  toggleCollapse = () => {
    this.setState({isCollapseOpen: !this.state.isCollapseOpen});
    this.hideSearchFilter();
  };

  openFileTypeCollapse = () => {
    this.setState({
      isFileTypeCollapseOpen: true,
      search_ftypes: 'custom',
    });
  };

  closeFileTypeCollapse = () => {
    this.setState({
      isFileTypeCollapseOpen: false,
      fileTypeItemsStatus: Array(7).fill(false),
      search_ftypes: 'all',
      input_fexts: '',
    });
  };

  handleSearchInput = (event) => {
    this.setState({ q: event.target.value });
    if (this.state.errorMsg) this.setState({ errorMsg: ''});
    if (this.state.errorSizeMsg) this.setState({ errorSizeMsg: '' });
    if (this.state.errorDateMsg) this.setState({ errorDateMsg: '' });
  };

  handleKeyDown = (e) => {
    if (e.keyCode === 13) {
      e.preventDefault();
      this.handleSubmit();
    }
  };

  handlerRepo = (isAll) => {
    if (isAll) {
      this.setState({
        isAllRepoCheck: true,
        search_repo: 'all',
      });
    } else {
      this.setState({
        isAllRepoCheck: false,
        search_repo: search_repo !== 'all' ? search_repo : '',
      });
    }
  };

  handlerFileTypes = (i) => {
    let newFileTypeItemsStatus = this.state.fileTypeItemsStatus;
    newFileTypeItemsStatus[i] = !this.state.fileTypeItemsStatus[i];
    this.setState({ fileTypeItemsStatus: newFileTypeItemsStatus });
  };

  getFileTypesList = () => {
    const fileTypeItems = ['Text', 'Document', 'Image', 'Video', 'Audio', 'PDF', 'Markdown'];
    let ftype = [];
    for (let i = 0, len = this.state.fileTypeItemsStatus.length; i < len; i++){
      if (this.state.fileTypeItemsStatus[i]) {
        ftype.push(fileTypeItems[i]);
      }
    }
    return ftype;
  };

  handlerFileTypesInput = (event) => {
    this.setState({ input_fexts: event.target.value.trim() });
  };

  handleTimeFromInput = (value) => {
    // set the time to be '00:00:00'
    this.setState({time_from: value ? value.hours(0).minutes(0).seconds(0) : value});
    if (this.state.errorDateMsg) this.setState({ errorDateMsg: '' });
  };

  handleTimeToInput = (value) => {
    // set the time to be '23:59:59'
    this.setState({time_to: value ? value.hours(23).minutes(59).seconds(59) : value});
    if (this.state.errorDateMsg) this.setState({ errorDateMsg: '' });
  };

  handleSizeFromInput = (event) => {
    this.setState({ size_from: event.target.value >= 0 ? event.target.value : 0 });
    if (this.state.errorSizeMsg) this.setState({ errorSizeMsg: '' });
  };

  handleSizeToInput = (event) => {
    this.setState({ size_to: event.target.value >= 0 ? event.target.value : 0 });
    if (this.state.errorSizeMsg) this.setState({ errorSizeMsg: '' });
  };

  componentDidMount() {
    if (this.state.q) {
      this.handleSubmit();
    } else {
      this.setState({ isLoading: false });
    }
  }

  render() {
    let { isCollapseOpen } = this.state;
    return (
      <div className="search-page">
        <div className="search-page-container">
          <div className="input-icon align-items-center d-flex">
            <input
              type="text"
              className="form-control search-input"
              name="query"
              autoComplete="off"
              value={this.state.q}
              placeholder={gettext('Search Files')}
              onChange={this.handleSearchInput}
              onKeyDown={this.handleKeyDown}
            />
            <i className="search-icon-right input-icon-addon fas fa-search" onClick={this.handleSubmit}></i>
            <i className={`fas action-icon fa-angle-double-${isCollapseOpen ? 'up' : 'down'}`} onClick={this.toggleCollapse}></i>
          </div>
          {this.state.errorMsg && <div className="error">{this.state.errorMsg}</div>}
          <AdvancedSearch
            openFileTypeCollapse={this.openFileTypeCollapse}
            closeFileTypeCollapse={this.closeFileTypeCollapse}
            handlerFileTypes={this.handlerFileTypes}
            handlerFileTypesInput={this.handlerFileTypesInput}
            handleSubmit={this.handleSubmit}
            handleReset={this.handleReset}
            handlerRepo={this.handlerRepo}
            handleKeyDown={this.handleKeyDown}
            handleTimeFromInput={this.handleTimeFromInput}
            handleTimeToInput={this.handleTimeToInput}
            handleSizeFromInput={this.handleSizeFromInput}
            handleSizeToInput={this.handleSizeToInput}
            stateAndValues={this.state}
          />
        </div>
        {this.state.isLoading && <Loading/>}
        {(!this.state.isLoading && this.state.isResultGot) &&
        <SearchResults
          resultItems={this.state.resultItems}
          total={this.state.total}
        />
        }
        {(!this.state.isLoading && this.state.isResultGot) &&
          <div className="paginator">
            {this.state.page !== 1 && <a href="#" onClick={this.handlePrevious}>{gettext('Previous')}</a>}
            {(this.state.page !== 1 && this.state.hasMore) && <span> | </span>}
            {this.state.hasMore && <a href="#" onClick={this.handleNext}>{gettext('Next')}</a>}
          </div>
        }
      </div>
    );
  }
}

export default SearchViewPanel;
