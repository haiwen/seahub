import React from 'react';
import PropTypes from 'prop-types';
import RepoListView from './repo-list-view';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import Repo from '../../models/repo';

import '../../css/file-chooser.css';

const propTypes = {
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
      currentRepo: null,
      selectedRepo: null,
      selectedPath: '',
    };
  }

  componentDidMount() {
    let repoID = this.props.repoID;
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repo = new Repo(res.data);
      this.setState({
        currentRepo: repo,
      });
    });
  }

  onOtherRepoToggle = () => {
    if (!this.state.hasRequest) {
      let { currentRepo } = this.state;
      seafileAPI.listRepos().then(res => {
        let repos = res.data.repos;
        let repoList = [];
        let repoIdList = [];
        for(let i = 0; i < repos.length; i++) {
          if (repos[i].repo_name === currentRepo.repo_name || repos[i].permission !== 'rw') {
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

  onDirentItemClick = (repo, filePath) => {
    this.props.onDirentItemClick(repo, filePath);
    this.setState({
      selectedRepo: repo,
      selectedPath: filePath
    });
  }

  onRepoItemClick = (repo) => {
    this.props.onRepoItemClick(repo);
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
            this.state.isCurrentRepoShow && this.state.currentRepo &&
            <RepoListView 
              initToShowChildren={true}
              repo={this.state.currentRepo}
              selectedRepo={this.state.selectedRepo}
              selectedPath={this.state.selectedPath}
              onRepoItemClick={this.onRepoItemClick} 
              onDirentItemClick={this.onDirentItemClick}
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
            /> 
          }
        </div>
      </div>
    );
  }
}

FileChooser.propTypes = propTypes;

export default FileChooser;
