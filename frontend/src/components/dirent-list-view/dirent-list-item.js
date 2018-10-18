import React from 'react';
import PropTypes from 'prop-types';
import { serviceUrl, gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import DirentMenu from './dirent-menu';

const propTypes = {
  isItemFreezed: PropTypes.bool.isRequired,
  dirent: PropTypes.object.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemDownload: PropTypes.func.isRequired,
  updateViewList: PropTypes.func.isRequired,
};

class DirentListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
      highlight: false,
      isItemMenuShow: false,
      menuPosition: {top: 0, left: 0 },
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.onItemMenuHide);
  }
  
  componentWillUnmount() {
    document.removeEventListener('click', this.onItemMenuHide);
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

  onItemMenuToggle = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (!this.state.isItemMenuShow) {
      this.onItemMenuShow(e);
    } else {
      this.onItemMenuHide();
    }
  }

  onItemMenuShow = (e) => {
    let left = e.clientX - 8*16;
    let top  = e.clientY + 15;
    let position = Object.assign({},this.state.menuPosition, {left: left, top: top});
    this.setState({
      menuPosition: position,
      isItemMenuShow: true,
    });
    this.props.onFreezedItem();
  }

  onItemMenuHide = () => {
    this.setState({
      isOperationShow: false,
      highlight: '',
      isItemMenuShow: false
    });
    this.props.onUnfreezedItem();
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

  onItemDownload = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let direntPath = this.getDirentPath(this.props.dirent);
    this.props.onItemDownload(this.props.dirent, direntPath);
  }

  onItemDelete = (e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
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
    this.setState({
      isOperationShow: false,
      isItemMenuShow: false
    });
    this.props.onRenameItem(this.props.dirent);
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
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.lockFile(repoID, filePath).then(() => {
      this.props.updateViewList(this.props.filePath);
    });
    this.onItemMenuHide();
  }

  onUnlockItem = () => {
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.unLockFile(repoID, filePath).then(() => {
      this.props.updateViewList(this.props.filePath);
    });
    this.onItemMenuHide();
  }

  onNewDraft = () => {
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.newDraft(repoID,filePath).then(res => {
      let draft_file_Path = res.data.draft_file_path;
      let draftId = res.data.id;
      let url = URLDecorator.getUrl({type: 'draft_view', repoID: repoID, filePath: draft_file_Path, draftId: draftId});
      window.open(url);
    }).catch(() => {
      //todos;
    });
    this.onItemMenuHide();
  }

  onComnentItem = () => {

  }

  onHistory = () => {
    let filePath = this.getDirentPath(this.props.dirent);
    let referer = location.href;
    let url = URLDecorator.getUrl({type: 'file_revisions', repoID: repoID, filePath: filePath, referer: referer});
    window.open(url);
    this.onItemMenuHide();
  }

  onAccessLog = () => {

  }

  onOpenViaClient = () => {
    let filePath = this.getDirentPath(this.props.dirent);
    let url = URLDecorator.getUrl({type: 'open_via_client', repoID: repoID, filePath: filePath});
    location.href = url;
    this.onItemMenuHide();
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
          <div className="dir-icon">
            <img src={dirent.type === 'dir' ? serviceUrl + '/media/img/folder-192.png' : serviceUrl + '/media/img/file/192/txt.png'} alt={gettext('file icon')}></img>
            {dirent.is_locked && <img className="locked" src={serviceUrl + '/media/img/file-locked-32.png'} alt={gettext('locked')}></img>}
          </div>
        </td>
        <td className="name a-simulate">
          {!dirent.isRenameing && <span onClick={this.onItemClick}>{dirent.name}</span>}
          {dirent.isRenameing && 
            <div className="rename-conatiner">
              <input></input>
              <button>确定</button>
              <button>取消</button>
            </div>
          }
        </td>
        <td className="operation">
          {
            this.state.isOperationShow && 
            <div className="operations">
              <ul className="operation-group">
                <li className="operation-group-item">
                  <i className="sf2-icon-download" title={gettext('Download')} onClick={this.onItemDownload}></i>
                </li>
                <li className="operation-group-item">
                  <i className="sf2-icon-share" title={gettext('Share')} onClick={this.onItemShare}></i>
                </li>
                <li className="operation-group-item">
                  <i className="sf2-icon-delete" title={gettext('Delete')} onClick={this.onItemDelete}></i>
                </li>
                <li className="operation-group-item">
                  <i className="sf2-icon-caret-down sf-dropdown-toggle" title={gettext('More Operation')} onClick={this.onItemMenuToggle}></i>
                </li>
              </ul>
              {
                this.state.isItemMenuShow && 
                <DirentMenu 
                  dirent={this.props.dirent}
                  menuPosition={this.state.menuPosition}
                  onMenuItemClick={this.onItemMenuItemClick}
                />
              }
            </div>
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
