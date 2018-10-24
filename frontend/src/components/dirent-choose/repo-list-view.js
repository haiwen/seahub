import React from 'react';
import PropTypes from 'prop-types';
import { gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import RepoListItem from './repo-list-item';
import Repo from '../../models/repo';

import '../../css/dialog-list-view.css';

const propTypes = {
  onDirentItemClick: PropTypes.func.isRequired,
  onRepoItemClick: PropTypes.func.isRequired,
};

class RepoListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentRepo: null,
      selectedRepo: null,
      repoList: [],
      showOtherRepo: false,
      moveToPath: '',
    };
  }

  componentDidMount() {
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repo = new Repo(res.data);
      seafileAPI.listRepos().then(res => {
        let repos = res.data.repos;
        let repoList = [];
        let repoIdList = [];
        for(let i = 0; i < repos.length; i++) {
          if (repos[i].repo_name === repo.repo_name || repos[i].permission !== 'rw') {
            continue;
          }
          if (repoIdList.indexOf(repos[i].repo_id) > -1) {
            continue;
          }
          repoList.push(repos[i]);
          repoIdList.push(repos[i].repo_id);
        }
        this.setState({
          currentRepo: repo,
          selectedRepo: null,
          repoList: repoList
        });
      });

    });
  }

  onOtherRepoToggle = () => {
    this.setState({showOtherRepo: !this.state.showOtherRepo});
  }

  onDirentItemClick = (repo, filePath) => {
    this.props.onDirentItemClick(repo, filePath);
    this.setState({
      selectedRepo: repo,
      moveToPath: filePath
    });
  }

  onRepoItemClick = (repo) => {
    this.props.onRepoItemClick(repo);
    this.setState({
      selectedRepo: repo,
      moveToPath: '',
    });
  }


  render() {
    let { currentRepo, selectedRepo, repoList } = this.state;
    return (
      <div className="dialog-content-container" style={{overflow: 'auto'}}>
        <div className="list-view">
          <div className="list-view-header">
            <span className="item-toggle fa fa-caret-down"></span>
            <span className="library">{gettext('Current Library')}</span>
          </div>
          <ul className="list-view-content dialog-list-item">
            {
              this.state.currentRepo && 
              <RepoListItem 
                repo={currentRepo}
                initToShow={true}
                selectedRepo={selectedRepo}
                onRepoItemClick={this.onRepoItemClick} 
                onDirentItemClick={this.onDirentItemClick}
                moveToPath={this.state.moveToPath} 
              />
            }
          </ul>
        </div>
        <div className="list-view">
          <div className="list-view-header">
            <span className={`item-toggle fa ${this.state.showOtherRepo ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onOtherRepoToggle}></span>
            <span className="library">{gettext('Other Libraries')}</span>
          </div>
          <ul className="list-view-content dialog-list-item">
            { this.state.showOtherRepo && repoList.map((repo, index) => {
              return (
                <RepoListItem 
                  key={index} 
                  repo={repo}
                  initToShow={false}
                  selectedRepo={selectedRepo}
                  onRepoItemClick={this.onRepoItemClick} 
                  onDirentItemClick={this.onDirentItemClick}
                  moveToPath={this.state.moveToPath}
                />
              );
            })}
          </ul>
        </div>
      </div>
    );
  }
}

RepoListView.propTypes = propTypes;

export default RepoListView;
