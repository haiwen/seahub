import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalFooter, ModalBody, Alert, Row, Col } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import FileChooser from './file-chooser';
import Search, { SearchStatus } from './search';
import { seafileAPI } from '../../utils/seafile-api';
import { RepoInfo } from '../../models';
import toaster from '../toast';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  selectedDirentList: PropTypes.array,
  isMultipleOperation: PropTypes.bool.isRequired,
  onItemMove: PropTypes.func,
  onItemsMove: PropTypes.func,
  onCancelMove: PropTypes.func.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
};

class MoveDirent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: { repo_id: this.props.repoID },
      currentRepoInfo: null,
      errMessage: '',
      mode: 'only_current_library',
      repoList: [],
      selectedSearchedItem: null,
      selectedRepo: null,
      selectedPath: this.props.path,
      browsingPath: '',
      searchStatus: SearchStatus.IDLE,
      isLoading: true,
      isSearchPopoverOpen: false,
    };
    this.searchRef = React.createRef();
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
        selectedPath: '/',
        isLoading: false,
      });
    } catch (err) {
      const errMessage = Utils.getErrorMsg(err);
      toaster.danger(errMessage);
      this.setState({ isLoading: false });
    }
  };

  fetchRepoList = async () => {
    try {
      const res = await seafileAPI.listRepos();
      const repos = res.data.repos;
      const repoList = repos.filter(repo =>
        repo.permission === 'rw' && repo.repo_id !== this.props.repoID);

      const sortedRepoList = Utils.sortRepos(repoList, 'name', 'asc');
      const selectedRepo = sortedRepoList.find(repo => repo.repo_id === this.props.repoID);
      const path = this.props.path.substring(0, this.props.path.length - 1);

      this.setState({
        repoList: sortedRepoList,
        selectedPath: path,
        selectedRepo: selectedRepo || this.state.selectedRepo,
      });
    } catch (error) {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    }
  };

  onUpdateSearchStatus = (status) => {
    this.setState({ searchStatus: status });
  };

  onUpdateRepoList = (repoList) => {
    this.setState({ repoList: repoList });
  };

  onSelectedSearchedItem = (item) => {
    this.setState({ selectedSearchedItem: item });
  };

  onSelectedRepo = (repo) => {
    this.setState({ selectedRepo: repo, mode: repo.repo_id === this.props.repoID ? 'only_current_library' : 'only_other_libraries' });
  };

  onSelectedPath = (path) => {
    this.setState({ selectedPath: path });
  };

  onBrowsingPath = (path) => {
    this.setState({ browsingPath: path });
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
    let { repo, selectedPath } = this.state;
    let message = gettext('Invalid destination path');

    if (!repo || selectedPath === '') {
      this.setState({ errMessage: message });
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
      this.setState({ errMessage: message });
      return;
    }

    // move dirents to current path
    if (selectedPath && selectedPath === this.props.path && (repo.repo_id === repoID)) {
      this.setState({ errMessage: message });
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
      this.setState({ errMessage: message });
      return;
    }

    this.props.onItemsMove(repo, selectedPath);
    this.toggle();
  };

  moveItem = () => {
    let { repoID } = this.props;
    let { repo, selectedPath } = this.state;
    let direntPath = Utils.joinPath(this.props.path, this.props.dirent.name);
    let message = gettext('Invalid destination path');

    if (!repo || (repo.repo_id === repoID && selectedPath === '')) {
      this.setState({ errMessage: message });
      return;
    }

    // copy the dirent to itself. eg: A/B -> A/B
    if (selectedPath && direntPath === selectedPath) {
      this.setState({ errMessage: message });
      return;
    }

    // copy the dirent to current path
    if (selectedPath && this.props.path === selectedPath && repo.repo_id === repoID) {
      this.setState({ errMessage: message });
      return;
    }

    // copy the dirent to it's child. eg: A/B -> A/B/C
    if (selectedPath && selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1) {
      message = gettext('Can not move folder %(src)s to its subfolder %(des)s');
      message = message.replace('%(src)s', direntPath);
      message = message.replace('%(des)s', selectedPath);
      this.setState({ errMessage: message });
      return;
    }

    this.props.onItemMove(repo, this.props.dirent, selectedPath, this.props.path);
    this.toggle();
  };

  toggle = () => {
    this.props.onCancelMove();
  };

  onDirentItemClick = (repo, selectedPath) => {
    this.setState({
      repo: repo,
      selectedRepo: repo,
      selectedPath: selectedPath,
      errMessage: ''
    });
  };

  onRepoItemClick = (repo) => {
    this.setState({
      repo: repo,
      selectedRepo: repo,
      selectedPath: '/',
      errMessage: ''
    });
  };

  onSelectedMode = (mode) => {
    this.setState({ mode: mode });
  };

  handleModalClick = (e) => {
    if (this.searchRef.current && !this.searchRef.current.contains(e.target)) {
      this.setState({ isSearchPopoverOpen: false });
    }
  };

  onSearchPopoverToggle = (isOpen) => {
    this.setState({ isSearchPopoverOpen: isOpen });
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
    const { dirent, selectedDirentList, isMultipleOperation, repoID, path } = this.props;
    const { mode, errMessage, searchStatus, selectedSearchedItem, selectedRepo, selectedPath, repoList, currentRepoInfo, browsingPath, isSearchPopoverOpen } = this.state;

    const movedDirent = dirent || selectedDirentList[0];
    const { permission } = movedDirent;
    const { isCustomPermission } = Utils.getUserPermission(permission);

    const LibraryOption = ({ mode, label }) => (
      <div className={`repo-list-item ${this.state.mode === mode ? 'active' : ''}`} onClick={() => this.onSelectedMode(mode)}>
        <span className='library'>{label}</span>
      </div>
    );

    return (
      <Modal className='custom-modal' isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>
          {isMultipleOperation ? this.renderTitle() : <div dangerouslySetInnerHTML={{ __html: this.renderTitle() }} className='d-flex mw-100'></div>}
        </ModalHeader>
        <Row>
          <Col className='repo-list-col border-right'>
            <div ref={this.searchRef}>
              <Search
                searchStatus={searchStatus}
                onUpdateSearchStatus={this.onUpdateSearchStatus}
                onDirentItemClick={this.onDirentItemClick}
                onSelectedSearchedItem={this.onSelectedSearchedItem}
                onSelectedRepo={this.onSelectedRepo}
                onSelectedPath={this.onSelectedPath}
                onBrowsingPath={this.onBrowsingPath}
                isPopoverOpen={isSearchPopoverOpen}
                onPopoverToggle={this.onSearchPopoverToggle}
              />
            </div>
            <LibraryOption mode='only_current_library' label={gettext('Current Library')} />
            {!isCustomPermission && <LibraryOption mode='only_other_libraries' label={gettext('Other Libraries')} />}
            <LibraryOption mode='recently_used' label={gettext('Recently Used')} />
          </Col>
          <Col className='file-list-col'>
            <ModalBody>
              {currentRepoInfo && (
                <FileChooser
                  repoID={repoID}
                  mode={mode}
                  repoList={repoList}
                  currentRepoInfo={currentRepoInfo}
                  currentPath={path}
                  selectedRepo={selectedRepo}
                  selectedPath={selectedPath}
                  selectedSearchedItem={selectedSearchedItem}
                  onRepoItemClick={this.onRepoItemClick}
                  onDirentItemClick={this.onDirentItemClick}
                  hideLibraryName={false}
                  isBrowsing={searchStatus === SearchStatus.BROWSING}
                  browsingPath={browsingPath}
                />
              )}
              {errMessage && <Alert color="danger" className="alert-message">{errMessage}</Alert>}
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
              <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
            </ModalFooter>
          </Col>
        </Row>
      </Modal>
    );
  }
}

MoveDirent.propTypes = propTypes;

export default MoveDirent;
