import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';
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
import EditFileTagPopover from '../popover/edit-filetag-popover';
import LibSubFolderPermissionDialog from '../dialog/lib-sub-folder-permission-dialog';
import toaster from '../toast';
import FileTag from './file-tag';

import '../../css/dirent-list-item.css';

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
  onItemConvert: PropTypes.func.isRequired,
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
  repoTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onShowDirentsDraggablePreview: PropTypes.func,
  loadDirentList: PropTypes.func,
};

class DirentListItem extends React.Component {

  constructor(props) {
    super(props);

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

    this.state = {
      isOperationShow: false,
      highlight: false,
      isZipDialogOpen: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isShareDialogShow: false,
      isMutipleOperation: false,
      canDrag: this.canDrag,
      isShowTagTooltip: false,
      isDragTipShow: false,
      isDropTipshow: false,
      isEditFileTagShow: false,
      isPermissionDialogOpen: false,
      isOpMenuOpen: false // for mobile
    };
    this.tagListTitleID = `tag-list-title-${uuidv4()}`;
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
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
  };

  //UI Interactive
  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
    if (this.state.canDrag) {
      this.setState({isDragTipShow: true});
    }
  };

  onMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
    if (this.state.canDrag) {
      this.setState({isDragTipShow: true});
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: false,
      });
    }
    this.setState({isDragTipShow: false});
  };

  unfreezeItem = () => {
    this.setState({
      highlight: false,
      isOperationShow: false,
    });
    this.props.unfreezeItem();
  };

  //buiness handler
  onItemSelected = () => {
    this.props.onItemSelected(this.props.dirent);
  };

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
  };

  // on '<tr>'
  onDirentClick = (e) => {
    // '<td>' is clicked
    e.stopPropagation();
    if (e.target.tagName == 'TD') {
      this.props.onDirentClick(this.props.dirent);
    }
  };

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
  };

  onItemDelete = (e) => {
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.props.onItemDelete(this.props.dirent);
  };

  onItemShare = (e) => {
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  };

  exportDocx = () => {
    const serviceUrl = window.app.config.serviceURL;
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let exportToDocxUrl = serviceUrl + '/repo/sdoc_export_to_docx/' + repoID + '/?file_path=' + filePath;
    window.location.href = exportToDocxUrl;
  };

  closeSharedDialog = () => {
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  };

  onMobileMenuItemClick = (e) => {
    const operation = e.target.getAttribute('data-op');
    this.onMenuItemClick(operation, e);
  };

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
      case 'Freeze Document':
        this.onFreezeDocument();
        break;
      case 'Convert to Markdown':
        this.onItemConvert(event, 'markdown');
        break;
      case 'Convert to docx':
        this.onItemConvert(event, 'docx');
        break;
      case 'Export docx':
        this.exportDocx();
        break;
      case 'Convert to sdoc':
        this.onItemConvert(event, 'sdoc');
        break;
      case 'History':
        this.onHistory();
        break;
      case 'Access Log':
        this.onAccessLog();
        break;
      case 'Properties':
        this.props.onDirentClick(this.props.dirent);
        this.props.showDirentDetail('info');
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
  };

  onItemConvert = (e, dstType)=> {
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.props.onItemConvert(this.props.dirent, dstType);
  };

  onEditFileTagToggle = () => {
    this.setState({
      isEditFileTagShow: !this.state.isEditFileTagShow
    });
  };

  onFileTagChanged = () => {
    let direntPath = this.getDirentPath(this.props.dirent);
    this.props.onFileTagChanged(this.props.dirent, direntPath);
  };

  onItemRenameToggle = () => {
    this.props.onItemRenameToggle(this.props.dirent);
    this.setState({
      isOperationShow: false,
      isRenameing: true,
      canDrag: false
    });
  };

  onRenameConfirm = (newName) => {
    this.props.onItemRename(this.props.dirent, newName);
    this.onRenameCancel();
  };

  onRenameCancel = () => {
    this.setState({
      isRenameing: false,
      canDrag: this.canDrag // set it back to the initial value
    });
    this.unfreezeItem();
  };

  onItemMoveToggle = () => {
    this.setState({isMoveDialogShow: !this.state.isMoveDialogShow});
  };

  onItemCopyToggle = () => {
    this.setState({isCopyDialogShow: !this.state.isCopyDialogShow});
  };

  onPermissionItem = () => {
    this.setState({isPermissionDialogOpen: !this.state.isPermissionDialogOpen});
  };

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
  };

  onFreezeDocument = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.lockfile(repoID, filePath, -1).then(() => {
      this.props.updateDirent(this.props.dirent, 'is_freezed', true);
      this.props.updateDirent(this.props.dirent, 'is_locked', true);
      this.props.updateDirent(this.props.dirent, 'locked_by_me', true);
      let lockName = username.split('@');
      this.props.updateDirent(this.props.dirent, 'lock_owner_name', lockName[0]);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

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
  };

  onHistory = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let url = URLDecorator.getUrl({type: 'file_revisions', repoID: repoID, filePath: filePath});
    location.href = url;
  };

  onAccessLog = () => {
    let filePath = this.getDirentPath(this.props.dirent);
    let path = siteRoot + 'repo/file-access/' + this.props.repoID + '/?p=' + encodeURIComponent(filePath) ;
    window.open(path);
  };

  onOpenViaClient = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let url = URLDecorator.getUrl({type: 'open_via_client', repoID: repoID, filePath: filePath});
    location.href = url;
  };

  onConvertWithONLYOFFICE = ()=> {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    seafileAPI.onlyofficeConvert(repoID, filePath).then(res => {
      this.props.loadDirentList(res.data.parent_dir);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

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
  };

  closeZipDialog = () => {
    this.setState({
      isZipDialogOpen: false
    });
  };

  getDirentPath = (dirent) => {
    let path = this.props.path;
    return path === '/' ? path + dirent.name : path + '/' + dirent.name;
  };

  onTagTooltipToggle = (e) => {
    e.stopPropagation();
    this.setState({isShowTagTooltip: !this.state.isShowTagTooltip});
  };

  onItemMove = (destRepo, dirent, selectedPath, currentPath) => {
    this.props.onItemMove(destRepo, dirent, selectedPath, currentPath);
  };

  onItemDragStart = (e) => {
    if (Utils.isIEBrower() || !this.state.canDrag) {
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
  };

  onItemDragEnter = (e) => {
    if (Utils.isIEBrower() || !this.state.canDrag) {
      return false;
    }
    if (this.props.dirent.type === 'dir') {
      e.stopPropagation();
      this.setState({isDropTipshow: true});
    }
  };

  onItemDragOver = (e) => {
    if (Utils.isIEBrower() || !this.state.canDrag) {
      return false;
    }
    if (e.dataTransfer.dropEffect === 'copy') {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  onItemDragLeave = (e) => {
    if (Utils.isIEBrower() || !this.state.canDrag) {
      return false;
    }

    if (this.props.dirent.type === 'dir') {
      e.stopPropagation();
    }
    this.setState({isDropTipshow: false});
  };

  onItemDragDrop = (e) => {
    if (Utils.isIEBrower() || !this.state.canDrag) {
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
  };

  onItemMouseDown = (event) => {
    this.props.onItemMouseDown(event);
  };

  onItemContextMenu = (event) => {
    let dirent = this.props.dirent;
    this.props.onItemContextMenu(event, dirent);
  };

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
                {(dirent.permission === 'rw' || dirent.permission === 'cloud-edit' || (isCustomPermission && canDelete)) && (
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
                {(dirent.permission === 'rw' || dirent.permission === 'cloud-edit' || (isCustomPermission && canDelete)) && (
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
  };

  render() {
    let { path, dirent, activeDirent } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    let dirHref = '';
    if (this.props.currentRepoInfo) {
      dirHref = siteRoot + 'library/' + this.props.repoID + '/' + this.props.currentRepoInfo.repo_name + Utils.encodePath(direntPath);
    }
    let fileHref = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(direntPath);
    if (dirent.is_sdoc_revision && dirent.revision_id) {
      fileHref = siteRoot + 'lib/' + this.props.repoID + '/revisions/' + dirent.revision_id + '/';
    }

    let iconUrl = Utils.getDirentIcon(dirent);

    let trClass = this.state.highlight ? 'tr-highlight ' : '';
    trClass += this.state.isDropTipshow ? 'tr-drop-effect' : '';
    trClass += (activeDirent && activeDirent.name === dirent.name)  ? 'tr-active' : '';
    trClass += dirent.isSelected? 'tr-active' : '';

    let lockedInfo = dirent.is_freezed ? gettext('Frozen by {name}'): gettext('locked by {name}');
    lockedInfo = lockedInfo.replace('{name}', dirent.lock_owner_name);

    const isDesktop = Utils.isDesktop();
    const { canDrag } = this.state;
    const lockedImageUrl = `${mediaUrl}img/file-${dirent.is_freezed ? 'freezed-32.svg' : 'locked-32.png'}`;
    const lockedMessage = dirent.is_freezed ? gettext('freezed') : gettext('locked');
    const desktopItem = (
      <tr
        className={trClass}
        draggable={canDrag}
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
            {dirent.is_locked && <img className="locked" src={lockedImageUrl} alt={lockedMessage} title={lockedInfo}/>}
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
            </Fragment>
          )}
        </td>
        <td className="tag-list-title">
          {(dirent.type !== 'dir' && dirent.file_tags && dirent.file_tags.length > 0) && (
            <div id={this.tagListTitleID} className="dirent-item tag-list tag-list-stacked">
              {dirent.file_tags.map((fileTag, index) => {
                return (
                  <FileTag fileTag={fileTag} length={dirent.file_tags.length} key={index} index={index}/>
                );
              })}
            </div>
          )}
          {(dirent.type !== 'dir' && (!dirent.file_tags || dirent.file_tags.length == 0)) && (
            <div id={this.tagListTitleID} className="dirent-item tag-list tag-list-stacked"></div>
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
            {dirent.is_locked && <img className="locked" src={lockedImageUrl} alt={lockedMessage} title={lockedInfo}/>}
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
              title={gettext('More operations')}
              aria-label={gettext('More operations')}
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
        <MediaQuery query="(min-width: 768px)">
          {this.state.isEditFileTagShow &&
            <EditFileTagPopover
              repoID={this.props.repoID}
              repoTags={this.props.repoTags}
              fileTagList={dirent.file_tags}
              filePath={direntPath}
              toggleCancel={this.onEditFileTagToggle}
              onFileTagChanged={this.onFileTagChanged}
              target={this.tagListTitleID}
              isEditFileTagShow={this.state.isEditFileTagShow}
            />
          }
        </MediaQuery>
        <MediaQuery query="(max-width: 767.8px)">
          {this.state.isEditFileTagShow &&
            <EditFileTagDialog
              repoID={this.props.repoID}
              repoTags={this.props.repoTags}
              fileTagList={dirent.file_tags}
              filePath={direntPath}
              toggleCancel={this.onEditFileTagToggle}
              onFileTagChanged={this.onFileTagChanged}
            />
          }
        </MediaQuery>
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
