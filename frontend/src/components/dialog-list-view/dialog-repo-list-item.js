import React from 'react';
import PropTypes from 'prop-types';
import { serviceUrl } from '../../utils/constants';
import DialogDirentListView from './dialog-dirent-list-view';

const propTypes = {
  repo: PropTypes.object.isRequired,
  initToShow: PropTypes.bool.isRequired,
  isSelected: PropTypes.bool.isRequired,
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
    return (
      <li className="dialog-list-item">
        <span className={`item-toggle fa ${this.state.isShowChildren ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onToggleClick}></span>
        <span className={`item-info ${this.props.isSelected ? 'item-active' : ''}`} onClick={this.onRepoItemClick}>
          <img src={serviceUrl + '/media/img/folder-192.png'}></img>
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
