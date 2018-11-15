import React from 'react';
import PropTypes from 'prop-types';
import { serviceUrl, gettext, repoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import Toast from '../toast';
import DirentMenu from './dirent-menu';
import DirentRename from './dirent-rename';
import FileTag from '../../models/file-tag';

const propTypes = {
  filePath: PropTypes.string.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  dirent: PropTypes.object.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  onRenameMenuItemClick: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemDownload: PropTypes.func.isRequired,
  onDirentItemMove: PropTypes.func.isRequired,
  onDirentItemCopy: PropTypes.func.isRequired,
  onItemDetails: PropTypes.func.isRequired,
  updateViewList: PropTypes.func.isRequired,
  currentRepo: PropTypes.object,
  isRepoOwner: PropTypes.bool,
};

class DirentListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
      highlight: false,
      isItemMenuShow: false,
      menuPosition: {top: 0, left: 0 },
      fileTagList: [],
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.onItemMenuHide);
    this.getFileTag();
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
    let left = e.clientX;
    let top  = e.clientY;
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
      isItemMenuShow: false,
      isRenameing: false,
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
      this.onRenameMenuItemClick();
      break;
    case 'Move':
      this.onDirentItemMove();
      break;
    case 'Copy':
      this.onDirentItemCopy();
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

  onRenameMenuItemClick = () => {
    this.props.onRenameMenuItemClick(this.props.dirent);
    this.setState({
      isOperationShow: false,
      isItemMenuShow: false,
      isRenameing: true,
    });
  }

  onRenameConfirm = (newName) => {
    if (newName === this.props.dirent.name) {
      this.onRenameCancel();
      return false;
    }
    
    if (!newName) {
      let errMessage = 'It is required.';
      Toast.error(gettext(errMessage));
      return false;
    }
    
    if (newName.indexOf('/') > -1) {
      let errMessage = 'Name should not include "/".';
      Toast.error(gettext(errMessage));
      return false;
    }

    let direntPath = this.getDirentPath(this.props.dirent);
    this.props.onItemRename(direntPath, newName);
    this.onRenameCancel();
  }

  onRenameCancel = () => {
    this.setState({
      isRenameing: false,
    });
    this.props.onUnfreezedItem();
  }
  
  onDirentItemMove = () => {
    let direntPath = this.getDirentPath(this.props.dirent);
    this.props.onDirentItemMove(this.props.dirent, direntPath);
    this.onItemMenuHide();
  }

  onDirentItemCopy = () => {
    let direntPath = this.getDirentPath(this.props.dirent);
    this.props.onDirentItemCopy(this.props.dirent, direntPath);
    this.onItemMenuHide();
  }

  onPermissionItem = () => {

  }

  onDetailsItem = () => {
    let direntPath = this.getDirentPath(this.props.dirent);
    this.props.onItemDetails(this.props.dirent, direntPath);
    this.onItemMenuHide();
  }

  onLockItem = () => {
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.lockfile(repoID, filePath).then(() => {
      this.props.updateViewList(this.props.filePath);
    });
    this.onItemMenuHide();
  }

  onUnlockItem = () => {
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.unlockfile(repoID, filePath).then(() => {
      this.props.updateViewList(this.props.filePath);
    });
    this.onItemMenuHide();
  }

  onNewDraft = () => {
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.createDraft(repoID,filePath).then(res => {
      let draft_file_Path = res.data.draft_file_path;
      let draftId = res.data.id;
      let url = URLDecorator.getUrl({type: 'draft_view', repoID: repoID, filePath: draft_file_Path, draftId: draftId});
      let newWindow = window.open('draft');
      newWindow.location.href = url;
    }).catch(() => {
      Toast.error('Create draft failed.');
    });
    this.onItemMenuHide();
  }

  onComnentItem = () => {

  }

  onHistory = () => {
    let filePath = this.getDirentPath(this.props.dirent);
    let referer = location.href;
    let url = URLDecorator.getUrl({type: 'file_revisions', repoID: repoID, filePath: filePath, referer: referer});
    location.href = url;
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

  getFileTag = () => {
    if (this.props.dirent.type === 'file' && this.props.dirent.file_tags!== undefined) {
      let FileTgas = this.props.dirent.file_tags;
      let fileTagList = [];
      FileTgas.forEach(item => {
        let fileTag = new FileTag(item)
        fileTagList.push(fileTag)
      });
      this.setState({fileTagList: fileTagList});
    }
  }

  componentWillReceiveProps() {
    this.getFileTag();
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
          {this.state.isRenameing ?
            <DirentRename dirent={dirent} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel}/> :
            <span onClick={this.onItemClick}>{dirent.name}</span>
          }
        </td>
        <td>
          <div className="dirent-item tag-list tag-list-stacked ">
            { dirent.type !== 'dir' && this.state.fileTagList.map((fileTag) => {
              return (
                <span className={`file-tag bg-${fileTag.color}`} key={fileTag.id} title={fileTag.name}></span>
              );
            })}
          </div>
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
                  currentRepo={this.props.currentRepo}
                  isRepoOwner={this.props.isRepoOwner}
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
