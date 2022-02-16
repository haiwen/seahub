import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isPro } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import RepoInfo from '../../models/repo-info';
import RepoListView from './repo-list-view';
import Loading from '../loading';
import SearchedListView from './searched-list-view';

import '../../css/file-chooser.css';

const propTypes = {
  isShowFile: PropTypes.bool,
  repoID: PropTypes.string,
  onDirentItemClick: PropTypes.func,
  onRepoItemClick: PropTypes.func,
  mode: PropTypes.oneOf(['current_repo_and_other_repos', 'only_all_repos', 'only_current_library']),
  fileSuffixes: PropTypes.array,
};

class FileChooser extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      hasRequest: false,
      isCurrentRepoShow: true,
      isOtherRepoShow: false,
      repoList: [],
      currentRepoInfo: null,
      selectedRepo: null,
      selectedPath: this.props.currentPath || '/',
      isSearching: false,
      isResultGot: false,
      searchInfo: '',
      searchResults: [],
      selectedItemInfo: {},
    };
    this.inputValue = '';
    this.timer = null;
    this.source = null;
  }

  componentDidMount() {
    if (this.props.repoID) {  // current_repo_and_other_repos, only_current_library
      let repoID = this.props.repoID;
      seafileAPI.getRepoInfo(repoID).then(res => {
        // need to optimized
        let repoInfo = new RepoInfo(res.data);
        this.setState({
          currentRepoInfo: repoInfo,
          selectedRepo: repoInfo
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else { // only_all_repos
      seafileAPI.listRepos().then(res => {
        let repos = res.data.repos;
        let repoList = [];
        let repoIdList = [];
        for(let i = 0; i < repos.length; i++) {
          if (repos[i].permission !== 'rw') {
            continue;
          }
          if (repoIdList.indexOf(repos[i].repo_id) > -1) {
            continue;
          }
          repoList.push(repos[i]);
          repoIdList.push(repos[i].repo_id);
        }
        repoList = Utils.sortRepos(repoList, 'name', 'asc');
        this.setState({repoList: repoList});
      });
    }
  }

  onOtherRepoToggle = () => {
    if (!this.state.hasRequest) {
      let that = this;
      seafileAPI.listRepos().then(res => {
        // todo optimized code
        let repos = res.data.repos;
        let repoList = [];
        let repoIdList = [];
        for(let i = 0; i < repos.length; i++) {
          if (repos[i].permission !== 'rw') {
            continue;
          }
          if (that.props.repoID && (repos[i].repo_name === that.state.currentRepoInfo.repo_name)) {
            continue;
          }
          if (repoIdList.indexOf(repos[i].repo_id) > -1) {
            continue;
          }
          repoList.push(repos[i]);
          repoIdList.push(repos[i].repo_id);
        }
        repoList = Utils.sortRepos(repoList, 'name', 'asc');
        this.setState({
          repoList: repoList,
          isOtherRepoShow: !this.state.isOtherRepoShow,
          selectedItemInfo: {}
        });
      });
    }
    else {
      this.setState({isOtherRepoShow: !this.state.isOtherRepoShow});
    }
  }

  onCurrentRepoToggle = () => {
    this.setState({isCurrentRepoShow: !this.state.isCurrentRepoShow});
  }

  onDirentItemClick = (repo, filePath, dirent) => {
    this.props.onDirentItemClick(repo, filePath, dirent);
    this.setState({
      selectedRepo: repo,
      selectedPath: filePath
    });
  }

  onRepoItemClick = (repo) => {
    if (this.props.onRepoItemClick) {
      this.props.onRepoItemClick(repo);
    }
    this.setState({
      selectedRepo: repo,
      selectedPath: '/',
    });
  }

  onCloseSearching = () => {
    this.setState({
      isSearching: false,
      isResultGot: false,
      searchInfo: '',
      searchResults: [],
    });
    this.inputValue = '';
    this.timer = null;
    this.source = null;
  }

  onSearchInfoChanged = (event) => {
    let searchInfo = event.target.value.trim();

    this.setState({searchInfo: searchInfo});

    if (this.inputValue === searchInfo) {
      return false;
    }

    this.inputValue = searchInfo;

    if (searchInfo.length === 0) {
      this.setState({
        isSearching: false,
        searchResults: [],
      });
      return false;
    }

    if (!this.state.searchResults.length && searchInfo.length > 0) {
      this.setState({
        isSearching: true,
        isResultGot: false,
      });
    }

    if (this.inputValue === '' || this.getValueLength(this.inputValue) < 3) {
      this.setState({isResultGot: false});
      return false;
    }

    let repoID = this.props.repoID;
    let isShowFile = this.props.isShowFile;
    let mode = this.props.mode;
    let searchRepo = mode === 'only_current_library' ? repoID : 'all';

    let queryData = {
      q: searchInfo,
      search_repo: searchRepo,
      search_ftypes: 'all',
      obj_type: isShowFile ? 'file' : 'dir',
    };

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(this.getSearchResult(queryData), 500);
  }

  getSearchResult = (queryData) => {
    if (this.source) {
      this.cancelRequest();
    }

    this.setState({isResultGot: false});

    this.source = seafileAPI.getSource();
    this.sendRequest(queryData, this.source.token);
  }

  sendRequest = (queryData, cancelToken) => {
    seafileAPI.searchFiles(queryData, cancelToken).then(res => {
      if (!res.data.total) {
        this.setState({
          searchResults: [],
          isResultGot: true
        });
        this.source = null;
        return;
      }

      let items = this.formatResultItems(res.data.results);
      this.setState({
        searchResults: items,
        isResultGot: true
      });
      this.source = null;
    });
  }

  cancelRequest = () => {
    this.source.cancel('prev request is cancelled');
  }

  getValueLength = (str) => {
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

  formatResultItems = (data) => {
    let items = [];
    let length = data.length > 10 ? 10 : data.length;
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

  onSearchedItemClick = (item) => {
    item['type'] = item.is_dir ? 'dir' : 'file';
    let repo = new RepoInfo(item);
    this.props.onDirentItemClick(repo, item.path, item);
  }

  renderSearchedView = () => {
    if (this.getValueLength(this.inputValue) < 3) {
      return '';
    }

    if (!this.state.isResultGot) {
      return (<Loading />);
    }

    if (this.state.isResultGot && this.state.searchResults.length === 0) {
      return (<div className="search-result-none text-center">{gettext('No results matching.')}</div>);
    }

    if (this.state.isResultGot && this.state.searchResults.length > 0) {
      return (
        <SearchedListView
          searchResults={this.state.searchResults}
          onItemClick={this.onSearchedItemClick}
          onSearchedItemDoubleClick={this.onSearchedItemDoubleClick}
        />);
    }
  }

  onSearchedItemDoubleClick = (item) => {
    if (item.type !== 'dir') {
      return;
    }

    let selectedItemInfo = {
      repoID: item.repo_id,
      filePath: item.path,
    };

    this.setState({
      selectedItemInfo: selectedItemInfo
    });

    if (this.props.repoID && item.repo_id === this.props.repoID) {
      seafileAPI.getRepoInfo(this.props.repoID).then(res => {
        // need to optimized
        let repoInfo = new RepoInfo(res.data);
        let path = item.path.substring(0, (item.path.length - 1));

        this.setState({
          selectedRepo: repoInfo,
          selectedPath: path,
          isCurrentRepoShow: true,
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      if (!this.state.hasRequest) {
        let that = this;
        seafileAPI.listRepos().then(res => {
          // todo optimized code
          let repos = res.data.repos;
          let repoList = [];
          let repoIdList = [];
          for (let i = 0; i < repos.length; i++) {
            if (repos[i].permission !== 'rw') {
              continue;
            }
            if (that.props.repoID && (repos[i].repo_name === that.state.currentRepoInfo.repo_name)) {
              continue;
            }
            if (repoIdList.indexOf(repos[i].repo_id) > -1) {
              continue;
            }
            repoList.push(repos[i]);
            repoIdList.push(repos[i].repo_id);
          }
          repoList = Utils.sortRepos(repoList, 'name', 'asc');
          let repo = repoList.filter(repoItem => repoItem.repo_id === item.repo_id);
          let path = item.path.substring(0, (item.path.length - 1));

          let selectRepo = repo[0];
          this.setState({
            repoList: repoList,
            isOtherRepoShow: true,
            selectedPath: path,
            selectedRepo: selectRepo,
          });
        });
      }
      else {
        this.setState({isOtherRepoShow: !this.state.isOtherRepoShow});
      }
    }
    this.onCloseSearching();
  }

  onScroll = (event) => {
    event.stopPropagation();
  }

  renderRepoListView = () => {

    return (
      <div className="file-chooser-container user-select-none" onScroll={this.onScroll}>
        {this.props.mode === 'current_repo_and_other_repos' && (
          <Fragment>
            <div className="list-view">
              <div className="list-view-header">
                <span className={`item-toggle fa ${this.state.isCurrentRepoShow ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onCurrentRepoToggle}></span>
                <span className="library">{gettext('Current Library')}</span>
              </div>
              {
                this.state.isCurrentRepoShow && this.state.currentRepoInfo &&
                <RepoListView
                  initToShowChildren={true}
                  currentRepoInfo={this.state.currentRepoInfo}
                  currentPath={this.props.currentPath}
                  selectedRepo={this.state.selectedRepo}
                  selectedPath={this.state.selectedPath}
                  onRepoItemClick={this.onRepoItemClick}
                  onDirentItemClick={this.onDirentItemClick}
                  isShowFile={this.props.isShowFile}
                  fileSuffixes={this.props.fileSuffixes}
                  selectedItemInfo={this.state.selectedItemInfo}
                />
              }
            </div>
            <div className="list-view">
              <div className="list-view-header">
                <span className={`item-toggle fa ${this.state.isOtherRepoShow ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onOtherRepoToggle}></span>
                <span className="library">{gettext('Other Libraries')}</span>
              </div>
              {
                this.state.isOtherRepoShow &&
                <RepoListView
                  initToShowChildren={false}
                  repoList={this.state.repoList}
                  selectedRepo={this.state.selectedRepo}
                  selectedPath={this.state.selectedPath}
                  onRepoItemClick={this.onRepoItemClick}
                  onDirentItemClick={this.onDirentItemClick}
                  isShowFile={this.props.isShowFile}
                  fileSuffixes={this.props.fileSuffixes}
                  selectedItemInfo={this.state.selectedItemInfo}
                />
              }
            </div>
          </Fragment>
        )}
        {this.props.mode === 'only_current_library' && (
          <div className="list-view">
            <div className="list-view-header">
              <span className={`item-toggle fa ${this.state.isCurrentRepoShow ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onCurrentRepoToggle}></span>
              <span className="library">{gettext('Current Library')}</span>
            </div>
            {
              this.state.isCurrentRepoShow && this.state.currentRepoInfo &&
              <RepoListView
                initToShowChildren={true}
                currentRepoInfo={this.state.currentRepoInfo}
                currentPath={this.props.currentPath}
                selectedRepo={this.state.selectedRepo}
                selectedPath={this.state.selectedPath}
                onRepoItemClick={this.onRepoItemClick}
                onDirentItemClick={this.onDirentItemClick}
                isShowFile={this.props.isShowFile}
                fileSuffixes={this.props.fileSuffixes}
                selectedItemInfo={this.state.selectedItemInfo}
              />
            }
          </div>
        )}
        {this.props.mode === 'only_all_repos' && (
          <div className="file-chooser-container">
            <div className="list-view">
              <div className="list-view-header">
                <span className="item-toggle fa fa-caret-down"></span>
                <span className="library">{gettext('Libraries')}</span>
              </div>
              <RepoListView
                initToShowChildren={false}
                repoList={this.state.repoList}
                selectedRepo={this.state.selectedRepo}
                selectedPath={this.state.selectedPath}
                onRepoItemClick={this.onRepoItemClick}
                onDirentItemClick={this.onDirentItemClick}
                isShowFile={this.props.isShowFile}
                fileSuffixes={this.props.fileSuffixes}
                selectedItemInfo={this.state.selectedItemInfo}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  render() {
    if (!this.state.selectedRepo && this.props.repoID) {
      return '';
    }

    return (
      <Fragment>
        {isPro && (
          <div className="file-chooser-search-input">
            <Input className="search-input mb-2" placeholder={gettext('Search...')} type='text' value={this.state.searchInfo} onChange={this.onSearchInfoChanged}></Input>
            {this.state.searchInfo.length !== 0 && (
              <span className="search-control attr-action-icon fas fa-times" onClick={this.onCloseSearching}></span>
            )}
          </div>
        )}
        {this.state.isSearching && (
          <div className="file-chooser-search-container">
            {this.renderSearchedView()}
          </div>
        )}
        {!this.state.isSearching && this.renderRepoListView()}
      </Fragment>
    );
  }
}

FileChooser.propTypes = propTypes;

export default FileChooser;
