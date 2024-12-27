import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader } from 'reactstrap';
import Searcher from '../file-chooser/searcher';
import SelectDirentBody from './select-dirent-body';
import { MODE_TYPE_MAP } from '../../constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isPro } from '../../utils/constants';
import { RepoInfo } from '../../models';
import toaster from '../toast';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  selectedDirentList: PropTypes.array,
  isMultipleOperation: PropTypes.bool.isRequired,
  onItemCopy: PropTypes.func,
  onItemsCopy: PropTypes.func,
  onCancelCopy: PropTypes.func.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  onAddFolder: PropTypes.func,
};

class CopyDirent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      mode: MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY,
      currentRepo: { repo_id: this.props.repoID },
      selectedRepo: { repo_id: this.props.repoID },
      repoList: [],
      selectedPath: this.props.path,
      selectedSearchedRepo: null,
      selectedSearchedItem: { repoID: '', filePath: '' },
      searchStatus: '',
      searchResults: [],
      showSearchBar: false,
      errMessage: '',
      initToShowChildren: false,
    };
    this.lastMode = MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY;
  }

  componentDidMount() {
    this.initialize();
  }

  initialize = async () => {
    try {
      const res = await seafileAPI.getRepoInfo(this.props.repoID);
      const repo = new RepoInfo(res.data);
      this.setState({ currentRepo: repo });
      await this.fetchRepoList();
    } catch (error) {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    }
  };

  fetchRepoList = async () => {
    try {
      const res = await seafileAPI.listRepos();
      const repos = res.data.repos;
      const repoList = [];
      const uniqueRepoIds = new Set();
      for (const repo of repos) {
        if (repo.permission === 'rw' && repo.repo_id !== this.props.repoID && !uniqueRepoIds.has(repo.repo_id)) {
          uniqueRepoIds.add(repo.repo_id);
          repoList.push(repo);
        }
      }
      const sortedRepoList = Utils.sortRepos(repoList, 'name', 'asc');
      const selectedRepo = sortedRepoList.find((repo) => repo.repo_id === this.props.repoID);
      this.setState({
        repoList: sortedRepoList,
        repo: selectedRepo,
      });
    } catch (error) {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    }
  };

  handleSubmit = () => {
    if (this.props.isMultipleOperation) {
      this.copyItems();
    } else {
      this.copyItem();
    }
  };

  copyItems = () => {
    let { selectedRepo, selectedPath } = this.state;
    let message = gettext('Invalid destination path');

    if (!selectedRepo || selectedPath === '') {
      this.setState({ errMessage: message });
      return;
    }

    let selectedDirentList = this.props.selectedDirentList;
    let direntPaths = [];
    selectedDirentList.forEach(dirent => {
      let path = Utils.joinPath(this.props.path, dirent.name);
      direntPaths.push(path);
    });

    // copy dirents to one of them. eg: A/B, A/C -> A/B
    if (direntPaths.some(direntPath => { return direntPath === selectedPath;})) {
      this.setState({ errMessage: message });
      return;
    }

    // copy dirents to one of their child. eg: A/B, A/D -> A/B/C
    let copyDirentPath = '';
    let isChildPath = direntPaths.some(direntPath => {
      let flag = selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1;
      if (flag) {
        copyDirentPath = direntPath;
      }
      return flag;
    });

    if (isChildPath) {
      message = gettext('Can not move folder %(src)s to its subfolder %(des)s');
      message = message.replace('%(src)s', copyDirentPath);
      message = message.replace('%(des)s', selectedPath);
      this.setState({ errMessage: message });
      return;
    }

    this.props.onItemsCopy(selectedRepo, selectedPath, true);
    this.toggle();
  };

  copyItem = () => {
    let { repoID, selectedRepo, selectedPath } = this.state;
    let direntPath = Utils.joinPath(this.props.path, this.props.dirent.name);
    let message = gettext('Invalid destination path');

    if (!selectedRepo || (selectedRepo.repo_id === repoID && selectedPath === '')) {
      this.setState({ errMessage: message });
      return;
    }

    // copy the dirent to itself. eg: A/B -> A/B
    if (selectedPath && direntPath === selectedPath) {
      this.setState({ errMessage: message });
      return;
    }

    // copy the dirent to it's child. eg: A/B -> A/B/C
    if (selectedPath && selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1) {
      message = gettext('Can not copy folder %(src)s to its subfolder %(des)s');
      message = message.replace('%(src)s', direntPath);
      message = message.replace('%(des)s', selectedPath);
      this.setState({ errMessage: message });
      return;
    }

    this.props.onItemCopy(selectedRepo, this.props.dirent, selectedPath, this.props.path, true);
    this.toggle();
  };

  toggle = () => {
    this.props.onCancelCopy();
  };

  selectRepo = (repo) => {
    this.setState({ selectedRepo: repo });
  };

  selectSearchedRepo = (repo) => {
    this.setState({ selectedSearchedRepo: repo });
  };

  setSelectedPath = (selectedPath) => {
    this.setState({ selectedPath });
  };

  setErrMessage = (message) => {
    this.setState({ errMessage: message });
  };

  updateMode = (mode) => {
    if (mode === this.state.mode) return;

    if (mode !== MODE_TYPE_MAP.SEARCH_RESULTS) {
      this.lastMode = mode;
    }

    const isShowChildren = mode === MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY || mode === MODE_TYPE_MAP.SEARCH_RESULTS;
    this.setState({
      mode,
      initToShowChildren: isShowChildren,
    });

    if (this.state.mode === MODE_TYPE_MAP.SEARCH_RESULTS) {
      this.setState({
        selectedSearchedRepo: null,
        searchResults: [],
        showSearchBar: false,
      });
    }

    if (this.state.selectedSearchedRepo && mode !== MODE_TYPE_MAP.SEARCH_RESULTS) {
      this.setState({
        selectedSearchedRepo: null,
        searchResults: [],
        showSearchBar: false,
      });
    }

    this.setState({ selectedSearchedItem: { repoID: '', filePath: '' } });
  };

  onUpdateSearchStatus = (status) => {
    this.setState({ searchStatus: status });
  };

  onUpdateSearchResults = (results) => {
    if (results.length > 0) {
      const firstResult = results[0];
      this.setState({
        selectedRepo: new RepoInfo(firstResult),
        selectedPath: firstResult.path
      });
    }
    this.setState({ searchResults: results });
  };

  onOpenSearchBar = () => {
    this.setState({ showSearchBar: true });
  };

  onCloseSearchBar = () => {
    const mode = this.lastMode;
    this.setState({
      mode,
      searchStatus: '',
      searchResults: [],
      selectedSearchedRepo: null,
      showSearchBar: false,
      selectedPath: this.props.path,
      initToShowChildren: mode === MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY,
    });
  };

  onSearchedItemClick = (item) => {
    item['type'] = item.is_dir ? 'dir' : 'file';
    let repo = new RepoInfo(item);
    this.onDirentItemClick(repo, item.path, item);
  };

  onSearchedItemDoubleClick = (item) => {
    if (item.type !== 'dir') return;

    seafileAPI.getRepoInfo(item.repo_id).then(res => {
      const repoInfo = new RepoInfo(res.data);
      const path = item.path.substring(0, item.path.length - 1);
      const mode = item.repo_id === this.props.repoID ? MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY : MODE_TYPE_MAP.ONLY_OTHER_LIBRARIES;
      this.lastMode = mode;
      this.setState({
        mode,
        selectedRepo: repoInfo,
        selectedSearchedRepo: repoInfo,
        selectedPath: path,
        selectedSearchedItem: { repoID: item.repo_id, filePath: path },
        showSearchBar: mode === MODE_TYPE_MAP.ONLY_OTHER_LIBRARIES,
        initToShowChildren: true,
      });
    }).catch(err => {
      const errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  };

  selectSearchedItem = (item) => {
    this.setState({ selectedSearchedItem: item });
  };

  onDirentItemClick = (repo, selectedPath) => {
    this.setState({
      selectedRepo: repo,
      selectedPath: selectedPath,
      errMessage: ''
    });
  };

  onRepoItemClick = (repo) => {
    this.setState({
      repo: repo,
      selectedPath: '/',
      errMessage: ''
    });
  };

  renderTitle = () => {
    const { dirent, isMultipleOperation } = this.props;
    let title = gettext('Copy {placeholder} to');

    if (isMultipleOperation) {
      return gettext('Copy selected item(s) to:');
    } else {
      return title.replace('{placeholder}', `<span class="op-target text-truncate mx-1">${Utils.HTMLescape(dirent.name)}</span>`);
    }
  };

  render() {
    const { dirent, selectedDirentList, isMultipleOperation, path } = this.props;
    const { mode, currentRepo, selectedRepo, selectedPath, showSearchBar, searchStatus, searchResults, selectedSearchedRepo } = this.state;

    const copiedDirent = dirent || selectedDirentList[0];
    const { permission } = copiedDirent;
    const { isCustomPermission } = Utils.getUserPermission(permission);

    return (
      <Modal className="custom-modal" isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}
          close={
            <div className="header-buttons">
              <button type="button" className="close seahub-modal-btn" data-dismiss="modal" aria-label={gettext('Close')} onClick={this.toggle}>
                <span className="seahub-modal-btn-inner">
                  <i className="sf3-font sf3-font-x-01" aria-hidden="true"></i>
                </span>
              </button>
              {(isPro && !showSearchBar) &&
                <button type="button" className="close seahub-modal-btn" data-dismiss="modal" aria-label={gettext('Search')} onClick={this.onOpenSearchBar}>
                  <span className="seahub-modal-btn-inner">
                    <i className="sf3-font sf3-font-search" aria-hidden="true"></i>
                  </span>
                </button>
              }
            </div>
          }
        >
          {isMultipleOperation ? this.renderTitle() : <div dangerouslySetInnerHTML={{ __html: this.renderTitle() }} className="d-flex"></div>}
          {(isPro && showSearchBar) &&
            <Searcher
              onUpdateMode={this.updateMode}
              onUpdateSearchStatus={this.onUpdateSearchStatus}
              onUpdateSearchResults={this.onUpdateSearchResults}
              onClose={this.onCloseSearchBar}
            />
          }
        </ModalHeader>
        <SelectDirentBody
          mode={mode}
          currentRepo={currentRepo}
          selectedRepo={selectedRepo}
          currentPath={path}
          repoList={this.state.repoList}
          selectedPath={selectedPath}
          isSupportOtherLibraries={!isCustomPermission}
          onCancel={this.toggle}
          selectRepo={this.selectRepo}
          setSelectedPath={this.setSelectedPath}
          setErrMessage={this.setErrMessage}
          handleSubmit={this.handleSubmit}
          onUpdateMode={this.updateMode}
          searchStatus={searchStatus}
          searchResults={searchResults}
          selectedSearchedItem={this.state.selectedSearchedItem}
          onSelectedSearchedItem={this.selectSearchedItem}
          onSearchedItemClick={this.onSearchedItemClick}
          onSearchedItemDoubleClick={this.onSearchedItemDoubleClick}
          selectedSearchedRepo={selectedSearchedRepo}
          onSelectSearchedRepo={this.selectSearchedRepo}
          onAddFolder={this.props.onAddFolder}
          initToShowChildren={this.state.initToShowChildren}
          fetchRepoInfo={this.fetchRepoInfo}
        />
      </Modal>
    );
  }
}

CopyDirent.propTypes = propTypes;

export default CopyDirent;
