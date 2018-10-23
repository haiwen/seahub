import React from 'react';
import { gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import DialogRepoListItem from './dialog-repo-list-item';
import Repo from '../../models/repo';

import '../../css/dialog-list-view.css';

class DialogRepoListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentRepo: null,
      seletedRepo: null,
      repoList: [],
      showOtherLibrary: false,
      moveToPath: '',
    };
  }

  componentDidMount() {
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repo = new Repo(res.data);
      seafileAPI.listRepos().then(res => {
        let repoList = res.data.filter(item => {
          return item.repo_name !== repo.repo_name;
        });
        this.setState({
          currentRepo: repo,
          seletedRepo: null,
          repoList: repoList
        });
      });

    });
  }

  onOtherLibraryToggle = () => {
    this.setState({showOtherLibrary: !this.state.showOtherLibrary});
  }

  onDirentItemClick = (repo, filePath) => {
    this.props.onDirentItemClick(repo, filePath);
    this.setState({
      seletedRepo: repo,
      moveToPath: filePath
    });
  }

  onRepoItemClick = (repo) => {
    this.props.onRepoItemClick(repo);
    this.setState({
      seletedRepo: repo,
      moveToPath: '',
    });
  }


  render() {
    let { currentRepo, seletedRepo, repoList, moveToPath } = this.state;
    let isSelected = false;
    if ( currentRepo && seletedRepo && !moveToPath) {
      isSelected = currentRepo.repo_name === seletedRepo.repo_name;
    }
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
              <DialogRepoListItem 
                repo={currentRepo}
                initToShow={true}
                isSelected={isSelected}
                onRepoItemClick={this.onRepoItemClick} 
                onDirentItemClick={this.onDirentItemClick}
                moveToPath={this.state.moveToPath} 
              />
            }
          </ul>
        </div>
        <div className="list-view">
          <div className="list-view-header">
            <span className={`item-toggle fa ${this.state.showOtherLibrary ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onOtherLibraryToggle}></span>
            <span className="library">{gettext('Other Libraries')}</span>
          </div>
          <ul className="list-view-content dialog-list-item">
            { this.state.showOtherLibrary && repoList.map((repo, index) => {
              return (
                <DialogRepoListItem 
                  key={index} 
                  repo={repo}
                  initToShow={false}
                  isSelected={isSelected}
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

export default DialogRepoListView;
