import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import RepoInfo from '../../models/repo-info';
import RepoListView from './repo-list-view';

import '../../css/file-chooser.css';

const propTypes = {
  isShowFile: PropTypes.bool,
  repoID: PropTypes.string,
  onDirentItemClick: PropTypes.func,
  onRepoItemClick: PropTypes.func,
  mode: PropTypes.oneOf(['current_repo_and_other_repos', 'only_all_repos', 'only_current_library']),
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
    if (this.props.repoID) {  // current_repo_and_other_repos, only_current_library
      let repoID = this.props.repoID;
      seafileAPI.getRepoInfo(repoID).then(res => {
        // need to optimized
        let repoInfo = new RepoInfo(res.data);
        this.setState({
          currentRepoInfo: repoInfo,
          selectedRepo: repoInfo
        });
        this.props.onRepoItemClick(repoInfo);
      });
    } else { // only_all_repos
      seafileAPI.listRepos().then(res => {
        let repos = res.data.repos;
        let repoList = [];
        let repoIdList = [];
        for(let i = 0; i < repos.length; i++) {
          if (repos[i].permission !== 'rw') {
            continue;
          }
          if (repoIdList.indexOf(repos[i].repo_id) > -1) {
            continue;
          }
          repoList.push(repos[i]);
          repoIdList.push(repos[i].repo_id);
        }
        repoList = Utils.sortRepos(repoList, 'name', 'asc');
        this.setState({repoList: repoList});
      });
    }
  }

  onOtherRepoToggle = () => {
    if (!this.state.hasRequest) {
      let that = this;
      seafileAPI.listRepos().then(res => {
        // todo optimized code
        let repos = res.data.repos;
        let repoList = [];
        let repoIdList = [];
        for(let i = 0; i < repos.length; i++) {
          if (repos[i].permission !== 'rw') {
            continue;
          }
          if (that.props.repoID && (repos[i].repo_name === that.state.currentRepoInfo.repo_name)) {
            continue;
          }
          if (repoIdList.indexOf(repos[i].repo_id) > -1) {
            continue;
          }
          repoList.push(repos[i]);
          repoIdList.push(repos[i].repo_id);
        }
        repoList = Utils.sortRepos(repoList, 'name', 'asc');
        this.setState({
          repoList: repoList,
          isOtherRepoShow: !this.state.isOtherRepoShow,
        });
      });
    }
    else {
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

  renderSearchedView = () => {

  }

  renderRepoListView = () => {
    return (
      <div className="file-chooser-container">
        {this.props.mode === 'current_repo_and_other_repos' && (
          <Fragment>
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
          </Fragment>
        )}
        {this.props.mode === 'only_current_library' && (
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
          </div>
        )}
        {this.props.mode === 'only_all_repos' && (
          <div className="file-chooser-container">
            <div className="list-view">
              <div className="list-view-header">
                <span className="item-toggle fa fa-caret-down"></span>
                <span className="library">{gettext('Libraries')}</span>
              </div>
                <RepoListView 
                  initToShowChildren={false}
                  repoList={this.state.repoList}
                  selectedRepo={this.state.selectedRepo}
                  selectedPath={this.state.selectedPath}
                  onRepoItemClick={this.onRepoItemClick} 
                  onDirentItemClick={this.onDirentItemClick}
                  isShowFile={this.props.isShowFile}
                /> 
            </div>
          </div>
        )}
      </div>
    );
  }

  render() {
    if (!this.state.selectedRepo && this.props.repoID) {
      return '';
    }

    return (
      <Fragment>
        {this.renderRepoListView()}
      </Fragment>
    );
  }
}

FileChooser.propTypes = propTypes;

export default FileChooser;
