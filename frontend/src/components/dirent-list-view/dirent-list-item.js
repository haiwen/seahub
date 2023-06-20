import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MD5 from 'MD5';
import moment from 'moment';
import { UncontrolledTooltip } from 'reactstrap';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, siteRoot, mediaUrl, username, useGoFileserver, fileServerRoot } from '../../utils/constants';
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
import LibSubFolderPermissionDialog from '../dialog/lib-sub-folder-permission-dialog';

import '../../css/dirent-list-item.css';
import toaster from '../toast';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
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
  onFileTagChanged: PropTypes.func,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onShowDirentsDraggablePreview: PropTypes.func,
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
      isPermissionDialogOpen: false,
      isOpMenuOpen: false // for mobile
    };

    const { dirent } = this.props;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(dirent.permission);
    this.isCustomPermission = isCustomPermission;
    this.customPermission = customPermission;
    this.canPreview = true;
    this.canDrag = dirent.permission === 'rw';
    if (isCustomPermission) {
      const { preview, modify } = customPermission.permission;
      this.canPreview = preview || modify;
      this.canDrag = modify;
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.isItemFreezed !== this.props.isItemFreezed && !nextProps.isItemFreezed) {
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

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  }

  //UI Interactive
  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
    if (this.canDrag) {
      this.setState({isDragTipShow: true});
    }
  }

  onMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
    if (this.canDrag) {
      this.setState({isDragTipShow: true});
    }
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

  onItemStarred = (e) => {
    let dirent = this.props.dirent;
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(dirent);

    e.preventDefault();

    if (dirent.starred) {
      seafileAPI.unstarItem(repoID, filePath).then(() => {
        this.props.updateDirent(this.props.dirent, 'starred', false);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.starItem(repoID, filePath).then(() => {
        this.props.updateDirent(this.props.dirent, 'starred', true);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
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
    if (this.state.isRenameing) {
      return;
    }

    if (dirent.isDir()) {
      this.props.onItemClick(dirent);
      return;
    }

    if (!this.canPreview) {
      return;
    }

    if (Utils.imageCheck(dirent.name)) {
      this.props.showImagePopup(dirent);
    } else {
      this.props.onItemClick(dirent);
    }
  }

  onItemDelete = (e) => {
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.props.onItemDelete(this.props.dirent);
  }

  onItemShare = (e) => {
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  }

  closeSharedDialog = () => {
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  }

  onMobileMenuItemClick = (e) => {
    const operation = e.target.getAttribute('data-op');
    this.onMenuItemClick(operation, e);
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
      case 'Mask as draft':
        this.onMaskAsDraft();
        break;
      case 'Unmask as draft':
        this.onUnmaskAsDraft();
        break;
      case 'Comment':
        this.props.onDirentClick(this.props.dirent);
        this.props.showDirentDetail('comments');
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
      case 'Convert with ONLYOFFICE':
        this.onConvertWithONLYOFFICE();
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
    this.setState({isPermissionDialogOpen: !this.state.isPermissionDialogOpen});
  }

  onLockItem = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.lockfile(repoID, filePath).then(() => {
      this.props.updateDirent(this.props.dirent, 'is_locked', true);
      this.props.updateDirent(this.props.dirent, 'locked_by_me', true);
      let lockName = username.split('@');
      this.props.updateDirent(this.props.dirent, 'lock_owner_name', lockName[0]);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onUnlockItem = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.unlockfile(repoID, filePath).then(() => {
      this.props.updateDirent(this.props.dirent, 'is_locked', false);
      this.props.updateDirent(this.props.dirent, 'locked_by_me', false);
      this.props.updateDirent(this.props.dirent, 'lock_owner_name', '');
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onMaskAsDraft = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.sdocMaskAsDraft(repoID, filePath).then((res) => {
      this.props.updateDirent(this.props.dirent, 'is_sdoc_draft', true);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onUnmaskAsDraft = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.sdocUnmaskAsDraft(repoID, filePath).then((res) => {
      this.props.updateDirent(this.props.dirent, 'is_sdoc_draft', false);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onHistory = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let url = URLDecorator.getUrl({type: 'file_revisions', repoID: repoID, filePath: filePath});
    location.href = url;
  }

  onAccessLog = () => {
    let filePath = this.getDirentPath(this.props.dirent);
    let path = siteRoot + 'repo/file-access/' + this.props.repoID + '/?p=' + encodeURIComponent(filePath) ;
    window.open(path);
  }

  onOpenViaClient = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let url = URLDecorator.getUrl({type: 'open_via_client', repoID: repoID, filePath: filePath});
    location.href = url;
  }

  onConvertWithONLYOFFICE = ()=> {

    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent)

    seafileAPI.onlyofficeConvert(repoID, filePath).then(res => {
      this.props.loadDirentList(res.data.parent_dir)
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onItemDownload = (e) => {
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    let dirent = this.props.dirent;
    let repoID = this.props.repoID;
    let direntPath = this.getDirentPath(dirent);
    if (dirent.type === 'dir') {
      if (!useGoFileserver) {
        this.setState({
          isZipDialogOpen: true
        });
      } else {
        seafileAPI.zipDownload(repoID, this.props.path, this.props.dirent.name).then((res) => {
          const zipToken = res.data['zip_token'];
          location.href = `${fileServerRoot}zip/${zipToken}`;
        }).catch((error) => {
          let errorMsg = Utils.getErrorMsg(error);
          this.setState({
            isLoading: false,
            errorMsg: errorMsg
          });
        });
      }
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
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    e.dataTransfer.effectAllowed = 'move';
    let { selectedDirentList } = this.props;
    if (selectedDirentList.length > 0 && selectedDirentList.includes(this.props.dirent)) { // drag items and selectedDirentList include item
      this.props.onShowDirentsDraggablePreview();
      e.dataTransfer.setDragImage(this.refs.empty_content, 0, 0); // Show an empty content
      let selectedList =  selectedDirentList.map(item => {
        let nodeRootPath = this.getDirentPath(item);
        let dragStartItemData = {nodeDirent: item, nodeParentPath: this.props.path, nodeRootPath: nodeRootPath};
        return dragStartItemData;
      });
      selectedList = JSON.stringify(selectedList);
      e.dataTransfer.setData('applicaiton/drag-item-info', selectedList);
      return ;
    }

    if (e.dataTransfer && e.dataTransfer.setDragImage) {
      e.dataTransfer.setDragImage(this.refs.drag_icon, 15, 15);
    }

    let nodeRootPath = this.getDirentPath(this.props.dirent);
    let dragStartItemData = {nodeDirent: this.props.dirent, nodeParentPath: this.props.path, nodeRootPath: nodeRootPath};
    dragStartItemData = JSON.stringify(dragStartItemData);

    e.dataTransfer.setData('applicaiton/drag-item-info', dragStartItemData);
  }

  onItemDragEnter = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    if (this.props.dirent.type === 'dir') {
      e.stopPropagation();
      this.setState({isDropTipshow: true});
    }
  }

  onItemDragOver = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    if (e.dataTransfer.dropEffect === 'copy') {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  onItemDragLeave = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }

    if (this.props.dirent.type === 'dir') {
      e.stopPropagation();
    }
    this.setState({isDropTipshow: false});
  }

  onItemDragDrop = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    this.setState({isDropTipshow: false});
    if (e.dataTransfer.files.length) { // uploaded files
      return;
    }
    if (this.props.dirent.type === 'dir') {
      e.stopPropagation();
    } else {
      return;
    }
    let dragStartItemData = e.dataTransfer.getData('applicaiton/drag-item-info');
    dragStartItemData = JSON.parse(dragStartItemData);
    if (Array.isArray(dragStartItemData)) { //move items
      let direntPaths =  dragStartItemData.map(draggedItem => {
        return draggedItem.nodeRootPath;
      });

      let selectedPath = Utils.joinPath(this.props.path, this.props.dirent.name);

      if (direntPaths.some(direntPath => { return direntPath === selectedPath;})) { //eg; A/B, A/C --> A/B
        return;
      }

      this.props.onItemsMove(this.props.currentRepoInfo, selectedPath);
      return ;
    }

    let { nodeDirent, nodeParentPath, nodeRootPath } = dragStartItemData;
    let dropItemData = this.props.dirent;

    if (nodeDirent.name === dropItemData.name) {
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
    let { dirent, currentRepoInfo, selectedDirentList } = this.props;
    let canDownload = true;
    let canDelete = true;
    const { isCustomPermission, customPermission } = this;
    if (isCustomPermission) {
      const { permission } = customPermission;
      canDownload = permission.download;
      canDelete = permission.delete;
    }

    // https://dev.seafile.com/seahub/lib/d6f300e7-bb2b-4722-b83e-cf45e370bfbc/file/seaf-server%20%E5%8A%9F%E8%83%BD%E8%AE%BE%E8%AE%A1/%E6%9D%83%E9%99%90%E7%9B%B8%E5%85%B3/%E8%B5%84%E6%96%99%E5%BA%93%E6%9D%83%E9%99%90%E8%A7%84%E8%8C%83.md
    let showShareBtn = Utils.isHasPermissionToShare(currentRepoInfo, dirent.permission, dirent);

    return (
      <Fragment>
        {selectedDirentList.length > 1 ?
          <Fragment>
            {this.state.isOperationShow && !dirent.isSelected &&
              <div className="operations">
                {(dirent.permission === 'rw' || dirent.permission === 'r' || (isCustomPermission && canDownload)) && (
                  <a href="#" className="op-icon sf2-icon-download" title={gettext('Download')} role="button" aria-label={gettext('Download')} onClick={this.onItemDownload}></a>
                )}
                {showShareBtn && (
                  <a href="#" className="op-icon sf2-icon-share" title={gettext('Share')} role="button" aria-label={gettext('Share')} onClick={this.onItemShare}></a>
                )}
                {(dirent.permission === 'rw' || (isCustomPermission && canDelete)) && (
                  <a href="#" className="op-icon sf2-icon-delete" title={gettext('Delete')} role="button" aria-label={gettext('Delete')} onClick={this.onItemDelete}></a>
                )}
                <ItemDropdownMenu
                  item={this.props.dirent}
                  toggleClass={'sf2-icon-caret-down'}
                  isHandleContextMenuEvent={true}
                  getMenuList={this.props.getDirentItemMenuList}
                  onMenuItemClick={this.onMenuItemClick}
                  unfreezeItem={this.unfreezeItem}
                  freezeItem={this.props.freezeItem}
                />
              </div>
            }
          </Fragment> :
          <Fragment>
            {this.state.isOperationShow &&
              <div className="operations">
                {(dirent.permission === 'rw' || dirent.permission === 'r' || (isCustomPermission && canDownload)) && (
                  <a href="#" className="op-icon sf2-icon-download" title={gettext('Download')} role="button" aria-label={gettext('Download')} onClick={this.onItemDownload}></a>
                )}
                {showShareBtn && (
                  <a href="#" className="op-icon sf2-icon-share" title={gettext('Share')} role="button" aria-label={gettext('Share')} onClick={this.onItemShare}></a>
                )}
                {(dirent.permission === 'rw' || (isCustomPermission && canDelete)) && (
                  <a href="#" className="op-icon sf2-icon-delete" title={gettext('Delete')} role="button" aria-label={gettext('Delete')} onClick={this.onItemDelete}></a>
                )}
                <ItemDropdownMenu
                  item={this.props.dirent}
                  toggleClass={'sf2-icon-caret-down'}
                  isHandleContextMenuEvent={true}
                  getMenuList={this.props.getDirentItemMenuList}
                  onMenuItemClick={this.onMenuItemClick}
                  unfreezeItem={this.unfreezeItem}
                  freezeItem={this.props.freezeItem}
                />
              </div>
            }
          </Fragment>
        }
      </Fragment>
    );
  }

  render() {
    let { path, dirent, activeDirent } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    let dirHref = '';
    if (this.props.currentRepoInfo) {
      dirHref = siteRoot + 'library/' + this.props.repoID + '/' + this.props.currentRepoInfo.repo_name + Utils.encodePath(direntPath);
    }
    let fileHref = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(direntPath);

    let toolTipID = '';
    let tagTitle = '';
    if (dirent.file_tags && dirent.file_tags.length > 0) {
      toolTipID = MD5(dirent.name).slice(0, 7);
      tagTitle = dirent.file_tags.map(item => item.name).join(' ');
    }

    let iconUrl = Utils.getDirentIcon(dirent);

    let trClass = this.state.highlight ? 'tr-highlight ' : '';
    trClass += this.state.isDropTipshow ? 'tr-drop-effect' : '';
    trClass += (activeDirent && activeDirent.name === dirent.name)  ? 'tr-active' : '';
    trClass += dirent.isSelected? 'tr-active' : '';

    let lockedInfo = gettext('locked by {name}').replace('{name}', dirent.lock_owner_name);

    const isDesktop = Utils.isDesktop();
    const desktopItem = (
      <tr
        className={trClass}
        draggable={this.canDrag}
        onFocus={this.onMouseEnter}
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
          {dirent.starred !== undefined &&
          <a href="#" role="button" aria-label={dirent.starred ? gettext('Unstar') : gettext('Star')} onClick={this.onItemStarred}>
            <i className={`fa-star ${dirent.starred ? 'fas' : 'far star-empty'}`}></i>
          </a>
          }
        </td>
        <td className="pl10">
          <div className="dir-icon">
            {(this.canPreview && dirent.encoded_thumbnail_src) ?
              <img ref='drag_icon' src={`${siteRoot}${dirent.encoded_thumbnail_src}`} className="thumbnail cursor-pointer" onClick={this.onItemClick} alt="" /> :
              <img ref='drag_icon' src={iconUrl} width="24" alt='' />
            }
            {dirent.is_locked && <img className="locked" src={mediaUrl + 'img/file-locked-32.png'} alt={gettext('locked')} title={lockedInfo}/>}
            <div ref="empty_content" style={{position: 'absolute', width: '1px', height: '1px'}}></div>
          </div>
        </td>
        <td className="name">
          {this.state.isRenameing && <Rename hasSuffix={dirent.type !== 'dir'} name={dirent.name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel} />}
          {!this.state.isRenameing && (
            <Fragment>
              {(!dirent.isDir() && !this.canPreview) ? 
                <a className="sf-link" onClick={this.onItemClick}>{dirent.name}</a> :
                <a href={dirent.type === 'dir' ? dirHref : fileHref} onClick={this.onItemClick}>{dirent.name}</a>
              }
              {(Utils.isSdocFile(dirent.name) && dirent.is_sdoc_draft) &&
                <span className="pl-1">{'(draft)'}</span>
              }
            </Fragment>
          )}
        </td>
        <td className="tag-list-title">
          {(dirent.type !== 'dir' && dirent.file_tags && dirent.file_tags.length > 0) && (
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
        <td className="last-update" title={moment.unix(dirent.mtime).format('llll')}>{dirent.mtime_relative}</td>
      </tr>
    );
    const mobileItem = (
      <tr>
        <td onClick={this.onItemClick}>
          <div className="dir-icon">
            {(this.canPreview && dirent.encoded_thumbnail_src) ?
              <img src={`${siteRoot}${dirent.encoded_thumbnail_src}`} className="thumbnail cursor-pointer" alt="" /> :
              <img src={iconUrl} width="24" alt="" />
            }
            {dirent.is_locked && <img className="locked" src={mediaUrl + 'img/file-locked-32.png'} alt={gettext('locked')} title={lockedInfo}/>}
          </div>
        </td>
        <td onClick={this.onItemClick}>
          {this.state.isRenameing && <Rename hasSuffix={dirent.type !== 'dir'} name={dirent.name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel} /> }
          {!this.state.isRenameing && (
            <Fragment>
              {(!dirent.isDir() && !this.canPreview) ?
                <a className="sf-link">{dirent.name}</a> :
                <a href={dirent.type === 'dir' ? dirHref : fileHref}>{dirent.name}</a>
              }
            </Fragment>
          )}
          <br />
          {dirent.size && <span className="item-meta-info">{dirent.size}</span>}
          <span className="item-meta-info">{dirent.mtime_relative}</span>
        </td>
        <td>
          <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
            <DropdownToggle
              tag="i"
              className="sf-dropdown-toggle fa fa-ellipsis-v ml-0"
              title={gettext('More Operations')}
              data-toggle="dropdown"
              aria-expanded={this.state.isOpMenuOpen}
            />
            <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
              <div className="mobile-operation-menu-bg-layer"></div>
              <div className="mobile-operation-menu">
                {dirent.starred !== undefined &&
                <DropdownItem className="mobile-menu-item" onClick={this.onItemStarred}>{dirent.starred ? gettext('Unstar') : gettext('Star')}</DropdownItem>}
                {this.props.getDirentItemMenuList(dirent, true).map((item, index) => {
                  if (item != 'Divider' && item.key != 'Open via Client') {
                    return (
                      <DropdownItem className="mobile-menu-item" key={index} data-op={item.key} onClick={this.onMobileMenuItemClick}>{item.value}</DropdownItem>
                    );
                  } else {
                    return null;
                  }
                })}
              </div>
            </div>
          </Dropdown>
        </td>
      </tr>
    );

    return (
      <Fragment>
        {isDesktop ? desktopItem : mobileItem}
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
              repoEncrypted={this.props.repoEncrypted}
              enableDirPrivateShare={this.props.enableDirPrivateShare}
              isGroupOwnedRepo={this.props.isGroupOwnedRepo}
              toggleDialog={this.closeSharedDialog}
            />
          </ModalPortal>
        }
        {this.state.isPermissionDialogOpen &&
          <ModalPortal>
            <LibSubFolderPermissionDialog
              toggleDialog={this.onPermissionItem}
              repoID={this.props.repoID}
              folderPath={direntPath}
              folderName={dirent.name}
              isDepartmentRepo={this.props.isGroupOwnedRepo}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

DirentListItem.propTypes = propTypes;

export default DirentListItem;
