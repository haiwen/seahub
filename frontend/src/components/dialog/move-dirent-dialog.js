import React from 'react';
import { Modal, ModalHeader } from 'reactstrap';
import PropTypes from 'prop-types';
import SelectDirentBody from './select-dirent-body';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { RepoInfo } from '../../models';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';
import { MODE_TYPE_MAP } from '../../constants';
import Icon from '../icon';
import Tooltip from '../tooltip';

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

class MoveDirentDialog extends React.Component {

  constructor(props) {
    super(props);
    this.searchInputRef = React.createRef();
    this.state = {
      mode: MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY,
      currentRepo: { repo_id: this.props.repoID },
      selectedRepo: { repo_id: this.props.repoID },
      repoList: [],
      selectedPath: '',
      selectedSearchedRepo: null,
      selectedSearchedItem: { repoID: '', filePath: '' },
      currentSearchedIndex: -1,
      isKeyboardSelectionActive: false,
      searchStatus: '',
      searchResults: [],
      errMessage: '',
      initToShowChildren: false,
    };
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
      this.moveItems();
    } else {
      this.moveItem();
    }
  };

  moveItems = () => {
    let { repoID } = this.props;
    let { selectedRepo, selectedPath } = this.state;
    let message = gettext('Invalid destination path');

    if (!selectedRepo || selectedPath === '') {
      this.setErrMessage(message);
      return;
    }

    let selectedDirentList = this.props.selectedDirentList;
    let direntPaths = [];
    selectedDirentList.forEach(dirent => {
      let path = Utils.joinPath(this.props.path, dirent.name);
      direntPaths.push(path);
    });

    // move dirents to one of them. eg: A/B, A/C -> A/B
    if (direntPaths.some(direntPath => { return direntPath === selectedPath;})) {
      this.setErrMessage(message);
      return;
    }

    // move dirents to current path
    if (selectedPath && selectedPath === this.props.path && (selectedRepo.repo_id === repoID)) {
      this.setErrMessage(message);
      return;
    }

    // move dirents to one of their child. eg: A/B, A/D -> A/B/C
    let moveDirentPath = '';
    let isChildPath = direntPaths.some(direntPath => {
      let flag = selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1;
      if (flag) {
        moveDirentPath = direntPath;
      }
      return flag;
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
    let { repoID } = this.props;
    let { selectedRepo, selectedPath } = this.state;
    let direntPath = Utils.joinPath(this.props.path, this.props.dirent.name);
    let message = gettext('Invalid destination path');

    if (!selectedRepo || (selectedRepo.repo_id === repoID && selectedPath === '')) {
      this.setErrMessage(message);
      return;
    }

    // copy the dirent to itself. eg: A/B -> A/B
    if (selectedPath && direntPath === selectedPath) {
      this.setErrMessage(message);
      return;
    }

    // copy the dirent to current path
    if (selectedPath && this.props.path === selectedPath && selectedRepo.repo_id === repoID) {
      this.setErrMessage(message);
      return;
    }

    // copy the dirent to it's child. eg: A/B -> A/B/C
    if (selectedPath && selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1) {
      message = gettext('Can not move folder %(src)s to its subfolder %(des)s');
      message = message.replace('%(src)s', direntPath);
      message = message.replace('%(des)s', selectedPath);
      this.setErrMessage(message);
      return;
    }

    this.props.onItemMove(selectedRepo, this.props.dirent, selectedPath, this.props.path, true);
    this.toggle();
  };

  toggle = () => {
    this.props.onCancelMove();
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

    const isShowChildren = mode === MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY || mode === MODE_TYPE_MAP.SEARCH_RESULTS;
    this.setState({
      mode,
      initToShowChildren: isShowChildren,
    });

    if (this.state.mode === MODE_TYPE_MAP.SEARCH_RESULTS) {
      this.setState({
        selectedSearchedRepo: null,
        searchResults: [],
      });
    }

    if (this.state.selectedSearchedRepo && mode !== MODE_TYPE_MAP.SEARCH_RESULTS) {
      this.setState({
        selectedSearchedRepo: null,
        searchResults: [],
      });
    }

    this.setState({
      selectedSearchedItem: { repoID: '', filePath: '' },
      currentSearchedIndex: -1,
      isKeyboardSelectionActive: false,
    });
  };

  onUpdateSearchStatus = (status) => {
    if (this.state.mode !== MODE_TYPE_MAP.SEARCH_RESULTS) return;

    this.setState({ searchStatus: status });
  };

  onUpdateSearchResults = (results) => {
    if (this.state.mode !== MODE_TYPE_MAP.SEARCH_RESULTS) return;

    this.setState({
      searchResults: results,
      selectedRepo: null,
      selectedPath: '',
      selectedSearchedItem: { repoID: '', filePath: '' },
      currentSearchedIndex: -1,
      isKeyboardSelectionActive: false,
    });
  };

  selectSearchedItem = (item, index, options = {}) => {
    const { isKeyboardSelectionActive = false } = options;
    this.setState({
      selectedRepo: new RepoInfo(item),
      selectedPath: item.path,
      selectedSearchedItem: { repoID: item.repo_id, filePath: item.path },
      currentSearchedIndex: index,
      isKeyboardSelectionActive,
      errMessage: '',
    });
  };

  onDirentItemClick = (repo, selectedPath) => {
    this.setState({
      selectedPath: selectedPath,
      selectedRepo: repo,
      errMessage: '',
    });
  };

  onOpenSearchBar = () => {
    this.setState({
      mode: MODE_TYPE_MAP.SEARCH_RESULTS,
      searchStatus: '',
      searchResults: [],
      selectedPath: '',
      initToShowChildren: true,
      selectedSearchedItem: { repoID: '', filePath: '' },
      currentSearchedIndex: -1,
      isKeyboardSelectionActive: false,
    });
  };

  onSearchedItemClick = (item, index) => {
    const resultIndex = typeof index === 'number'
      ? index
      : this.state.searchResults.findIndex(result => result.repo_id === item.repo_id && result.path === item.path);
    this.selectSearchedItem(item, resultIndex, { isKeyboardSelectionActive: false });
    if (this.searchInputRef.current) {
      this.searchInputRef.current.focus();
    }
  };

  onSearchInputArrowKeyDown = (key) => {
    const { searchResults, currentSearchedIndex } = this.state;
    if (searchResults.length === 0) return;

    const nextIndex = key === 'ArrowDown'
      ? (currentSearchedIndex < 0 ? 0 : (currentSearchedIndex + 1) % searchResults.length)
      : (currentSearchedIndex < 0 ? searchResults.length - 1 : (currentSearchedIndex - 1 + searchResults.length) % searchResults.length);

    this.selectSearchedItem(searchResults[nextIndex], nextIndex, { isKeyboardSelectionActive: true });
  };

  onSearchInputEnterKeyDown = () => {
    if (this.state.selectedPath) {
      this.handleSubmit();
      return;
    }

    const { currentSearchedIndex, searchResults } = this.state;
    if (currentSearchedIndex < 0 || !searchResults[currentSearchedIndex]) return;

    this.selectSearchedItem(searchResults[currentSearchedIndex], currentSearchedIndex, { isKeyboardSelectionActive: true });
  };

  onSearchedItemDoubleClick = (item) => {
    const itemType = item.type || (item.is_dir ? 'dir' : 'file');
    if (itemType !== 'dir') return;

    seafileAPI.getRepoInfo(item.repo_id).then(res => {
      const repoInfo = new RepoInfo(res.data);
      const path = item.path.substring(0, item.path.length - 1);
      const mode = item.repo_id === this.props.repoID ? MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY : MODE_TYPE_MAP.ONLY_OTHER_LIBRARIES;
      this.setState({
        mode,
        selectedRepo: repoInfo,
        selectedSearchedRepo: repoInfo,
        selectedPath: path,
        selectedSearchedItem: { repoID: item.repo_id, filePath: path },
        currentSearchedIndex: -1,
        initToShowChildren: true,
      });
    }).catch(err => {
      const errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    });
  };

  renderTitle = () => {
    const { dirent, isMultipleOperation } = this.props;
    if (isMultipleOperation) return gettext('Move selected item(s) to:');

    const title = gettext('Move {placeholder} to');
    return title.replace('{placeholder}', `<span class="op-target text-truncate mx-1">${Utils.HTMLescape(dirent.name)}</span>`);
  };

  render() {
    const { dirent, selectedDirentList, isMultipleOperation, path } = this.props;
    const { mode, currentRepo, selectedRepo, selectedPath, searchStatus, searchResults, selectedSearchedRepo } = this.state;
    const movedDirent = dirent || selectedDirentList[0];
    const { permission } = movedDirent;
    const { isCustomPermission } = Utils.getUserPermission(permission);

    return (
      <Modal className="custom-modal" isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}
          close={
            <div className="header-buttons">
              <button type="button" className="close seahub-modal-btn" data-dismiss="modal" aria-label={gettext('Close')} onClick={this.toggle}>
                <span id="close-btn" className="seahub-modal-btn-inner">
                  <Icon symbol="close" />
                  <Tooltip target="close-btn">{gettext('Close')}</Tooltip>
                </span>
              </button>
            </div>
          }
        >
          {isMultipleOperation ? this.renderTitle() : <div dangerouslySetInnerHTML={{ __html: this.renderTitle() }} className="d-flex"></div>}
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
          onOpenSearch={this.onOpenSearchBar}
          onUpdateSearchStatus={this.onUpdateSearchStatus}
          onUpdateSearchResults={this.onUpdateSearchResults}
          searchStatus={searchStatus}
          searchResults={searchResults}
          onSearchInputArrowKeyDown={this.onSearchInputArrowKeyDown}
          onSearchInputEnterKeyDown={this.onSearchInputEnterKeyDown}
          searchInputRef={this.searchInputRef}
          selectedSearchedItem={this.state.selectedSearchedItem}
          currentSearchedIndex={this.state.currentSearchedIndex}
          isKeyboardSelectionActive={this.state.isKeyboardSelectionActive}
          onSearchedItemClick={this.onSearchedItemClick}
          onSearchedItemDoubleClick={this.onSearchedItemDoubleClick}
          selectedSearchedRepo={selectedSearchedRepo}
          onSelectSearchedRepo={this.selectSearchedRepo}
          onAddFolder={this.props.onAddFolder}
          initToShowChildren={this.state.initToShowChildren}
        />
      </Modal>
    );
  }
}

MoveDirentDialog.propTypes = propTypes;

export default MoveDirentDialog;
