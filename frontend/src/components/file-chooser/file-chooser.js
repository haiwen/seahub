import React from 'react';
import PropTypes from 'prop-types';
import RepoListView from './repo-list-view';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import RepoInfo from '../../models/repo-info';

import '../../css/file-chooser.css';

const propTypes = {
  isShowFile: PropTypes.bool,
  repoID: PropTypes.string.isRequired,
  onDirentItemClick: PropTypes.func,
  onRepoItemClick: PropTypes.func,
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
      selectedPath: '',
    };
  }

  componentDidMount() {
    let repoID = this.props.repoID;
    seafileAPI.getRepoInfo(repoID).then(res => {
      // need to optimized
      let repoInfo = new RepoInfo(res.data);
      this.setState({
        currentRepoInfo: repoInfo,
      });
    });
  }

  onOtherRepoToggle = () => {
    if (!this.state.hasRequest) {
      let { currentRepoInfo } = this.state;
      seafileAPI.listRepos().then(res => {
        // todo optimized code
        let repos = res.data.repos;
        let repoList = [];
        let repoIdList = [];
        for(let i = 0; i < repos.length; i++) {
          if (repos[i].repo_name === currentRepoInfo.repo_name || repos[i].permission !== 'rw') {
            continue;
          }
          if (repoIdList.indexOf(repos[i].repo_id) > -1) {
            continue;
          }
          repoList.push(repos[i]);
          repoIdList.push(repos[i].repo_id);
        }
        this.setState({
          repoList: repoList,
          isOtherRepoShow: !this.state.isOtherRepoShow,
        });
      });
    } else {
      this.setState({isOtherRepoShow: !this.state.isOtherRepoShow});
    }
  }

  onCurrentRepoToggle = () => [
    this.setState({isCurrentRepoShow: !this.state.isCurrentRepoShow})
  ]

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
      selectedPath: '',
    });
  }

  render() {
    return (
      <div className="file-chooser-container">
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
              selectedRepo={this.state.selectedRepo}
              selectedPath={this.state.selectedPath}
              onRepoItemClick={this.onRepoItemClick} 
              onDirentItemClick={this.onDirentItemClick}
              isShowFile={this.props.isShowFile}
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
            /> 
          }
        </div>
      </div>
    );
  }
}

FileChooser.propTypes = propTypes;

export default FileChooser;
