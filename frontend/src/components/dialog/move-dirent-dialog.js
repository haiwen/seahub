import React from 'react';
import { Modal, ModalHeader } from 'reactstrap';
import PropTypes from 'prop-types';
import { IconBtn } from '@seafile/sf-metadata-ui-component';
import SelectDirentBody from './select-dirent-body';
import { gettext, isPro } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Searcher from '../file-chooser/searcher';
import { RepoInfo } from '../../models';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';
import { MODE_TYPE_MAP } from '../../constants';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  selectedDirentList: PropTypes.array,
  isMultipleOperation: PropTypes.bool.isRequired,
  onItemMove: PropTypes.func,
  onItemsMove: PropTypes.func,
  onCancelMove: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func,
};

class MoveDirent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      mode: MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY,
      currentRepo: { repo_id: this.props.repoID },
      selectedRepo: { repo_id: this.props.repoID },
      repoList: [],
      selectedPath: this.props.path,
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
      this.setState({
        currentRepo: repo,
        selectedRepo: repo,
      });
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
      this.setState({ repoList: sortedRepoList });
    } catch (error) {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    }
  };

  handleSubmit = () => {
    if (this.props.isMultipleOperation) {
      this.moveItems();
    } else {
      this.moveItem();
    }
  };

  moveItems = () => {
    const { repoID, selectedDirentList, path } = this.props;
    const { selectedRepo, selectedPath } = this.state;
    let message = gettext('Invalid destination path');

    if (!selectedRepo || selectedPath === '') {
      this.setErrMessage(message);
      return;
    }

    const direntPaths = selectedDirentList.map(dirent => Utils.joinPath(path, dirent.name));

    // move dirents to one of them. eg: A/B, A/C -> A/B
    if (direntPaths.includes(selectedPath)) {
      this.setErrMessage(message);
      return;
    }

    // move dirents to current path
    if (selectedPath === path && selectedRepo.repo_id === repoID) {
      this.setErrMessage(message);
      return;
    }

    // move dirents to one of their child. eg: A/B, A/D -> A/B/C
    let moveDirentPath = '';
    let isChildPath = direntPaths.some(direntPath => {
      let isChild = selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1;
      if (isChild) {
        moveDirentPath = direntPath;
      }
      return isChild;
    });

    if (isChildPath) {
      message = gettext('Can not move folder %(src)s to its subfolder %(des)s');
      message = message.replace('%(src)s', moveDirentPath);
      message = message.replace('%(des)s', selectedPath);
      this.setErrMessage(message);
      return;
    }

    this.props.onItemsMove(selectedRepo, selectedPath, true);
    this.toggle();
  };

  moveItem = () => {
    const { repoID, dirent, path, onItemMove } = this.props;
    const { selectedRepo, selectedPath } = this.state;
    const direntPath = Utils.joinPath(path, dirent.name);
    let message = gettext('Invalid destination path');

    if (!selectedRepo || (selectedRepo.repo_id === repoID && !selectedPath)) {
      this.setErrMessage(message);
      return;
    }

    if (direntPath === selectedPath || (selectedPath === path && selectedRepo.repo_id === repoID)) {
      this.setErrMessage(message);
      return;
    }

    if (selectedPath.length > direntPath.length && selectedPath.includes(direntPath)) {
      message = gettext('Can not move folder %(src)s to its subfolder %(des)s')
        .replace('%(src)s', direntPath)
        .replace('%(des)s', selectedPath);
      this.setErrMessage(message);
      return;
    }

    onItemMove(selectedRepo, dirent, selectedPath, path, true);
    this.toggle();
  };

  toggle = () => {
    this.props.onCancelMove();
  };

  selectRepo = (repo) => {
    this.setState({ selectedRepo: repo });
  };

  setSelectedPath = (selectedPath) => {
    this.setState({ selectedPath });
  };

  setErrMessage = (message) => {
    this.setState({ errMessage: message });
  };

  clearErrMessage = () => {
    this.setState({ errMessage: '' });
  };

  updateMode = (mode) => {
    if (mode === this.state.mode) return;

    if (mode !== MODE_TYPE_MAP.SEARCH_RESULTS) {
      this.lastMode = mode;
    }

    let newState = {
      mode,
      initToShowChildren: mode === MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY || mode === MODE_TYPE_MAP.SEARCH_RESULTS,
      showSearchBar: mode === MODE_TYPE_MAP.SEARCH_RESULTS,
      selectedSearchedItem: { repoID: '', filePath: '' },
    };

    if (mode !== MODE_TYPE_MAP.SEARCH_RESULTS) {
      newState.searchResults = [];
    }

    if (mode === MODE_TYPE_MAP.SEARCH_RESULTS && this.state.searchResults.length > 0) {
      const firstResult = this.state.searchResults[0];
      newState.selectedRepo = new RepoInfo(firstResult);
      newState.selectedPath = firstResult.path;
    }

    this.setState(newState);
    this.clearErrMessage();
  };

  onUpdateSearchStatus = (status) => {
    this.setState({ searchStatus: status });
  };

  onUpdateSearchResults = (results) => {
    if (this.state.mode === MODE_TYPE_MAP.SEARCH_RESULTS && results.length > 0) {
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
    this.clearErrMessage();
  };

  onCloseSearchBar = () => {
    const mode = this.lastMode;
    this.setState({
      mode,
      searchStatus: '',
      searchResults: [],
      showSearchBar: false,
      initToShowChildren: mode === MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY,
    });
    this.clearErrMessage();
  };

  onSearchedItemClick = (item) => {
    item['type'] = item.is_dir ? 'dir' : 'file';
    let repo = new RepoInfo(item);
    this.onDirentItemClick(repo, item.path, item);
    this.clearErrMessage();
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
      selectedPath,
      selectedRepo: repo,
    });
    this.clearErrMessage();
  };

  renderTitle = () => {
    const { dirent, isMultipleOperation } = this.props;
    let title = gettext('Move {placeholder} to');

    if (isMultipleOperation) {
      return gettext('Move selected item(s) to:');
    } else {
      return title.replace('{placeholder}', `<span class="op-target text-truncate mx-1">${Utils.HTMLescape(dirent.name)}</span>`);
    }
  };

  render() {
    const { dirent, selectedDirentList, isMultipleOperation, path } = this.props;
    const { mode, currentRepo, selectedRepo, selectedPath, showSearchBar, searchStatus, searchResults, errMessage } = this.state;

    const movedDirent = dirent || selectedDirentList[0];
    const { permission } = movedDirent;
    const { isCustomPermission } = Utils.getUserPermission(permission);

    return (
      <Modal className="custom-modal" isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle} close={
          <div className="header-close-list">
            <span aria-hidden="true" className="sf3-font sf3-font-x-01 comment-close-icon" onClick={this.toggle}></span>
          </div>
        }>
          {isMultipleOperation ? this.renderTitle() : <div dangerouslySetInnerHTML={{ __html: this.renderTitle() }} className="d-flex"></div>}
          {isPro && (
            showSearchBar ? (
              <Searcher
                onUpdateMode={this.updateMode}
                onUpdateSearchStatus={this.onUpdateSearchStatus}
                onUpdateSearchResults={this.onUpdateSearchResults}
                onClose={this.onCloseSearchBar}
              />
            ) : (
              <IconBtn
                iconName="search"
                size={24}
                className="search"
                onClick={this.onOpenSearchBar}
                role="button"
                onKeyDown={() => {}}
                tabIndex={0}
              />
            )
          )}
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
          errMessage={errMessage}
          setErrMessage={this.setErrMessage}
          clearErrMessage={this.clearErrMessage}
          handleSubmit={this.handleSubmit}
          onUpdateMode={this.updateMode}
          searchStatus={searchStatus}
          searchResults={searchResults}
          selectedSearchedItem={this.state.selectedSearchedItem}
          onSelectedSearchedItem={this.selectSearchedItem}
          onSearchedItemClick={this.onSearchedItemClick}
          onSearchedItemDoubleClick={this.onSearchedItemDoubleClick}
          onSelectSearchedRepo={this.selectSearchedRepo}
          onAddFolder={this.props.onAddFolder}
          initToShowChildren={this.state.initToShowChildren}
          fetchRepoInfo={this.fetchRepoInfo}
        />
      </Modal>
    );
  }
}

MoveDirent.propTypes = propTypes;

export default MoveDirent;
