import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MD5 from 'MD5';
import { UncontrolledTooltip } from 'reactstrap';
import { gettext, siteRoot, mediaUrl, username, canGenerateShareLink } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import Rename from '../rename';
import ModalPortal from '../modal-portal';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';
import ShareDialog from '../dialog/share-dialog';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import EditFileTagDialog from '../dialog/edit-filetag-dialog';

import '../../css/dirent-list-item.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  dirent: PropTypes.object.isRequired,
  onItemClick: PropTypes.func.isRequired,
  freezeItem: PropTypes.func.isRequired,
  unfreezeItem: PropTypes.func.isRequired,
  onItemRenameToggle: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  showImagePopup: PropTypes.func.isRequired,
  currentRepoInfo: PropTypes.object,
  isRepoOwner: PropTypes.bool,
  isAdmin: PropTypes.bool.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  onItemMouseDown: PropTypes.func.isRequired,
  onItemContextMenu: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  activeDirent: PropTypes.object,
  getDirentItemMenuList: PropTypes.func.isRequired,
};

class DirentListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
      highlight: false,
      isZipDialogOpen: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isShareDialogShow: false,
      isMutipleOperation: false,
      isShowTagTooltip: false,
      isDragTipShow: false,
      isDropTipshow: false,
      isEditFileTagShow: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (!nextProps.isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: false,
      }, () => {
        if (nextProps.activeDirent && nextProps.activeDirent.name === nextProps.dirent.name) {
          this.setState({isOperationShow: true});
        }
      });
    }
  }

  //UI Interactive
  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
    this.setState({isDragTipShow: true});
  }

  onMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
    this.setState({isDragTipShow: true});
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: false,
      });
    }
    this.setState({isDragTipShow: false});
  }

  unfreezeItem = () => {
    this.setState({
      highlight: false,
      isOperationShow: false,
    });
    this.props.unfreezeItem();
  }

  //buiness handler
  onItemSelected = () => {
    this.props.onItemSelected(this.props.dirent);
  }

  onItemStarred = () => {
    let dirent = this.props.dirent;
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(dirent);

    if (dirent.starred) {
      seafileAPI.unstarItem(repoID, filePath).then(() => {
        this.props.updateDirent(this.props.dirent, 'starred', false);
      });
    } else {
      seafileAPI.starItem(repoID, filePath).then(() => {
        this.props.updateDirent(this.props.dirent, 'starred', true);
      });
    }
  }

  // on '<tr>'
  onDirentClick = (e) => {
    // '<td>' is clicked
    e.stopPropagation();
    if (e.target.tagName == 'TD') {
      this.props.onDirentClick(this.props.dirent);
    }
  }

  onItemClick = (e) => {
    e.preventDefault();

    const dirent = this.props.dirent;
    if (Utils.imageCheck(dirent.name)) {
      this.props.showImagePopup(dirent);
    } else {
      this.props.onItemClick(dirent);
    }
  }

  onItemDelete = (e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.props.onItemDelete(this.props.dirent);
  }

  onItemShare = (e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  }

  closeSharedDialog = () => {
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  }

  onMenuItemClick = (operation, event) => {
    switch(operation) {
      case 'Download': 
        this.onItemDownload(event);
        break;
      case 'Share':
        this.onItemShare(event);
        break;
      case 'Delete': 
        this.onItemDelete(event);
        break;
      case 'Rename':
        this.onItemRenameToggle();
        break;
      case 'Move':
        this.onItemMoveToggle();
        break;
      case 'Copy':
        this.onItemCopyToggle();
        break;
      case 'Tags':
        this.onEditFileTagToggle();
        break;
      case 'Permission':
        this.onPermissionItem();
        break;
      case 'Unlock':
        this.onUnlockItem();
        break;
      case 'Lock':
        this.onLockItem();
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

  onEditFileTagToggle = () => {
    this.setState({
      isEditFileTagShow: !this.state.isEditFileTagShow
    });
  }

  onFileTagChanged = () => {
    let direntPath = this.getDirentPath(this.props.dirent);
    this.props.onFileTagChanged(this.props.dirent, direntPath);
  }

  onItemRenameToggle = () => {
    this.props.onItemRenameToggle(this.props.dirent);
    this.setState({
      isOperationShow: false,
      isRenameing: true,
    });
  }

  onRenameConfirm = (newName) => {
    this.props.onItemRename(this.props.dirent, newName);
    this.onRenameCancel();
  }

  onRenameCancel = () => {
    this.setState({isRenameing: false});
    this.unfreezeItem();
  }

  onItemMoveToggle = () => {
    this.setState({isMoveDialogShow: !this.state.isMoveDialogShow});
  }

  onItemCopyToggle = () => {
    this.setState({isCopyDialogShow: !this.state.isCopyDialogShow});
  }

  onPermissionItem = () => {

  }

  onLockItem = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.lockfile(repoID, filePath).then(() => {
      this.props.updateDirent(this.props.dirent, 'is_locked', true);
      this.props.updateDirent(this.props.dirent, 'locked_by_me', true);
      let lockName = username.split('@');
      this.props.updateDirent(this.props.dirent, 'lock_owner_name', lockName[0]);
    });
  }
  
  onUnlockItem = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.unlockfile(repoID, filePath).then(() => {
      this.props.updateDirent(this.props.dirent, 'is_locked', false);
      this.props.updateDirent(this.props.dirent, 'locked_by_me', false);
      this.props.updateDirent(this.props.dirent, 'lock_owner_name', '');
    });
  }

  onComnentItem = () => {

  }

  onHistory = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let url = URLDecorator.getUrl({type: 'file_revisions', repoID: repoID, filePath: filePath});
    location.href = url;
  }

  onAccessLog = () => {

  }

  onOpenViaClient = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let url = URLDecorator.getUrl({type: 'open_via_client', repoID: repoID, filePath: filePath});
    location.href = url;
  }

  onItemDownload = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let dirent = this.props.dirent;
    let repoID = this.props.repoID;
    let direntPath = this.getDirentPath(dirent);
    if (dirent.type === 'dir') {
      this.setState({
        isZipDialogOpen: true
      });
    } else {
      let url = URLDecorator.getUrl({type: 'download_file_url', repoID: repoID, filePath: direntPath});
      location.href = url;
    }
  }

  closeZipDialog = () => {
    this.setState({
      isZipDialogOpen: false
    });
  }

  getDirentPath = (dirent) => {
    let path = this.props.path;
    return path === '/' ? path + dirent.name : path + '/' + dirent.name;
  }

  onTagTooltipToggle = (e) => {
    e.stopPropagation();
    this.setState({isShowTagTooltip: !this.state.isShowTagTooltip});
  }

  onItemMove = (destRepo, dirent, selectedPath, currentPath) => {
    this.props.onItemMove(destRepo, dirent, selectedPath, currentPath);
  }

  onItemDragStart = (e) => {
    let nodeRootPath = '';
    nodeRootPath = this.props.path === '/' ? `${this.props.path}${this.props.dirent.name}` : `${this.props.path}/${this.props.dirent.name}`;
    let dragStartItemData = {nodeDirent: this.props.dirent, nodeParentPath: this.props.path, nodeRootPath: nodeRootPath};
    dragStartItemData = JSON.stringify(dragStartItemData);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(this.refs.drag_icon, 15, 15);
    e.dataTransfer.setData('applicaiton/drag-item-info', dragStartItemData);
  }

  onItemDragEnter = () => {
    if (this.props.dirent.type === 'dir') {
      this.setState({isDropTipshow: true});
    }
  }
  
  onItemDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  onItemDragLeave = () => {
    this.setState({isDropTipshow: false});
  }

  onItemDragDrop = (e) => {
    this.setState({isDropTipshow: false});
    if (e.dataTransfer.files.length) { // uploaded files
      return;
    }
    let dragStartItemData = e.dataTransfer.getData('applicaiton/drag-item-info');
    dragStartItemData = JSON.parse(dragStartItemData);
    let {nodeDirent, nodeParentPath, nodeRootPath} = dragStartItemData;
    let dropItemData = this.props.dirent;

    if (nodeDirent.name === dropItemData.name) {
      return;
    }

    if (dropItemData.type !== 'dir') {
      return;
    } 

    //  copy the dirent to it's child. eg: A/B -> A/B/C
    if (dropItemData.type === 'dir' && nodeDirent.type === 'dir') {
      if (nodeParentPath !== this.props.path) {
        if (this.props.path.indexOf(nodeRootPath) !== -1) {
          return;
        }
      }
    }

    let selectedPath = Utils.joinPath(this.props.path, this.props.dirent.name);
    this.onItemMove(this.props.currentRepoInfo, nodeDirent, selectedPath, nodeParentPath);
  }

  onItemMouseDown = (event) => {
    this.props.onItemMouseDown(event);
  }

  onItemContextMenu = (event) => {
    let dirent = this.props.dirent;
    this.props.onItemContextMenu(event, dirent);
  }

  renderItemOperation = () => {
    let { dirent, selectedDirentList, currentRepoInfo } = this.props;
    if (currentRepoInfo.permission === 'cloud-edit' || currentRepoInfo.permission === 'preview') {
      return '';
    }

    let isShowShareBtn = (dirent.type === 'dir' && this.props.showShareBtn) || canGenerateShareLink;
    
    return (
      <Fragment>
        {selectedDirentList.length > 1 ? 
          <Fragment>
            {this.state.isOperationShow && !dirent.isSelected &&
              <div className="operations">
                <ul className="operation-group">
                  <li className="operation-group-item">
                    <i className="op-icon sf2-icon-download" title={gettext('Download')} onClick={this.onItemDownload}></i>
                  </li>
                  {isShowShareBtn &&
                  <li className="operation-group-item">
                    <i className="op-icon sf2-icon-share" title={gettext('Share')} onClick={this.onItemShare}></i>
                  </li>
                  }
                  <li className="operation-group-item">
                    <i className="op-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.onItemDelete}></i>
                  </li>
                  <li className="operation-group-item">
                    <ItemDropdownMenu
                      item={this.props.dirent}
                      toggleClass={'sf2-icon-caret-down'}
                      isHandleContextMenuEvent={true}
                      getMenuList={this.props.getDirentItemMenuList}
                      onMenuItemClick={this.onMenuItemClick}
                      unfreezeItem={this.unfreezeItem}
                      freezeItem={this.props.freezeItem}
                    />
                  </li>
                </ul>
              </div>
            }
          </Fragment> : 
          <Fragment>
            {this.state.isOperationShow && 
              <div className="operations">
                <ul className="operation-group">
                  <li className="operation-group-item">
                    <i className="op-icon sf2-icon-download" title={gettext('Download')} onClick={this.onItemDownload}></i>
                  </li>
                  {isShowShareBtn &&
                  <li className="operation-group-item">
                    <i className="op-icon sf2-icon-share" title={gettext('Share')} onClick={this.onItemShare}></i>
                  </li>
                  }
                  <li className="operation-group-item">
                    <i className="op-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.onItemDelete}></i>
                  </li>
                  <li className="operation-group-item">
                    <ItemDropdownMenu
                      item={this.props.dirent}
                      toggleClass={'sf2-icon-caret-down'}
                      isHandleContextMenuEvent={true}
                      getMenuList={this.props.getDirentItemMenuList}
                      onMenuItemClick={this.onMenuItemClick}
                      unfreezeItem={this.unfreezeItem}
                      freezeItem={this.props.freezeItem}
                    />
                  </li>
                </ul>
              </div>
            }
          </Fragment>
        }
      </Fragment>
    )
  }

  render() {
    let { path, dirent, activeDirent } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    let dirHref = '';
    if (this.props.currentRepoInfo) {
      dirHref = siteRoot + 'library/' + this.props.repoID + '/' + this.props.currentRepoInfo.repo_name + Utils.encodePath(direntPath);
    }
    let fileHref = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(direntPath);
    let toolTipID = MD5(dirent.name).slice(0, 7);
    let tagTitle = '';
    if (dirent.file_tags && dirent.file_tags.length > 0) {
      dirent.file_tags.forEach(item => {
        tagTitle += item.name + ' ';
      });
    }

    let iconUrl = Utils.getDirentIcon(dirent);

    let trClass = this.state.highlight ? 'tr-highlight ' : '';
    trClass += this.state.isDropTipshow ? 'tr-drop-effect' : '';
    trClass += (activeDirent && activeDirent.name === dirent.name)  ? 'tr-active' : '';
    trClass += dirent.isSelected? 'tr-active' : '';

    let lockedInfo = gettext('locked by {name}');
    lockedInfo = lockedInfo.replace('{name}', dirent.lock_owner_name);

    return (
      <Fragment>
        <tr 
          className={trClass} 
          draggable="true" 
          onMouseEnter={this.onMouseEnter} 
          onMouseOver={this.onMouseOver} 
          onMouseLeave={this.onMouseLeave} 
          onClick={this.onDirentClick} 
          onDragStart={this.onItemDragStart} 
          onDragEnter={this.onItemDragEnter} 
          onDragOver={this.onItemDragOver} 
          onDragLeave={this.onItemDragLeave} 
          onDrop={this.onItemDragDrop}
          onMouseDown={this.onItemMouseDown}
          onContextMenu={this.onItemContextMenu}
        >
          <td className={`pl10 ${this.state.isDragTipShow ? 'tr-drag-effect' : ''}`}>
            <input type="checkbox" className="vam" onChange={this.onItemSelected} checked={dirent.isSelected}/>
          </td>
          <td className="pl10">
            {dirent.starred !== undefined && !dirent.starred && <i className="far fa-star star-empty cursor-pointer" onClick={this.onItemStarred}></i>}
            {dirent.starred !== undefined && dirent.starred && <i className="fas fa-star cursor-pointer" onClick={this.onItemStarred}></i>}
          </td>
          <td className="pl10">
            <div className="dir-icon">
              {dirent.encoded_thumbnail_src ?
                <img ref='drag_icon' src={`${siteRoot}${dirent.encoded_thumbnail_src}`} className="thumbnail cursor-pointer" onClick={this.onItemClick} alt="" /> :
                <img ref='drag_icon' src={iconUrl} width="24" alt='' />
              }
              {dirent.is_locked && <img className="locked" src={mediaUrl + 'img/file-locked-32.png'} alt={gettext('locked')} title={lockedInfo}/>}
            </div>
          </td>
          <td className="name">
            {this.state.isRenameing ?
              <Rename hasSuffix={dirent.type !== 'dir'} name={dirent.name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel} /> :
              <a href={dirent.type === 'dir' ? dirHref : fileHref} onClick={this.onItemClick}>{dirent.name}</a>
            }
          </td>
          <td className="tag-list-title">
            {(dirent.type !== 'dir' && dirent.file_tags) && (
              <Fragment>
                <div id={`tag-list-title-${toolTipID}`} className="dirent-item tag-list tag-list-stacked">
                  {dirent.file_tags.map((fileTag, index) => {
                    let length = dirent.file_tags.length;
                    return (
                      <span className="file-tag" key={fileTag.id} style={{zIndex:length - index, backgroundColor:fileTag.color}}></span>
                    );
                  })}
                </div>
                <UncontrolledTooltip target={`tag-list-title-${toolTipID}`} placement="bottom">
                  {tagTitle}
                </UncontrolledTooltip>
              </Fragment>
            )} 
          </td>
          <td className="operation">{this.renderItemOperation()}</td>
          <td className="file-size">{dirent.size && dirent.size}</td>
          <td className="last-update">{dirent.mtime_relative}</td>
        </tr>
        {this.state.isMoveDialogShow &&
          <ModalPortal>
            <MoveDirentDialog
              path={this.props.path}
              repoID={this.props.repoID}
              dirent={this.props.dirent}
              isMutipleOperation={this.state.isMutipleOperation}
              onItemMove={this.props.onItemMove}
              onCancelMove={this.onItemMoveToggle}
              repoEncrypted={this.props.repoEncrypted}
            />
          </ModalPortal>
        }
        {this.state.isCopyDialogShow &&
          <ModalPortal>
            <CopyDirentDialog
              path={this.props.path}
              repoID={this.props.repoID}
              dirent={this.props.dirent}
              isMutipleOperation={this.state.isMutipleOperation}
              onItemCopy={this.props.onItemCopy}
              onCancelCopy={this.onItemCopyToggle}
              repoEncrypted={this.props.repoEncrypted}
            />
          </ModalPortal>
        }
        {this.state.isEditFileTagShow &&
          <EditFileTagDialog
            repoID={this.props.repoID}
            fileTagList={dirent.file_tags}
            filePath={direntPath}
            toggleCancel={this.onEditFileTagToggle}
            onFileTagChanged={this.onFileTagChanged}
          />
        }
        {this.state.isZipDialogOpen &&
          <ModalPortal>
            <ZipDownloadDialog
              repoID={this.props.repoID}
              path={this.props.path}
              target={this.props.dirent.name}
              toggleDialog={this.closeZipDialog}
            />
          </ModalPortal>
        }
        {this.state.isShareDialogShow &&
          <ModalPortal>
            <ShareDialog 
              itemType={dirent.type}
              itemName={dirent.name}
              itemPath={direntPath}
              userPerm={dirent.permission}
              repoID={this.props.repoID}
              repoEncrypted={false}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              toggleDialog={this.closeSharedDialog}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

DirentListItem.propTypes = propTypes;

export default DirentListItem;
