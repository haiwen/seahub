import React from 'react';
import {gettext} from '../../utils/constants';
import {seafileAPI} from '../../utils/seafile-api';
import SearchViewResultsList from './search-results';
import SearchScales from './search-scales';
import PropTypes from 'prop-types';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import moment from 'moment';

class SearchViewPanel extends React.Component {

  constructor(props) {
    super(props);
    this.stateHistory = null;
    this.repoName = this.props.repoName;
    this.repoID = this.props.searchRepo !== 'all' ? this.props.searchRepo : '';
    this.state = {
      isCollapseOpen: this.props.searchRepo !== 'all',
      isFileTypeCollapseOpen: false,
      fileTypeItemsStatus: Array(7).fill(false),
      isResultGot: false,
      isLoading: true,
      isAllRepoCheck: this.props.searchRepo === 'all',
      hasMore: false,
      total: 0,
      resultItems: [],
      errorMsg: '',

      q: this.props.q.trim(),
      search_repo: this.props.searchRepo,
      search_ftypes: this.props.searchFtypes,
      page: 1,
      per_page: 20,
      input_fexts: '',
      ftype: [],
      obj_type: '',
      search_path: '',
      with_permission: '',
      time_from: '',
      time_to: '',
      size_from: '',
      size_to: '',
      shared_from: '',
      not_shared_from: '',
    };
  }

  getSearchResults(params) {
    this.setState({
      isLoading: true,
      isResultGot: false,
    });
    const stateHistory = JSON.parse(JSON.stringify(this.state));
    seafileAPI.searchFiles(params, null).then(res => {
      this.setState({
        isLoading: false,
        isResultGot: true,
        resultItems: res.data.results,
        hasMore: res.data.has_more,
        total: res.data.total,
        page: params.page,
      });
      this.stateHistory = stateHistory;
      this.stateHistory.resultItems = res.data.results;
      this.stateHistory.hasMore = res.data.has_more;
      this.stateHistory.total = res.data.total;
      this.stateHistory.page = params.page;
    }).catch((error) => {
      this.setState({
        isLoading: false,
      });
      if (error.response){
        toaster.danger(error.response.data.detail || error.response.data.error_msg || gettext('Error'), {duration: 3});
      } else {
        toaster.danger(gettext('Please check the network.'), {duration: 3});
      }
    });
  }

  handleSearchParams = (page) => {
    let ftype = this.getFileTypesList();
    let params = {q: this.state.q.trim(), page: page,};
    if (this.state.search_repo) {params.search_repo = this.state.search_repo;}
    if (this.state.search_ftypes) {params.search_ftypes = this.state.search_ftypes;}
    if (this.state.per_page) {params.per_page = this.state.per_page;}
    if (this.state.search_path) {params.search_path = this.state.search_path;}
    if (this.state.obj_type) {params.obj_type = this.state.obj_type;}
    if (this.state.input_fexts) {params.input_fexts = this.state.input_fexts;}
    if (this.state.with_permission) {params.with_permission = this.state.with_permission;}
    if (this.state.time_from) {params.time_from = moment(this.state.time_from).valueOf() /1000;}
    if (this.state.time_to) {params.time_to = moment(this.state.time_to).valueOf() /1000;}
    if (this.state.size_from) {params.size_from = this.state.size_from *1000 *1000;}
    if (this.state.size_to) {params.size_to = this.state.size_to *1000 *1000;}
    if (this.state.shared_from) {params.shared_from = this.state.shared_from;}
    if (this.state.not_shared_from) {params.not_shared_from = this.state.not_shared_from;}
    if (ftype.length !== 0) {params.ftype = ftype;}
    return params;
  };

  handleSubmit = () => {
    if (this.getValueLength(this.state.q.trim()) < 3) {
      if (this.state.q.trim().length === 0) {
        this.setState({errorMsg: gettext('It is required.')});
      } else {
        this.setState({errorMsg: 'Required at least three letters.'});
      }
      if (this.state.isLoading) {
        this.setState({isLoading: false});
      }
    } else {
      const params = this.handleSearchParams(1);
      this.getSearchResults(params);
    }
  };

  handlePrevious = () => {
    if (this.stateHistory && this.state.page > 1){
      this.setState(this.stateHistory,() => {
        const params = this.handleSearchParams(this.state.page -1);
        this.getSearchResults(params);
      });
    }else{
      toaster.danger(gettext('Error'), {duration: 3});
    }
  };

  handleNext = () => {
    if (this.stateHistory && this.state.hasMore){
      this.setState(this.stateHistory,() => {
        const params = this.handleSearchParams(this.state.page +1);
        this.getSearchResults(params);
      });
    } else {
      toaster.danger(gettext('Error'), {duration: 3});
    }
  };

