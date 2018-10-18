import React from 'react';
import PropTypes from 'prop-types';
import { serviceUrl, gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import OperationGroup from '../dirent-operation/operation-group';

const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  dirent: PropTypes.object.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemMenuShow: PropTypes.func.isRequired,
  onItemMenuHide: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemDownload: PropTypes.func.isRequired,
  updateViewList: PropTypes.func.isRequired,
};

class DirentListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
      highlight: false
    };
  }

  //UI Interactive
  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
  }

  onMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: false,
      });
    }
  }

  onItemMenuShow = () => {
    this.props.onItemMenuShow();
  }

  onItemMenuHide = () => {
    this.setState({
      isOperationShow: false,
      highlight: ''
    });
    this.props.onItemMenuHide();
  }

  //buiness handler
  onItemSelected = () => {
    //todos;
  }
  
  onItemStarred = () => {
    let dirent = this.props.dirent;
    let filePath = this.getDirentPath(dirent);
    if (dirent.starred) {
      seafileAPI.unStarFile(repoID, filePath).then(() => {
        this.props.updateViewList(this.props.filePath);
      });
    } else {
      seafileAPI.starFile(repoID, filePath).then(() => {
        this.props.updateViewList(this.props.filePath);
      });
    }
  }
  
  onItemClick = () => {
    let direntPath = this.getDirentPath(this.props.dirent);
    this.props.onItemClick(direntPath);
  }

  onItemDownload = () => {
    let direntPath = this.getDirentPath(this.props.dirent);
    this.props.onItemDownload(this.props.dirent, direntPath);
  }

  onItemDelete = () => {
    let direntPath = this.getDirentPath(this.props.dirent);
    this.props.onItemDelete(direntPath);
  }

  onItemMenuItemClick = (operation) => {
    switch(operation) {
      case 'Rename': 
        this.onRenameItem();
        break;
      case 'Move':
        this.onMoveItem();
        break;
      case 'Copy':
        this.onCopyItem();
        break;
      case 'Permission':
        this.onPermissionItem();
        break;
      case 'Details':
        this.onDetailsItem();
        break;
      case 'Unlock':
        this.onUnlockItem();
        break;
      case 'Lock':
        this.onLockItem();
        break;
      case 'New Draft':
        this.onNewDraft();
        break;
      case 'Comment':
        this.onComnentItem();
        break;
      case 'History':
        this.onHistory();
        break;
      case 'Access Log':
        this.onAccessLog();
        break;
      case 'Open via Client':
        this.onOpenViaClient();
        break;
      default:
        break;
    }
  }

  onRenameItem = () => {

  }
  
  onMoveItem = () => {

  }

  onCopyItem = () => {

  }

  onPermissionItem = () => {

  }

  onDetailsItem = () => {

  }

  onLockItem = () => {
    
  }

  onUnlockItem = () => {

  }

  onNewDraft = () => {

  }

  onComnentItem = () => {

  }

  onHistory = () => {

  }

  onAccessLog = () => {

  }

  onOpenViaClient = () => {

  }

  getDirentPath = (dirent) => {
    let path = this.props.filePath;
    return path === '/' ? path + dirent.name : path + '/' + dirent.name;
  }

  render() {
    let { dirent } = this.props;
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseOver={this.onMouseOver} onMouseLeave={this.onMouseLeave}>
        <td className="select">
          <input type="checkbox" className="vam" />
        </td>
        <td className="star" onClick={this.onItemStarred}>
          {dirent.starred !== undefined && !dirent.starred && <i className="far fa-star empty"></i>}
          {dirent.starred !== undefined && dirent.starred && <i className="fas fa-star"></i>}
        </td>
        <td className="icon">
          <img src={dirent.type === 'dir' ? serviceUrl + '/media/img/folder-192.png' : serviceUrl + '/media/img/file/192/txt.png'} alt={gettext('file icon')}></img>
        </td>
        <td className="name a-simulate" onClick={this.onItemClick}>{dirent.name}</td>
        <td className="operation">
          {
            this.state.isOperationShow && 
            <OperationGroup 
              dirent={dirent} 
              onItemMenuShow={this.onItemMenuShow}
              onItemMenuHide={this.onItemMenuHide}
              onDownload={this.onItemDownload}
              onDelete={this.onItemDelete}
              onMenuItemClick={this.props.onItemMenuItemClick}
            />
          }
        </td>
        <td className="file-size">{dirent.size && dirent.size}</td>
        <td className="last-update" dangerouslySetInnerHTML={{__html: dirent.mtime}}></td>
      </tr>
    );
  }
}

DirentListItem.propTypes = propTypes;

export default DirentListItem;
