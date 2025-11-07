import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { DropdownItem } from 'reactstrap';
import { gettext, siteRoot, mediaUrl, username, enableVideoThumbnail, enablePDFThumbnail } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import { imageThumbnailCenter, videoThumbnailCenter } from '../../utils/thumbnail-center';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import Rename from '../rename';
import toaster from '../toast';
import MobileItemMenu from '../../components/mobile-item-menu';
import OpIcon from '../../components/op-icon';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import { Dirent } from '../../models';
import { formatUnixWithTimezone } from '../../utils/time';
import Icon from '../icon';

import '../../css/dirent-list-item.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  dirent: PropTypes.object.isRequired,
  eventBus: PropTypes.object.isRequired,
  onItemClick: PropTypes.func.isRequired,
  freezeItem: PropTypes.func.isRequired,
  unfreezeItem: PropTypes.func.isRequired,
  onItemRenameToggle: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemConvert: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  showImagePopup: PropTypes.func.isRequired,
  currentRepoInfo: PropTypes.object,
  isRepoOwner: PropTypes.bool,
  isAdmin: PropTypes.bool.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
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

    let { dirent } = this.props;
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
      dirent,
      isOperationShow: false,
      highlight: false,
      canDrag: this.canDrag,
      isShowTagTooltip: false,
      isDragTipShow: false,
      isDropTipShow: false,
    };
    this.isGeneratingThumbnail = false;
    this.thumbnailCenter = null;
    this.dragIconRef = null;
    this.emptyContentRef = null;
  }

  componentDidMount() {
    const { repoID, path } = this.props;
    const { dirent } = this.state;
    if (this.checkGenerateThumbnail(dirent)) {
      this.isGeneratingThumbnail = true;
      this.thumbnailCenter.createThumbnail({
        repoID,
        path: [path, dirent.name].join('/'),
        callback: this.updateDirentThumbnail,
      });
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.dirent && this.state.dirent) {
      if (nextProps.dirent.name !== this.state.dirent.name) {
        this.setState({
          dirent: nextProps.dirent,
        }, () => {
          if (this.checkGenerateThumbnail(nextProps.dirent)) {
            const { repoID, path } = nextProps;
            this.isGeneratingThumbnail = true;
            this.thumbnailCenter.createThumbnail({
              repoID,
              path: [path, nextProps.dirent.name].join('/'),
              callback: this.updateDirentThumbnail,
            });
          }
        });
      }

      if (
        nextProps.dirent.is_locked !== this.state.dirent.is_locked ||
        nextProps.dirent.isSelected !== this.state.dirent.isSelected ||
        nextProps.dirent.starred !== this.state.dirent.starred
      ) {
        this.setState({ dirent: nextProps.dirent });
      }
    }
  }

  componentDidUpdate(prevProps) {
    const { isItemFreezed, activeDirent, dirent } = this.props;

    if (prevProps.isItemFreezed !== isItemFreezed && !isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: activeDirent && activeDirent.name === dirent.name,
      });
    }
  }

  componentWillUnmount() {
    if (this.isGeneratingThumbnail) {
      const { dirent } = this.state;
      const { repoID, path } = this.props;
      this.thumbnailCenter.cancelThumbnail({
        repoID,
        path: [path, dirent.name].join('/'),
      });
      this.thumbnailCenter = null;
    }
    this.setState = () => {};
  }

  checkGenerateThumbnail = (dirent) => {
    if (this.props.repoEncrypted || dirent.encoded_thumbnail_src) {
      return false;
    }
    if (enableVideoThumbnail && Utils.videoCheck(dirent.name)) {
      this.thumbnailCenter = videoThumbnailCenter;
      return true;
    }
    if (Utils.imageCheck(dirent.name) || (enablePDFThumbnail && Utils.pdfCheck(dirent.name))) {
      this.thumbnailCenter = imageThumbnailCenter;
      return true;
    }
    return false;
  };

  updateDirentThumbnail = (encoded_thumbnail_src) => {
    this.isGeneratingThumbnail = false;
    let dirent = this.state.dirent;
    dirent.encoded_thumbnail_src = encoded_thumbnail_src;
    this.setState({ dirent });
  };

  // UI Interactive
  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: true,
        isOperationShow: true,
      });
    }
    if (this.state.canDrag) {
      this.setState({ isDragTipShow: true });
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
      this.setState({ isDragTipShow: true });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        highlight: false,
        isOperationShow: false,
      });
    }
    this.setState({ isDragTipShow: false });
  };

  unfreezeItem = () => {
    this.setState({
      highlight: false,
      isOperationShow: false,
    });
    this.props.unfreezeItem();
  };

  // buiness handler
  onItemSelected = (event) => {
    event.stopPropagation();
    this.props.onItemSelected(this.state.dirent, event);
  };

  onItemStarred = () => {
    const { dirent } = this.state;
    const { repoID } = this.props;
    const filePath = this.getDirentPath(dirent);
    const itemName = dirent.name;

    if (dirent.starred) {
      seafileAPI.unstarItem(repoID, filePath).then(() => {
        this.props.updateDirent(dirent, 'starred', false);
        const msg = gettext('Successfully unstarred {name_placeholder}.')
          .replace('{name_placeholder}', itemName);
        toaster.success(msg);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.starItem(repoID, filePath).then(() => {
        this.props.updateDirent(dirent, 'starred', true);
        const msg = gettext('Successfully starred {name_placeholder}.')
          .replace('{name_placeholder}', itemName);
        toaster.success(msg);
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
      this.props.onDirentClick(this.state.dirent, e);
    }
  };

  onItemClick = (e) => {
    e.preventDefault();
    const dirent = this.state.dirent;
    if (this.state.isRenaming) {
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
    e.nativeEvent.stopImmediatePropagation(); // for document event
    this.props.onItemDelete(this.state.dirent);
  };

  exportDocx = () => {
    const serviceUrl = window.app.config.serviceURL;
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.state.dirent);
    let exportToDocxUrl = serviceUrl + '/repo/sdoc_export_to_docx/' + repoID + '/?file_path=' + filePath;
    window.location.href = exportToDocxUrl;
  };

  exportSdoc = () => {
    const serviceUrl = window.app.config.serviceURL;
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.state.dirent);
    let exportToSdocUrl = serviceUrl + '/lib/' + repoID + '/file/' + filePath + '?dl=1';
    window.location.href = exportToSdocUrl;
  };

  onMobileMenuItemClick = (e) => {
    const operation = e.target.getAttribute('data-op');
    this.onMenuItemClick(operation, e);
  };

  onMenuItemClick = (operation, event) => {
    switch (operation) {
      case 'Download':
        this.onItemDownload(event);
        break;
      case 'Share':
        this.onItemShare();
        break;
      case 'Delete':
        this.onItemDelete(event);
        break;
      case 'Rename':
        this.onItemRenameToggle();
        break;
      case 'Move':
        this.onItemMove();
        break;
      case 'Copy':
        this.onItemCopy();
        break;
      case 'Permission':
        this.onPermission();
        break;
      case 'Unlock':
        this.onUnlockItem();
        break;
      case 'Lock':
        this.onLockItem();
        break;
      case 'Unfreeze Document':
        this.onUnlockItem();
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
      case 'Export sdoc':
        this.exportSdoc();
        break;
      case 'Convert to sdoc':
        this.onItemConvert(event, 'sdoc');
        break;
      case 'History':
        this.onHistory();
        break;
      case 'Access Log':
        this.openFileAccessLog();
        break;
      case 'Properties':
        this.props.onDirentClick(this.state.dirent);
        this.props.showDirentDetail('info');
        break;
      case 'Open via Client':
        this.onOpenViaClient();
        break;
      case 'Convert with ONLYOFFICE':
        this.onConvertWithONLYOFFICE();
        break;
      case 'Star':
        this.onItemStarred();
        break;
      case 'Unstar':
        this.onItemStarred();
        break;
      default:
        break;
    }
  };

  onItemConvert = (e, dstType) => {
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation(); // for document event
    this.props.onItemConvert(this.state.dirent, dstType);
  };

  onFileTagChanged = () => {
    let direntPath = this.getDirentPath(this.state.dirent);
    this.props.onFileTagChanged(this.state.dirent, direntPath);
  };

  onItemRenameToggle = () => {
    this.props.onItemRenameToggle(this.state.dirent);
    this.setState({
      isOperationShow: false,
      isRenaming: true,
      canDrag: false
    });
  };

  onRenameConfirm = (newName) => {
    this.props.onItemRename(this.state.dirent, newName);
    this.onRenameCancel();
  };

  onRenameCancel = () => {
    this.setState({
      isRenaming: false,
      canDrag: this.canDrag // set it back to the initial value
    });
    this.unfreezeItem();
  };

  onPermission = () => {
    const { path, eventBus } = this.props;
    const { dirent } = this.state;
    const direntPath = Utils.joinPath(path, dirent.name);
    const name = Utils.getFileName(direntPath);
    eventBus.dispatch(EVENT_BUS_TYPE.PERMISSION, direntPath, name);
  };

  openFileAccessLog = () => {
    const { path, eventBus } = this.props;
    const { dirent } = this.state;
    const direntPath = Utils.joinPath(path, dirent.name);
    eventBus.dispatch(EVENT_BUS_TYPE.ACCESS_LOG, direntPath, dirent.name);
  };

  onLockItem = () => {
    let repoID = this.props.repoID;
    let dirent = this.state.dirent;
    let filePath = this.getDirentPath(dirent);
    seafileAPI.lockfile(repoID, filePath).then(() => {
      this.props.updateDirent(dirent, 'is_locked', true);
      this.props.updateDirent(dirent, 'locked_by_me', true);
      let lockName = username.split('@');
      this.props.updateDirent(dirent, 'lock_owner_name', lockName[0]);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onFreezeDocument = () => {
    let repoID = this.props.repoID;
    let dirent = this.state.dirent;
    let filePath = this.getDirentPath(dirent);
    seafileAPI.lockfile(repoID, filePath, -1).then(() => {
      this.props.updateDirent(dirent, 'is_freezed', true);
      this.props.updateDirent(dirent, 'is_locked', true);
      this.props.updateDirent(dirent, 'locked_by_me', true);
      let lockName = username.split('@');
      this.props.updateDirent(dirent, 'lock_owner_name', lockName[0]);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onUnlockItem = () => {
    let repoID = this.props.repoID;
    let dirent = this.state.dirent;
    let filePath = this.getDirentPath(dirent);
    seafileAPI.unlockfile(repoID, filePath).then(() => {
      this.props.updateDirent(dirent, 'is_locked', false);
      this.props.updateDirent(dirent, 'locked_by_me', false);
      this.props.updateDirent(dirent, 'lock_owner_name', '');
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onHistory = () => {
    let filePath = this.getDirentPath(this.state.dirent);
    let url = URLDecorator.getUrl({ type: 'file_revisions', repoID: this.props.repoID, filePath: filePath });
    location.href = url;
  };

  onOpenViaClient = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.state.dirent);
    let url = URLDecorator.getUrl({ type: 'open_via_client', repoID: repoID, filePath: filePath });
    location.href = url;
  };

  onConvertWithONLYOFFICE = () => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.state.dirent);
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
    const { path, eventBus } = this.props;
    const { dirent } = this.state;
    const direntList = dirent instanceof Dirent ? [dirent.toJson()] : [dirent];
    eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_FILE, path, direntList);
  };

  onItemMove = () => {
    const { path, eventBus } = this.props;
    const { dirent } = this.state;
    eventBus.dispatch(EVENT_BUS_TYPE.MOVE_FILE, path, dirent, false);
  };

  onItemCopy = () => {
    const { path, eventBus } = this.props;
    const { dirent } = this.state;
    eventBus.dispatch(EVENT_BUS_TYPE.COPY_FILE, path, dirent, false);
  };

  onItemShare = () => {
    const { path, eventBus } = this.props;
    const dirent = this.state.dirent;
    const direntPath = Utils.joinPath(path, dirent.name);
    eventBus.dispatch(EVENT_BUS_TYPE.SHARE_FILE, direntPath, dirent);
  };

  getDirentPath = (dirent) => {
    let path = this.props.path;
    return path === '/' ? path + dirent.name : path + '/' + dirent.name;
  };

  onTagTooltipToggle = (e) => {
    e.stopPropagation();
    this.setState({ isShowTagTooltip: !this.state.isShowTagTooltip });
  };

  onItemDragStart = (e) => {
    if (Utils.isIEBrowser() || !this.state.canDrag) {
      return false;
    }
    e.dataTransfer.effectAllowed = 'move';
    let { selectedDirentList } = this.props;
    if (selectedDirentList.length > 0 && selectedDirentList.includes(this.state.dirent)) { // drag items and selectedDirentList include item
      this.props.onShowDirentsDraggablePreview();
      e.dataTransfer.setDragImage(this.emptyContentRef, 0, 0); // Show an empty content
      let selectedList = selectedDirentList.map(item => {
        let nodeRootPath = this.getDirentPath(item);
        let dragStartItemData = { nodeDirent: item, nodeParentPath: this.props.path, nodeRootPath: nodeRootPath };
        return dragStartItemData;
      });
      selectedList = JSON.stringify(selectedList);
      e.dataTransfer.setData('application/drag-item-info', selectedList);
      return ;
    }

    if (e.dataTransfer && e.dataTransfer.setDragImage) {
      e.dataTransfer.setDragImage(this.dragIconRef, 15, 15);
    }

    let nodeRootPath = this.getDirentPath(this.state.dirent);
    let dragStartItemData = { nodeDirent: this.state.dirent, nodeParentPath: this.props.path, nodeRootPath: nodeRootPath };
    dragStartItemData = JSON.stringify(dragStartItemData);

    e.dataTransfer.setData('application/drag-item-info', dragStartItemData);
  };

  onItemDragEnter = (e) => {
    if (Utils.isIEBrowser() || !this.state.canDrag) {
      return false;
    }
    if (this.state.dirent.type === 'dir') {
      e.stopPropagation();
      this.setState({ isDropTipShow: true });
    }
  };

  onItemDragOver = (e) => {
    if (Utils.isIEBrowser() || !this.state.canDrag) {
      return false;
    }
    if (e.dataTransfer.dropEffect === 'copy') {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  onItemDragLeave = (e) => {
    if (Utils.isIEBrowser() || !this.state.canDrag) {
      return false;
    }

    if (this.state.dirent.type === 'dir') {
      e.stopPropagation();
    }
    this.setState({ isDropTipShow: false });
  };

  onItemDragDrop = (e) => {
    if (Utils.isIEBrowser() || !this.state.canDrag) {
      return false;
    }
    this.setState({ isDropTipShow: false });
    if (e.dataTransfer.files.length) { // uploaded files
      return;
    }
    if (this.state.dirent.type === 'dir') {
      e.stopPropagation();
    } else {
      return;
    }
    let dragStartItemData = e.dataTransfer.getData('application/drag-item-info');
    dragStartItemData = JSON.parse(dragStartItemData);
    if (Array.isArray(dragStartItemData)) { // move items
      let direntPaths = dragStartItemData.map(draggedItem => {
        return draggedItem.nodeRootPath;
      });

      let selectedPath = Utils.joinPath(this.props.path, this.state.dirent.name);

      if (direntPaths.some(direntPath => { return direntPath === selectedPath;})) { // eg; A/B, A/C --> A/B
        return;
      }

      this.props.onItemsMove(this.props.currentRepoInfo, selectedPath);
      return ;
    }

    let { nodeDirent, nodeParentPath, nodeRootPath } = dragStartItemData;
    let dropItemData = this.state.dirent;

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

    let selectedPath = Utils.joinPath(this.props.path, this.state.dirent.name);
    this.props.onItemMove(this.props.currentRepoInfo, nodeDirent, selectedPath, nodeParentPath);
  };

  onItemMouseDown = (event) => {
    this.props.onItemMouseDown(event);
  };

  onItemContextMenu = (event) => {
    this.props.onItemContextMenu(event, this.state.dirent);
  };

  getDirentHref = () => {
    let { path, repoID } = this.props;
    let dirent = this.state.dirent;
    let direntPath = Utils.joinPath(path, dirent.name);
    let dirHref = '';
    if (this.props.currentRepoInfo) {
      dirHref = siteRoot + 'library/' + repoID + '/' + this.props.currentRepoInfo.repo_name + Utils.encodePath(direntPath);
    }
    let fileHref = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(direntPath);
    if (dirent.is_sdoc_revision && dirent.revision_id) {
      fileHref = siteRoot + 'lib/' + repoID + '/revisions/' + dirent.revision_id + '/';
    }
    return dirent.type === 'dir' ? dirHref : fileHref;
  };

  renderItemOperation = () => {
    let { selectedDirentList } = this.props;
    let dirent = this.state.dirent;
    let canDownload = true;
    let canDelete = true;
    const { isCustomPermission, customPermission } = this;
    if (isCustomPermission) {
      const { permission } = customPermission;
      canDownload = permission.download;
      canDelete = permission.delete;
    }

    return (
      <>
        {selectedDirentList.length > 1 ?
          <>
            {this.state.isOperationShow && !dirent.isSelected &&
              <div className="operations d-flex align-items-center">
                {(dirent.permission === 'rw' || dirent.permission === 'r' || (isCustomPermission && canDownload)) && (
                  <OpIcon
                    className="op-icon"
                    symbol="download"
                    title={gettext('Download')}
                    op={this.onItemDownload}
                  />
                )}
                {(dirent.permission === 'rw' || dirent.permission === 'cloud-edit' || (isCustomPermission && canDelete)) && (
                  <OpIcon
                    className="op-icon"
                    symbol="delete1"
                    title={gettext('Delete')}
                    op={this.onItemDelete}
                  />
                )}
                <ItemDropdownMenu
                  toggleClass="op-icon"
                  toggleChildren={<Icon symbol="more-level" />}
                  item={this.state.dirent}
                  isHandleContextMenuEvent={true}
                  getMenuList={this.props.getDirentItemMenuList}
                  onMenuItemClick={this.onMenuItemClick}
                  unfreezeItem={this.unfreezeItem}
                  freezeItem={this.props.freezeItem}
                />
              </div>
            }
          </> :
          <>
            {this.state.isOperationShow &&
              <div className="operations d-flex align-items-center">
                {(dirent.permission === 'rw' || dirent.permission === 'r' || (isCustomPermission && canDownload)) && (
                  <OpIcon
                    className="op-icon"
                    symbol="download"
                    title={gettext('Download')}
                    op={this.onItemDownload}
                  />
                )}
                {(dirent.permission === 'rw' || dirent.permission === 'cloud-edit' || (isCustomPermission && canDelete)) && (
                  <OpIcon
                    className="op-icon"
                    symbol="delete1"
                    title={gettext('Delete')}
                    op={this.onItemDelete}
                  />
                )}
                <ItemDropdownMenu
                  toggleClass="op-icon"
                  toggleChildren={<Icon symbol="more-level" />}
                  item={this.state.dirent}
                  isHandleContextMenuEvent={true}
                  getMenuList={this.props.getDirentItemMenuList}
                  onMenuItemClick={this.onMenuItemClick}
                  unfreezeItem={this.unfreezeItem}
                  freezeItem={this.props.freezeItem}
                />
              </div>
            }
          </>
        }
      </>
    );
  };

  render() {
    let dirent = this.state.dirent;

    let iconUrl = Utils.getDirentIcon(dirent);

    let isSelected = dirent.isSelected;

    let lockedInfo = dirent.is_freezed ? gettext('Frozen by {name}') : gettext('locked by {name}');
    lockedInfo = lockedInfo.replace('{name}', dirent.lock_owner_name);

    const isDesktop = Utils.isDesktop();
    const { canDrag } = this.state;
    const lockedImageUrl = `${mediaUrl}img/file-${dirent.is_freezed ? 'freezed-32.svg' : 'locked-32.png'}`;
    const lockedMessage = dirent.is_freezed ? gettext('freezed') : gettext('locked');

    return (
      <>
        {isDesktop ?
          <tr
            className={classnames(
              { 'tr-highlight': this.state.highlight },
              { 'tr-drop-effect': this.state.isDropTipShow },
              { 'tr-active': isSelected },
            )}
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
            <td className={classnames('pl10 pr-2 cursor-pointer', { 'tr-drag-effect': this.state.isDragTipShow })}>
              <input
                type="checkbox"
                className="vam cursor-pointer"
                style={{ position: 'relative', top: -1 }}
                checked={isSelected}
                aria-label={isSelected ? gettext('Unselect this item') : gettext('Select this item')}
                title={isSelected ? gettext('Unselect this item') : gettext('Select this item')}
                onChange={() => {}}
                onClick={this.onItemSelected}
                onKeyDown={Utils.onKeyDown}
              />
            </td>
            <td className="pl-2 pr-2">
              {dirent.starred !== undefined &&
                <OpIcon
                  className="star-icon"
                  symbol={dirent.starred ? 'starred' : 'star-empty'}
                  title={dirent.starred ? gettext('Unstar') : gettext('Star')}
                  op={this.onItemStarred}
                />
              }
            </td>
            <td className="pl-2 pr-2">
              <div className="dir-icon">
                {(this.canPreview && dirent.encoded_thumbnail_src) ?
                  <img
                    ref={ref => this.dragIconRef = ref}
                    src={`${siteRoot}${dirent.encoded_thumbnail_src}?mtime=${dirent.mtime}`}
                    alt={dirent.name}
                    className="thumbnail cursor-pointer"
                    tabIndex="0"
                    onClick={this.onItemClick}
                    onKeyDown={Utils.onKeyDown}
                    draggable={false}
                  /> :
                  <img ref={ref => this.dragIconRef = ref} src={iconUrl} width="24" alt='' draggable={false} />
                }
                {dirent.is_locked && <img className="locked" src={lockedImageUrl} alt={lockedMessage} title={lockedInfo} draggable={false} />}
                <div ref={ref => this.emptyContentRef = ref} className="empty-content"></div>
              </div>
            </td>
            <td className="name">
              {this.state.isRenaming &&
                <Rename
                  hasSuffix={dirent.type !== 'dir'}
                  name={dirent.name}
                  onRenameConfirm={this.onRenameConfirm}
                  onRenameCancel={this.onRenameCancel}
                />
              }
              {!this.state.isRenaming && (
                <>
                  {(!dirent.isDir() && !this.canPreview) ?
                    <a className="sf-link" onClick={this.onItemClick}>{dirent.name}</a> :
                    <a href={this.getDirentHref()} onClick={this.onItemClick}>{dirent.name}</a>
                  }
                </>
              )}
            </td>
            <td className="tag-list-title">&nbsp;
            </td>
            <td className="operation">{this.renderItemOperation()}</td>
            <td className="file-size">{dirent.size || ''}</td>
            <td className="last-update" title={formatUnixWithTimezone(dirent.mtime)}>{dirent.mtime_relative}</td>
          </tr>
          :
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
              {this.state.isRenaming &&
                <Rename
                  hasSuffix={dirent.type !== 'dir'}
                  name={dirent.name}
                  onRenameConfirm={this.onRenameConfirm}
                  onRenameCancel={this.onRenameCancel}
                />
              }
              {!this.state.isRenaming && (
                <>
                  {(!dirent.isDir() && !this.canPreview) ?
                    <a className="sf-link">{dirent.name}</a> :
                    <a href={this.getDirentHref()}>{dirent.name}</a>
                  }
                </>
              )}
              <br />
              {dirent.size && <span className="item-meta-info">{dirent.size}</span>}
              <span className="item-meta-info">{dirent.mtime_relative}</span>
            </td>
            <td>
              <MobileItemMenu>
                {dirent.starred !== undefined &&
                <DropdownItem className="mobile-menu-item" onClick={this.onItemStarred}>
                  {dirent.starred ? gettext('Unstar') : gettext('Star')}
                </DropdownItem>
                }
                {this.props.getDirentItemMenuList(dirent, true)
                  .filter(item => item != 'Divider' && item.key != 'Open via Client')
                  .map((item, index) => {
                    return (
                      <DropdownItem
                        className="mobile-menu-item"
                        key={index}
                        data-op={item.key}
                        onClick={this.onMobileMenuItemClick}
                      >
                        {item.value}
                      </DropdownItem>
                    );
                  })}
              </MobileItemMenu>
            </td>
          </tr>
        }
      </>
    );
  }
}

DirentListItem.propTypes = propTypes;

export default DirentListItem;