  getValueLength(str) {
    let i = 0, code, len = 0;
    for (; i < str.length; i++) {
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
    this.setState({
      q: event.target.value,
    });
    if (this.state.errorMsg) {
      this.setState({
        errorMsg: '',
      });
    }
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
        search_repo: this.repoID,
      });
    }
  };

  handlerFileTypes = (i) => {
    let fileTypeItemsStatus = this.state.fileTypeItemsStatus;
    fileTypeItemsStatus[i] = !this.state.fileTypeItemsStatus[i];
    this.setState({
      fileTypeItemsStatus: fileTypeItemsStatus,
    });
  };

  getFileTypesList = () => {
    const fileTypeItems = ['Text', 'Document', 'Image', 'Video', 'Audio', 'PDF', 'Markdown'];
    let ftype = [];
    for (let i=0; i<this.state.fileTypeItemsStatus.length; i++){
      if (this.state.fileTypeItemsStatus[i]){
        ftype.push(fileTypeItems[i]);
      }
    }
    return ftype;
  };

  handlerFileTypesInput = (event) => {
    this.setState({
      input_fexts: event.target.value.trim(),
    });
  };

  handleTimeFromInput = (event) => {
    this.setState({
      time_from: event.target.value,
    });
  };

  handleTimeToInput = (event) => {
    this.setState({
      time_to: event.target.value,
    });
  };

  handleSizeFromInput = (event) => {
    this.setState({
      size_from: event.target.value >= 0 ? event.target.value : 0,
    });
  };

  handleSizeToInput = (event) => {
    this.setState({
      size_to: event.target.value >= 0 ? event.target.value : 0,
    });

  };

  componentDidMount() {
    if (this.state.q){
      this.handleSubmit();
    } else {
      this.setState({
        isLoading: false,
      });
    }
  }

  render() {
    return (
      <div style={{width: '65%', margin: '0 auto'}}>

        <div className="search" style={{marginTop: '30px'}}>
          <div className="search-container" style={{padding: '10px', background: '#f7f7f8'}}>
            <div className="input-icon" style={{display: 'flex', alignItems: 'center'}}>
              <input
                type="text"
                className="form-control search-input"
                name="query"
                autoComplete="off"
                value={this.state.q}
                style={{paddingLeft: '0.5rem', width: '30rem',}}
                placeholder={gettext('Search Files')}
                onChange={this.handleSearchInput}
                onKeyDown={this.handleKeyDown}
              />
              <i className="search-icon-right input-icon-addon fas fa-search" style={{left: '28rem'}}
                onClick={this.handleSubmit}>
              </i>
              <i className="sf2-icon-caret-down action-icon" onClick={this.toggleCollapse}>
              </i>
            </div>
            {this.state.errorMsg && <span className="error">{this.state.errorMsg}</span>}
            <SearchScales
              toggleCollapse={this.toggleCollapse}
              openFileTypeCollapse={this.openFileTypeCollapse}
              closeFileTypeCollapse={this.closeFileTypeCollapse}
              handlerFileTypes={this.handlerFileTypes}
              handlerFileTypesInput={this.handlerFileTypesInput}
              handleSubmit={this.handleSubmit}
              handlerRepo={this.handlerRepo}
              handleKeyDown={this.handleKeyDown}
              handleTimeFromInput={this.handleTimeFromInput}
              handleTimeToInput={this.handleTimeToInput}
              handleSizeFromInput={this.handleSizeFromInput}
              handleSizeToInput={this.handleSizeToInput}
              repoName={this.repoName}
              repoID={this.repoID}
              stateAndValues={this.state}
            />
          </div>
          {this.state.isLoading && <Loading/>}
          {(!this.state.isLoading && this.state.isResultGot && !this.state.resultItems.length) &&
          <div className="message empty-tip">
            <h2>{gettext('No result found')}</h2>
          </div>
          }
          {(!this.state.isLoading && this.state.isResultGot && this.state.resultItems.length !== 0) &&
          <SearchViewResultsList
            resultItems={this.state.resultItems}
            total={this.state.total}
          />
          }
          {(!this.state.isLoading && this.state.isResultGot) &&
          <div className="paginator" style={{textAlign:'center', marginTop:'1rem', marginBottom:'1rem'}}>
            {this.state.page !== 1 && <a href="#" onClick={() => this.handlePrevious()}>{gettext('Previous')}</a>}
            {(this.state.page !== 1 && this.state.hasMore) && <span> | </span>}
            {this.state.hasMore &&<a href="#" onClick={() => this.handleNext()}>{gettext('Next')}</a>}
          </div>}
        </div>
      </div>
    );
  }
}

const searchViewPanelPropTypes = {
  q: PropTypes.string.isRequired,
  searchRepo: PropTypes.string.isRequired,
  searchFtypes: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
};

SearchViewPanel.propTypes = searchViewPanelPropTypes;

export default SearchViewPanel;
