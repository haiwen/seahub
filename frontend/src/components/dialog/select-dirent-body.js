import React from 'react';
import PropTypes from 'prop-types';
import { Button, ModalFooter, ModalBody, Alert, Row, Col } from 'reactstrap';
import RepoListWrapper from '../file-chooser/repo-list-wrapper';
import { MODE_TYPE_MAP } from '../../constants';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { RepoInfo } from '../../models';
import CreateFolder from '../dialog/create-folder-dialog';
import Icon from '../icon';

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
      errMessage: '',
      showCreateFolderDialog: false,
      folderListOfSelectedRepo: [],
    };
    this.newFolderName = '';
  }

  fetchSelectedRepoInfo = (repoId) => {
    seafileAPI.getRepoInfo(repoId).then((res) => {
      const repoInfo = new RepoInfo(res.data);
      this.props.selectRepo(repoInfo);
      this.props.onSelectSearchedRepo(repoInfo);
    });
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
  };

  onRepoItemClick = (repo) => {
    this.props.selectRepo(repo);
    this.props.setSelectedPath('/');
    this.props.setErrMessage('');
  };

  loadRepoDirentList = async (repo, path) => {
    try {
      const { data } = await seafileAPI.listDir(repo.repo_id, path);
      return data.dirent_list.filter(item => item.type === 'dir');
    } catch (error) {
      return [];
    }
  };

  createFolder = (fullPath) => {
    if (!this.props.selectedRepo) {
      this.setState({ errMessage: gettext('Please select a library or folder first.') });
      return;
    }
    this.newFolderName = fullPath.split('/').pop();
    const selectedRepoId = this.props.selectedRepo.repo_id;

    if (selectedRepoId === this.props.currentRepo.repo_id) {
      this.props.onAddFolder(fullPath, {
        successCallback: () => {
          seafileAPI.getRepoInfo(selectedRepoId).then((res) => {
            const repoInfo = new RepoInfo(res.data);
            this.props.selectRepo(repoInfo);
            this.props.setSelectedPath(fullPath);
          });
        }
      });
    } else {
      seafileAPI.createDir(selectedRepoId, fullPath).then(() => {
        this.fetchSelectedRepoInfo(selectedRepoId);
      });
    }
    this.setState({ showCreateFolderDialog: false });
  };

  onToggleCreateFolder = async () => {
    if (!this.state.showCreateFolderDialog) {
      const folderList = await this.loadRepoDirentList(this.props.selectedRepo, this.props.selectedPath);
      this.setState({ folderListOfSelectedRepo: folderList });
    } else {
      this.setState({ folderListOfSelectedRepo: [] });
    }
    this.setState({ showCreateFolderDialog: !this.state.showCreateFolderDialog, errMessage: '' });
  };

  checkDuplicatedName = (newName) => {
    return this.state.folderListOfSelectedRepo.some(folder => folder.name === newName);
  };

  selectMode = (mode) => {
    this.props.onUpdateMode(mode);
    switch (mode) {
      case MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY:
        this.props.selectRepo(this.props.currentRepo);
        break;
      case MODE_TYPE_MAP.ONLY_OTHER_LIBRARIES:
        this.props.selectRepo(this.props.repoList[0]);
        break;
      case MODE_TYPE_MAP.RECENTLY_USED:
        this.props.selectRepo(null);
        break;
      default:
        break;
    }
    this.props.setSelectedPath('');
  };

  render() {
    const { mode, repoList, currentRepo, selectedRepo, currentPath, selectedPath, isSupportOtherLibraries = true, errMessage, searchStatus, searchResults, selectedSearchedRepo, selectedSearchedItem } = this.props;
    let repoListWrapperKey = 'repo-list-wrapper';
    if (selectedSearchedItem && selectedSearchedItem.repoID) {
      repoListWrapperKey = `${repoListWrapperKey}-${selectedSearchedItem.repoID}`;
    }

    return (
      <Row>
        <Col className='repo-list-col border-end'>
          <LibraryOption
            mode={MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY}
            label={gettext('Current Library')}
            currentMode={mode}
            onUpdateMode={this.selectMode}
          />
          {isSupportOtherLibraries && (
            <LibraryOption
              mode={MODE_TYPE_MAP.ONLY_OTHER_LIBRARIES}
              label={gettext('Other Libraries')}
              currentMode={mode}
              onUpdateMode={this.selectMode}
            />
          )}
          <LibraryOption
            mode={MODE_TYPE_MAP.RECENTLY_USED}
            label={gettext('Recently Used')}
            currentMode={mode}
            onUpdateMode={this.selectMode}
          />
        </Col>
        <Col className='file-list-col'>
          <ModalBody>
            <RepoListWrapper
              key={repoListWrapperKey}
              mode={mode}
              currentPath={currentPath}
              selectedItemInfo={selectedSearchedItem}
              currentRepoInfo={currentRepo}
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
              initToShowChildren={this.props.initToShowChildren}
            />
            {errMessage && <Alert color="danger" className="alert-message">{errMessage}</Alert>}
          </ModalBody>
          <ModalFooter className='move-dirent-dialog-footer'>
            <Button
              className="footer-left-btn"
              color="secondary"
              onClick={this.onToggleCreateFolder}
              disabled={mode === MODE_TYPE_MAP.SEARCH_RESULTS || mode === MODE_TYPE_MAP.RECENTLY_USED}
            >
              <Icon symbol="new" className="mr-2" />
              <span>{gettext('New folder')}</span>
            </Button>
            <div className='footer-right-btns'>
              <Button color="secondary m-1" onClick={this.onCancel}>{gettext('Cancel')}</Button>
              <Button color="primary m-1" onClick={this.handleSubmit} disabled={!this.props.selectedPath}>{gettext('Submit')}</Button>
            </div>
          </ModalFooter>
        </Col>
        {this.state.showCreateFolderDialog && (
          <CreateFolder
            parentPath={this.props.selectedPath}
            onAddFolder={this.createFolder}
            checkDuplicatedName={this.checkDuplicatedName}
            addFolderCancel={this.onToggleCreateFolder}
          />
        )}
      </Row>
    );
  }
}

SelectDirentBody.propTypes = {
  repoList: PropTypes.array.isRequired,
  currentRepo: PropTypes.object.isRequired,
  selectedRepo: PropTypes.object,
  currentPath: PropTypes.string.isRequired,
  selectedPath: PropTypes.string.isRequired,
  isSupportOtherLibraries: PropTypes.bool,
  onCancel: PropTypes.func,
  handleSubmit: PropTypes.func,
  selectRepo: PropTypes.func.isRequired,
  setSelectedPath: PropTypes.func,
  setErrMessage: PropTypes.func,
  mode: PropTypes.string,
  onUpdateMode: PropTypes.func,
  searchStatus: PropTypes.string,
  searchResults: PropTypes.array,
  onSearchedItemClick: PropTypes.func,
  onSearchedItemDoubleClick: PropTypes.func,
  selectedSearchedRepo: PropTypes.object,
  onSelectSearchedRepo: PropTypes.func,
  onAddFolder: PropTypes.func,
  initToShowChildren: PropTypes.bool,
  fetchRepoInfo: PropTypes.func,
  selectedSearchedItem: PropTypes.object,
};

export default SelectDirentBody;
