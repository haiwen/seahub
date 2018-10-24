import React from 'react';
import PropTypes from 'prop-types';
import DialogDirentListView from './dialog-dirent-list-view';

const propTypes = {
  moveToPath: PropTypes.string,
  selectedRepo: PropTypes.object,
  repo: PropTypes.object.isRequired,
  initToShow: PropTypes.bool.isRequired,
  onDirentItemClick: PropTypes.func.isRequired,
  onRepoItemClick: PropTypes.func.isRequired,
};

class DialogRepoListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowChildren: this.props.initToShow,
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
    if ( isCurrentRepo && !this.props.moveToPath) {
      repoActive = true;
    }
    return (
      <li className="dialog-list-item">
        <span className={`item-toggle fa ${this.state.isShowChildren ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onToggleClick}></span>
        <span className={`item-info ${repoActive ? 'item-active' : ''}`} onClick={this.onRepoItemClick}>
          <span className="icon far fa-folder"></span>
          <span className="name">{this.props.repo.repo_name}</span>
        </span>
        {
          <DialogDirentListView 
            repo={this.props.repo} 
            isShowChildren={this.state.isShowChildren} 
            onDirentItemClick={this.onDirentItemClick}
            moveToPath={this.props.moveToPath}
          />
        }
      </li>
    );
  }
}

DialogRepoListItem.propTypes = propTypes;

export default DialogRepoListItem;
