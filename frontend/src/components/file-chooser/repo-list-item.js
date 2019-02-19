import React from 'react';
import PropTypes from 'prop-types';
import DirentListView from './dirent-list-view';

const propTypes = {
  isShowFile: PropTypes.bool,
  selectedPath: PropTypes.string,
  selectedRepo: PropTypes.object,
  repo: PropTypes.object.isRequired,
  initToShowChildren: PropTypes.bool.isRequired,
  onDirentItemClick: PropTypes.func.isRequired,
  onRepoItemClick: PropTypes.func.isRequired,
};

class RepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowChildren: this.props.initToShowChildren,
    };
  }

  onToggleClick = () => {
    this.setState({isShowChildren: !this.state.isShowChildren});
  }

  onDirentItemClick = (filePath, dirent) => {
    let repo = this.props.repo;
    this.props.onDirentItemClick(repo, filePath, dirent);
  }

  onRepoItemClick = () => {
    if (!this.isCurrentRepo()) {
      this.props.onRepoItemClick(this.props.repo);
    } else {
      this.onToggleClick();
    }
  }

  isCurrentRepo = () => {
    let { selectedRepo, repo } = this.props;
    return selectedRepo && (repo.repo_id === selectedRepo.repo_id);
  }

  render() {
    let repoActive = false;
    let isCurrentRepo = this.isCurrentRepo();
    if (isCurrentRepo && !this.props.selectedPath) {
      repoActive = true;
    }
    return (
      <li className="file-chooser-item">
        <span className={`item-toggle fa ${this.state.isShowChildren ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onToggleClick}></span>
        <span className={`item-info ${repoActive ? 'item-active' : ''}`} onClick={this.onRepoItemClick}>
          <span className="icon far fa-folder"></span>
          <span className="name user-select-none ellipsis">{this.props.repo.repo_name}</span>
        </span>
        {this.state.isShowChildren && (
          <DirentListView 
            repo={this.props.repo} 
            isShowChildren={this.state.isShowChildren} 
            onDirentItemClick={this.onDirentItemClick}
            selectedRepo={this.props.selectedRepo}
            selectedPath={this.props.selectedPath}
            isShowFile={this.props.isShowFile}
          />
        )}
      </li>
    );
  }
}

RepoListItem.propTypes = propTypes;

export default RepoListItem;
