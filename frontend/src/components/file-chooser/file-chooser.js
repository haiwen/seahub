import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isPro, enableSeasearch, enableElasticsearch } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import RepoInfo from '../../models/repo-info';
import RepoListView from './repo-list-view';
import RecentlyUsedListView from './recently-used-list-view';
import Loading from '../loading';
import SearchedListView from './searched-list-view';

import '../../css/file-chooser.css';

const propTypes = {
  isShowFile: PropTypes.bool,
  hideLibraryName: PropTypes.bool,
  repoID: PropTypes.string,
  onDirentItemClick: PropTypes.func,
  onRepoItemClick: PropTypes.func,
  mode: PropTypes.oneOf([
    'current_repo_and_other_repos',
    'only_all_repos',
    'only_current_library',
    'only_other_libraries',
    'recently_used'
  ]).isRequired,
  fileSuffixes: PropTypes.arrayOf(PropTypes.string),
  currentPath: PropTypes.string,
};

const defaultProps = {
  isShowFile: false,
  hideLibraryName: false,
  repoID: '',
  onDirentItemClick: () => {},
  onRepoItemClick: () => {},
  fileSuffixes: [],
  currentPath: '',
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
      isBrowsing: false,
      browsingPath: '',
    };
    this.inputValue = '';
    this.timer = null;
    this.source = null;
  }

  async componentDidMount() {
    const { repoID } = this.props;

    const fetchRepoInfo = async (repoID) => {
      try {
        const res = await seafileAPI.getRepoInfo(repoID);
        const repoInfo = new RepoInfo(res.data);
        this.setState({
          currentRepoInfo: repoInfo,
          selectedRepo: repoInfo,
        });
      } catch (error) {
        const errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      }
    };

    const fetchRepoList = async () => {
      try {
        const res = await seafileAPI.listRepos();
        const repos = res.data.repos;
        const repoList = [];
        const repoIdList = [];

        repos.forEach(repo => {
          if (repo.permission !== 'rw' || repoIdList.includes(repo.repo_id)) {
            return;
          }
          repoList.push(repo);
          repoIdList.push(repo.repo_id);
        });

        const sortedRepoList = Utils.sortRepos(repoList, 'name', 'asc');
        this.setState({ repoList: sortedRepoList });
      } catch (error) {
        const errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      }
    };

    if (repoID) {
      await fetchRepoInfo(repoID);
    } else {
      await fetchRepoList();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.mode !== this.props.mode) {
      this.setState({
        isSearching: false,
        isResultGot: false,
        isBrowsing: false,
        browsingPath: '',
        searchInfo: '',
        searchResults: [],
      });
      if (this.props.mode === 'only_other_libraries') {
        this.onOtherRepoToggle();
      }
    }
  }

  onOtherRepoToggle = async () => {
    if (!this.state.hasRequest) {
      try {
        const res = await seafileAPI.listRepos();
        const repos = res.data.repos;
        const repoList = [];
        const repoIdList = [];

        repos.forEach(repo => {
          if (repo.permission !== 'rw') return;
          if (this.props.repoID && repo.repo_name === this.state.currentRepoInfo.repo_name) return;
          if (repoIdList.includes(repo.repo_id)) return;

          repoList.push(repo);
          repoIdList.push(repo.repo_id);
        });

        const sortedRepoList = Utils.sortRepos(repoList, 'name', 'asc');
        this.setState({
          repoList: sortedRepoList,
          isOtherRepoShow: !this.state.isOtherRepoShow,
          selectedItemInfo: {},
        });
      } catch (error) {
        const errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      }
    } else {
      this.setState({ isOtherRepoShow: !this.state.isOtherRepoShow });
    }
  };

  onCurrentRepoToggle = () => {
    this.setState({ isCurrentRepoShow: !this.state.isCurrentRepoShow });
  };

  onDirentItemClick = (repo, filePath, dirent) => {
    this.props.onDirentItemClick(repo, filePath, dirent);
    this.setState({
      selectedRepo: repo,
      selectedPath: filePath
    });
  };

  onRepoItemClick = (repo) => {
    if (this.props.onRepoItemClick) {
      this.props.onRepoItemClick(repo);
    }
    this.setState({
      selectedRepo: repo,
      selectedPath: '/',
    });
  };

  onCloseSearching = () => {
    this.setState({
      isSearching: false,
      isResultGot: false,
      isBrowsing: false,
      browsingPath: '',
      searchInfo: '',
      searchResults: [],
      selectedPath: this.props.currentPath,
      selectedItemInfo: {},
    });
    this.inputValue = '';
    this.timer = null;
    this.source = null;
  };

  onSearchInfoChanged = (event) => {
    let searchInfo = event.target.value.trim();
    if (!this.state.searchResults.length && searchInfo.length > 0) {
      this.setState({
        isSearching: true,
        isResultGot: false,
      });
    }
    this.setState({ searchInfo: searchInfo });
    if (this.inputValue === searchInfo) {
      return false;
    }
    this.inputValue = searchInfo;

    if (this.inputValue === '') {
      this.setState({
        isResultGot: false,
      });
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
  };

  getSearchResult = (queryData) => {
    if (this.source) {
      this.cancelRequest();
    }

    this.setState({ isResultGot: false });

    this.source = seafileAPI.getSource();
    this.sendRequest(queryData, this.source.token);
  };

  sendRequest = (queryData, cancelToken) => {
    const filterCurrentRepo = (results) => {
      if (this.props.mode === 'only_other_libraries') {
        return results.filter(item => item.repo_id !== this.state.currentRepoInfo.repo_id);
      }
      return results;
    };

    if (isPro && enableSeasearch && !enableElasticsearch) {
      seafileAPI.aiSearchFiles(queryData, cancelToken).then(res => {
        const filteredResults = filterCurrentRepo(res.data.results.filter(item => item.is_dir));
        this.setState({
          searchResults: filteredResults.length > 0 ? this.formatResultItems(filteredResults) : [],
          isResultGot: true
        });
        this.source = null;
      });
    } else {
      seafileAPI.searchFiles(queryData, cancelToken).then(res => {
        const filteredResults = filterCurrentRepo(res.data.results);
        console.log('filteredResults:', filteredResults);
        this.setState({
          searchResults: res.data.total ? this.formatResultItems(filteredResults) : [],
          isResultGot: true
        });
        this.source = null;
      });
    }
  };

  cancelRequest = () => {
    this.source.cancel('prev request is cancelled');
  };

  getValueLength = (str) => {
    var i = 0; var code; var len = 0;
    for (; i < str.length; i++) {
      code = str.charCodeAt(i);
      if (code == 10) { // solve enter problem
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
  };

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
  };

  onSearchedItemClick = (item) => {
    item['type'] = item.is_dir ? 'dir' : 'file';
    let repo = new RepoInfo(item);
    this.props.onDirentItemClick(repo, item.path, item);
  };

  renderSearchedView = () => {
    if (!this.state.isResultGot) {
      return (<Loading />);
    }

    if (this.state.isResultGot && this.state.searchResults.length === 0) {
      return (<div className="search-result-none text-center">{gettext('No results matching')}</div>);
    }

    if (this.state.isResultGot && this.state.searchResults.length > 0) {
      return (
        <SearchedListView
          searchResults={this.state.searchResults}
          onItemClick={this.onSearchedItemClick}
          onSearchedItemDoubleClick={this.onSearchedItemDoubleClick}
        />
      );
    }
  };

  onSearchedItemDoubleClick = async (item) => {
    if (item.type !== 'dir') {
      return;
    }

    const { repoID } = this.props;
    const { hasRequest, currentRepoInfo } = this.state;

    const selectedItemInfo = {
      repoID: item.repo_id,
      filePath: item.path,
    };

    this.setState({ selectedItemInfo });

    const updateStateForRepo = (repoInfo, path) => {
      this.setState({
        selectedRepo: repoInfo,
        selectedPath: path,
        isCurrentRepoShow: true,
      });
    };

    const handleError = (error) => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    };

    const fetchRepoInfo = async () => {
      try {
        const res = await seafileAPI.getRepoInfo(repoID);
        const repoInfo = new RepoInfo(res.data);
        const path = item.path.substring(0, item.path.length - 1);
        updateStateForRepo(repoInfo, path);
      } catch (error) {
        handleError(error);
      }
    };

    const fetchRepoList = async () => {
      try {
        const res = await seafileAPI.listRepos();
        const repos = res.data.repos;
        const repoList = [];
        const repoIdList = [];

        repos.forEach(repo => {
          if (repo.permission !== 'rw') return;
          if (repoID && repo.repo_name === currentRepoInfo.repo_name) return;
          if (repoIdList.includes(repo.repo_id)) return;

          repoList.push(repo);
          repoIdList.push(repo.repo_id);
        });

        const sortedRepoList = Utils.sortRepos(repoList, 'name', 'asc');
        const selectedRepo = sortedRepoList.find(repo => repo.repo_id === item.repo_id);
        const path = item.path.substring(0, item.path.length - 1);

        this.setState({
          repoList: sortedRepoList,
          isOtherRepoShow: true,
          selectedPath: path,
          selectedRepo,
        });
      } catch (error) {
        handleError(error);
      }
    };

    if (repoID && item.repo_id === repoID) {
      await fetchRepoInfo();
    } else {
      if (!hasRequest) {
        await fetchRepoList();
      } else {
        this.setState(prevState => ({ isOtherRepoShow: !prevState.isOtherRepoShow }));
      }
    }

    this.setState({
      isSearching: false,
      isResultGot: false,
      searchResults: [],
      isBrowsing: true,
      browsingPath: item.path.substring(0, item.path.length - 1),
    });
    this.inputValue = '';
    this.timer = null;
    this.source = null;
  };
  onScroll = (event) => {
    event.stopPropagation();
  };

  renderRepoListView = () => {
    const { mode, currentPath, isShowFile, fileSuffixes } = this.props;
    const { isCurrentRepoShow, isOtherRepoShow, currentRepoInfo, repoList, selectedRepo, selectedPath, selectedItemInfo } = this.state;
    const recentlyUsedList = JSON.parse(localStorage.getItem('recently-used-list')) || [];

    return (
      <div className='scroll-wrapper' onScroll={this.onScroll}>
        <div className="file-chooser-container user-select-none" >
          {mode === 'current_repo_and_other_repos' && (
            <Fragment>
              <div className="list-view">
                <div className="list-view-header">
                  <span className={`item-toggle sf3-font ${isCurrentRepoShow ? 'sf3-font-down' : 'sf3-font-down rotate-270 d-inline-block'}`} onClick={this.onCurrentRepoToggle}></span>
                  <span className="library">{gettext('Current Library')}</span>
                </div>
                {
                  isCurrentRepoShow && currentRepoInfo &&
                  <RepoListView
                    initToShowChildren={true}
                    currentRepoInfo={currentRepoInfo}
                    currentPath={currentPath}
                    selectedRepo={selectedRepo}
                    selectedPath={selectedPath}
                    onRepoItemClick={this.onRepoItemClick}
                    onDirentItemClick={this.onDirentItemClick}
                    isShowFile={isShowFile}
                    fileSuffixes={fileSuffixes}
                    selectedItemInfo={selectedItemInfo}
                  />
                }
              </div>
              <div className="list-view">
                <div className="list-view-header">
                  <span className={`item-toggle sf3-font ${isOtherRepoShow ? 'sf3-font-down' : 'sf3-font-down rotate-270 d-inline-block'}`} onClick={this.onOtherRepoToggle}></span>
                  <span className="library">{gettext('Other Libraries')}</span>
                </div>
                {
                  isOtherRepoShow &&
                  <RepoListView
                    initToShowChildren={false}
                    repoList={repoList}
                    selectedRepo={selectedRepo}
                    selectedPath={selectedPath}
                    onRepoItemClick={this.onRepoItemClick}
                    onDirentItemClick={this.onDirentItemClick}
                    isShowFile={isShowFile}
                    fileSuffixes={fileSuffixes}
                    selectedItemInfo={selectedItemInfo}
                  />
                }
              </div>
            </Fragment>
          )}
          {mode === 'only_current_library' && (
            <div className="list-view">
              <RepoListView
                initToShowChildren={true}
                currentRepoInfo={currentRepoInfo}
                currentPath={currentPath}
                selectedRepo={selectedRepo}
                selectedPath={selectedPath}
                onRepoItemClick={this.onRepoItemClick}
                onDirentItemClick={this.onDirentItemClick}
                isShowFile={isShowFile}
                fileSuffixes={fileSuffixes}
                selectedItemInfo={selectedItemInfo}
                isBrowsing={this.state.isBrowsing}
                browsingPath={this.state.browsingPath}
              />
            </div>
          )}
          {mode === 'only_all_repos' && (
            <div className="file-chooser-container">
              <div className="list-view">
                <div className="list-view-header">
                  <span className="item-toggle sf3-font sf3-font-down"></span>
                  <span className="library">{gettext('Libraries')}</span>
                </div>
                <RepoListView
                  initToShowChildren={false}
                  repoList={repoList}
                  selectedRepo={selectedRepo}
                  selectedPath={selectedPath}
                  onRepoItemClick={this.onRepoItemClick}
                  onDirentItemClick={this.onDirentItemClick}
                  isShowFile={isShowFile}
                  fileSuffixes={fileSuffixes}
                  selectedItemInfo={selectedItemInfo}
                />
              </div>
            </div>
          )}
          {mode === 'only_other_libraries' && (
            <div className="list-view">
              <RepoListView
                initToShowChildren={false}
                repoList={repoList}
                selectedRepo={selectedRepo}
                selectedPath={selectedPath}
                onRepoItemClick={this.onRepoItemClick}
                onDirentItemClick={this.onDirentItemClick}
                isShowFile={isShowFile}
                fileSuffixes={fileSuffixes}
                selectedItemInfo={selectedItemInfo}
                isBrowsing={this.state.isBrowsing}
                browsingPath={this.state.browsingPath}
              />
            </div>
          )}
          {mode === 'recently_used' && (
            <div className="list-view">
              <RecentlyUsedListView
                recentlyUsedList={recentlyUsedList}
                onDirentItemClick={this.onDirentItemClick}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  render() {
    const { repoID, mode } = this.props;
    const { selectedRepo, searchInfo, isSearching } = this.state;

    if (!selectedRepo && repoID) {
      return '';
    }

    return (
      <Fragment>
        {isPro && mode !== 'recently_used' && (
          <div className="file-chooser-search-input">
            <Input className="search-input" placeholder={gettext('Search')} type='text' value={searchInfo} onChange={this.onSearchInfoChanged}></Input>
            {searchInfo.length !== 0 && (
              <span className="search-control attr-action-icon sf3-font sf3-font-x-01" onClick={this.onCloseSearching}></span>
            )}
          </div>
        )}
        {isSearching ? (
          <div className="file-chooser-search-container">
            {this.renderSearchedView()}
          </div>
        ) : (
          this.renderRepoListView()
        )}
      </Fragment>
    );
  }
}

FileChooser.propTypes = propTypes;
FileChooser.defaultProps = defaultProps;

export default FileChooser;
