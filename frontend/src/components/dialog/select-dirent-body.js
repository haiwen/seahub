import React from 'react';
import PropTypes from 'prop-types';
import { Button, ModalFooter, ModalBody, Alert, Row, Col } from 'reactstrap';
import toaster from '../toast';
import RepoListWrapper, { MODE_TYPE_MAP } from '../file-chooser/repo-list-wrapper';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { RepoInfo } from '../../models';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import CreateFolder from '../dialog/create-folder-dialog';

const LibraryOption = ({ mode, label, currentMode, onUpdateMode }) => {
  return (
    <div className={`repo-list-item ${mode === currentMode ? 'active' : ''}`} onClick={() => onUpdateMode(mode)}>
      <span className='library'>{label}</span>
    </div>
  );
};

class SelectDirentBody extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentRepoInfo: null,
      repoList: [],
      selectedRepo: null,
      errMessage: '',
      showCreateFolderDialog: false,
    };
    this.newFolderName = '';
  }

  componentDidMount() {
    this.fetchRepoInfo();
    this.fetchRepoList();
  }

  fetchRepoInfo = async () => {
    try {
      const res = await seafileAPI.getRepoInfo(this.props.repoID);
      const repoInfo = new RepoInfo(res.data);
      this.setState({
        currentRepoInfo: repoInfo,
        selectedRepo: repoInfo,
      });
    } catch (err) {
      const errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
    }
  };

  fetchSelectedRepoInfo = async (repoId) => {
    try {
      const res = await seafileAPI.getRepoInfo(repoId);
      const repoInfo = new RepoInfo(res.data);
      this.setState({
        selectedRepo: repoInfo,
        selectedSearchedRepo: repoInfo,
      });
    } catch (err) {
      const errMessage = Utils.getErrorMsg(err);
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
        selectedRepo: selectedRepo || this.state.selectedRepo,
      });
    } catch (error) {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    }
  };

  onUpdateRepoList = (repoList) => {
    this.setState({ repoList: repoList });
  };

  handleSubmit = () => {
    if (this.props.handleSubmit) {
      this.props.handleSubmit();
    }
  };

  onCancel = () => {
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  };

  onDirentItemClick = (repo, selectedPath) => {
    this.props.selectRepo(repo);
    this.props.setSelectedPath(selectedPath);
    this.props.setErrMessage('');
    this.setState({ selectedRepo: repo });
  };

  onRepoItemClick = (repo) => {
    this.props.selectRepo(repo);
    this.props.setSelectedPath('/');
    this.props.setErrMessage('');
    this.setState({ selectedRepo: repo });
  };

  onUpdateMode = (mode) => {
    const { path } = this.props;
    const { repoList } = this.state;
    if (mode === MODE_TYPE_MAP.ONLY_OTHER_LIBRARIES) {
      this.setState({
        selectedRepo: repoList[0],
      });
      this.props.setSelectedPath('/');
    } else {
      this.setState({ selectedRepo: this.state.currentRepoInfo });
      this.props.setSelectedPath(path);
    }

    this.props.onUpdateMode(mode);
  };

  loadRepoDirentList = (repo) => {
    try {
      const { data } = seafileAPI.listDir(repo.repo_id, '/');
      return data.dirent_list.filter(item => item.type === 'dir');
    } catch (error) {
      return [];
    }
  };

  createFolder = (fullPath) => {
    this.newFolderName = fullPath.split('/').pop();
    const selectedRepoId = this.state.selectedRepo.repo_id;

    if (selectedRepoId === this.props.repoID) {
      this.props.onAddFolder(fullPath, { successCallback: this.fetchRepoInfo });
    } else {
      seafileAPI.createDir(selectedRepoId, fullPath).then(() => {
        this.fetchSelectedRepoInfo(selectedRepoId);
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        this.props.setErrMessage(errMessage);
      });
    }
    this.setState({ showCreateFolderDialog: false });
  };

  onToggleCreateFolder = () => {
    this.setState({ showCreateFolderDialog: !this.state.showCreateFolderDialog });
  };

  checkDuplicatedName = (newName) => {
    const folderList = this.loadRepoDirentList(this.state.selectedRepo);
    return folderList.some(folder => folder.name === newName);
  };

  render() {
    const { mode, path, selectedPath, isSupportOtherLibraries, errMessage, searchStatus, searchResults, selectedSearchedRepo } = this.props;
    const { selectedSearchedItem, selectedRepo, repoList, currentRepoInfo } = this.state;
    let repoListWrapperKey = 'repo-list-wrapper';
    if (selectedSearchedItem && selectedSearchedItem.repoID) {
      repoListWrapperKey = `${repoListWrapperKey}-${selectedSearchedItem.repoID}`;
    }

    return (
      <Row>
        <Col className='repo-list-col border-right'>
          <LibraryOption
            mode={MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY}
            label={gettext('Current Library')}
            currentMode={mode}
            onUpdateMode={this.onUpdateMode}
          />
          {isSupportOtherLibraries && (
            <LibraryOption
              mode={MODE_TYPE_MAP.ONLY_OTHER_LIBRARIES}
              label={gettext('Other Libraries')}
              currentMode={mode}
              onUpdateMode={this.onUpdateMode}
            />
          )}
          <LibraryOption
            mode={MODE_TYPE_MAP.RECENTLY_USED}
            label={gettext('Recently Used')}
            currentMode={mode}
            onUpdateMode={this.onUpdateMode}
          />
        </Col>
        <Col className='file-list-col'>
          <ModalBody>
            <RepoListWrapper
              key={repoListWrapperKey}
              mode={mode}
              currentPath={path}
              selectedItemInfo={selectedSearchedItem}
              currentRepoInfo={currentRepoInfo}
              selectedRepo={selectedRepo}
              selectedPath={selectedPath}
              repoList={repoList}
              handleClickRepo={this.onRepoItemClick}
              handleClickDirent={this.onDirentItemClick}
              searchStatus={searchStatus}
              searchResults={searchResults}
              onSearchedItemClick={this.props.onSearchedItemClick}
              onSearchedItemDoubleClick={this.props.onSearchedItemDoubleClick}
              selectedSearchedRepo={selectedSearchedRepo}
              newFolderName={this.newFolderName}
            />
            {errMessage && <Alert color="danger" className="alert-message">{errMessage}</Alert>}
          </ModalBody>
          <ModalFooter className='move-dirent-dialog-footer'>
            <Button
              className="footer-left-btn"
              color="secondary"
              onClick={this.onToggleCreateFolder}
              disabled={mode === MODE_TYPE_MAP.SEARCH_RESULTS}
            >
              <i className='sf3-font-new sf3-font mr-2'></i>
              <span>{gettext('New folder')}</span>
            </Button>
            <div className='footer-right-btns'>
              <Button color="secondary m-1" onClick={this.onCancel}>{gettext('Cancel')}</Button>
              <Button color="primary m-1" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
            </div>
          </ModalFooter>
        </Col>
        {this.state.showCreateFolderDialog && (
          <ModalPortal>
            <CreateFolder
              parentPath={this.props.selectedPath}
              onAddFolder={this.createFolder}
              checkDuplicatedName={this.checkDuplicatedName}
              addFolderCancel={this.onToggleCreateFolder}
            />
          </ModalPortal>
        )}
      </Row>
    );
  }
}

SelectDirentBody.propTypes = {
  path: PropTypes.string,
  selectedPath: PropTypes.string,
  repoID: PropTypes.string,
  isSupportOtherLibraries: PropTypes.bool,
  onCancel: PropTypes.func,
  handleSubmit: PropTypes.func,
  selectRepo: PropTypes.func,
  setSelectedPath: PropTypes.func,
  setErrMessage: PropTypes.func,
  mode: PropTypes.string,
  onUpdateMode: PropTypes.func,
  searchStatus: PropTypes.string,
  searchResults: PropTypes.array,
  onSearchedItemClick: PropTypes.func,
  onSearchedItemDoubleClick: PropTypes.func,
  selectedSearchedRepo: PropTypes.object,
  onAddFolder: PropTypes.func,
};

SelectDirentBody.defaultProps = {
  isSupportOtherLibraries: true,
};

export default SelectDirentBody;
