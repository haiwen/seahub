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

  onDirentItemClick = (filePath) => {
    let repo = this.props.repo;
    this.props.onDirentItemClick(repo, filePath);
  }

  onRepoItemClick = () => {
    this.props.onRepoItemClick(this.props.repo);
  }

  render() {
    let repoActive = false;
    let isCurrentRepo = this.props.selectedRepo && (this.props.repo.repo_id === this.props.selectedRepo.repo_id);
    if (isCurrentRepo && !this.props.selectedPath) {
      repoActive = true;
    }
    return (
      <li className="file-chooser-item">
        <span className={`item-toggle fa ${this.state.isShowChildren ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onToggleClick}></span>
        <span className={`item-info ${repoActive ? 'item-active' : ''}`} onClick={this.onRepoItemClick}>
          <span className="icon far fa-folder"></span>
          <span className="name">{this.props.repo.repo_name}</span>
        </span>
        {this.state.isShowChildren && (
          <DirentListView 
            repo={this.props.repo} 
            isShowChildren={this.state.isShowChildren} 
            onDirentItemClick={this.onDirentItemClick}
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
