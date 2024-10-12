import React from 'react';
import PropTypes from 'prop-types';
import { Button, ModalFooter, ModalBody, Alert, Row, Col } from 'reactstrap';
import toaster from '../toast';
import Searcher, { SearchStatus } from '../file-chooser/searcher';
import RepoListWrapper, { MODE_TYPE_MAP } from '../file-chooser/repo-list-wrapper';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, isPro } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { RepoInfo } from '../../models';

const LibraryOption = ({ mode, label, currentMode, selectedMode }) => {
  return (
    <div className={`repo-list-item ${mode === currentMode ? 'active' : ''}`} onClick={() => selectedMode(mode)}>
      <span className='library'>{label}</span>
    </div>
  );
};

class SelectDirentBody extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      mode: MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY,
      currentRepoInfo: null,
      repoList: [],
      selectedSearchedItem: null,
      selectedRepo: null,
      browsingPath: '',
      searchStatus: SearchStatus.IDLE,
      errMessage: '',
    };
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

  fetchRepoList = async () => {
    try {
      const res = await seafileAPI.listRepos();
      const repos = res.data.repos;
      const repoList = repos.filter((repo) => repo.permission === 'rw' && repo.repo_id !== this.props.repoID);
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

  onUpdateSearchStatus = (status) => {
    this.setState({ searchStatus: status });
  };

  onUpdateRepoList = (repoList) => {
    this.setState({ repoList: repoList });
  };

  selectSearchedItem = (item) => {
    this.setState({ selectedSearchedItem: item });
  };

  onSelectSearchedRepo = (repo) => {
    this.setState({
      selectedRepo: repo,
      mode: repo.repo_id === this.props.repoID ? MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY : MODE_TYPE_MAP.ONLY_OTHER_LIBRARIES,
    });
  };

  selectPath = (path) => {
    this.props.setSelectedPath(path);
  };

  setBrowsingPath = (path) => {
    this.setState({ browsingPath: path });
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

  selectedMode = (mode) => {
    const { repoID, path } = this.props;

    // reset selecting status
    this.props.selectRepo({ repo_id: repoID });
    this.props.setSelectedPath(path);

    this.setState({
      mode,
      selectedSearchedItem: null,
      searchStatus: SearchStatus.RESULTS,
    });
  };

  render() {
    const { path, selectedPath, isSupportOtherLibraries, errMessage } = this.props;
    const { mode, searchStatus, selectedSearchedItem, selectedRepo, repoList, currentRepoInfo, browsingPath } = this.state;
    let repoListWrapperKey = 'repo-list-wrapper';
    if (selectedSearchedItem && selectedSearchedItem.repoID) {
      repoListWrapperKey = `${repoListWrapperKey}-${selectedSearchedItem.repoID}`;
    }

    return (
      <Row>
        <Col className='repo-list-col border-right'>
          {isPro && (
            <Searcher
              searchStatus={searchStatus}
              onUpdateSearchStatus={this.onUpdateSearchStatus}
              onDirentItemClick={this.onDirentItemClick}
              selectSearchedItem={this.selectSearchedItem}
              selectRepo={this.onSelectSearchedRepo}
              selectPath={this.selectPath}
              setBrowsingPath={this.setBrowsingPath}
            />
          )}
          <LibraryOption
            mode={MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY}
            label={gettext('Current Library')}
            currentMode={mode}
            selectedMode={this.selectedMode}
          />
          {isSupportOtherLibraries && (
            <LibraryOption
              mode={MODE_TYPE_MAP.ONLY_OTHER_LIBRARIES}
              label={gettext('Other Libraries')}
              currentMode={mode}
              selectedMode={this.selectedMode}
            />
          )}
          <LibraryOption
            mode={MODE_TYPE_MAP.RECENTLY_USED}
            label={gettext('Recently Used')}
            currentMode={mode}
            selectedMode={this.selectedMode}
          />
        </Col>
        <Col className='file-list-col'>
          <ModalBody>
            {currentRepoInfo && (
              <RepoListWrapper
                key={repoListWrapperKey}
                mode={mode}
                currentPath={path}
                isBrowsing={searchStatus === SearchStatus.BROWSING}
                browsingPath={browsingPath}
                selectedItemInfo={selectedSearchedItem}
                currentRepoInfo={currentRepoInfo}
                selectedRepo={selectedRepo}
                selectedPath={selectedPath}
                repoList={repoList}
                handleClickRepo={this.onRepoItemClick}
                handleClickDirent={this.onDirentItemClick}
              />
            )}
            {errMessage && <Alert color="danger" className="alert-message">{errMessage}</Alert>}
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={this.onCancel}>{gettext('Cancel')}</Button>
            <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
          </ModalFooter>
        </Col>
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
};

SelectDirentBody.defaultProps = {
  isSupportOtherLibraries: true,
};

export default SelectDirentBody;
