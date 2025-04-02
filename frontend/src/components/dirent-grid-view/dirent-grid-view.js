import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, username, enableSeadoc, thumbnailDefaultSize, thumbnailSizeForOriginal, gettext, fileServerRoot, enableWhiteboard, useGoFileserver, enableExcalidraw } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import Loading from '../loading';
import ModalPortal from '../modal-portal';
import ImageDialog from '../dialog/image-dialog';
import DirentGridItem from '../../components/dirent-grid-view/dirent-grid-item';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, showMenu } from '../context-menu/actions';
import TextTranslation from '../../utils/text-translation';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';
import ShareDialog from '../dialog/share-dialog';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import Rename from '../../components/dialog/rename-dirent';
import CreateFile from '../dialog/create-file-dialog';
import CreateFolder from '../dialog/create-folder-dialog';
import LibSubFolderPermissionDialog from '../dialog/lib-sub-folder-permission-dialog';
import toaster from '../toast';
import imageAPI from '../../utils/image-api';
import FileAccessLog from '../dialog/file-access-log';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import EmptyTip from '../empty-tip';

import '../../css/grid-view.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object,
  direntList: PropTypes.array.isRequired,
  fullDirentList: PropTypes.array,
  selectedDirentList: PropTypes.array.isRequired,
  onSelectedDirentListUpdate: PropTypes.func.isRequired,
  onAddFile: PropTypes.func,
  onItemDelete: PropTypes.func,
  onItemCopy: PropTypes.func.isRequired,
  onItemConvert: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string, // current path's user permission
  enableDirPrivateShare: PropTypes.bool.isRequired,
  updateDirent: PropTypes.func.isRequired,
  onGridItemClick: PropTypes.func,
  repoTags: PropTypes.array.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  posX: PropTypes.number,
  posY: PropTypes.number,
  dirent: PropTypes.object,
  getMenuContainerSize: PropTypes.func,
  eventBus: PropTypes.object,
};

const DIRENT_GRID_CONTAINER_MENU_ID = 'dirent-grid-container-menu';
const GRID_ITEM_CONTEXTMENU_ID = 'grid-item-contextmenu';
const DIRENTS_MENU_ID = 'dirents-menu';

class DirentGridView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isImagePopupOpen: false,
      imageItems: [],
      imageIndex: 0,
      // onmenuClick
      isFileAccessLogDialogOpen: false,
      isShareDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isZipDialogOpen: false,
      isRenameDialogShow: false,
      isCreateFolderDialogShow: false,
      isCreateFileDialogShow: false,
      fileType: '',
      isPermissionDialogOpen: false,

      isMultipleOperation: true,
      isGridItemFreezed: false,
      activeDirent: null,
      downloadItems: [],

      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      selectedItemsList: [],
      isSelecting: false,
      isMouseDown: false,
      autoScrollInterval: null,
    };
    this.containerRef = React.createRef();
    this.isRepoOwner = props.currentRepoInfo.owner_email === username;
  }

  componentDidMount() {
    window.addEventListener('mouseup', this.onGlobalMouseUp);
    this.unsubscribeEvent = this.props.eventBus.subscribe(EVENT_BUS_TYPE.RESTORE_IMAGE, this.recalculateImageItems);
  }

  recalculateImageItems = () => {
    if (!this.state.isImagePopupOpen) return;
    let imageItems = this.props.direntList
      .filter((item) => Utils.imageCheck(item.name))
      .map((item) => this.prepareImageItem(item));

    this.setState({
      imageItems: imageItems,
      imageIndex: this.state.imageIndex % imageItems.length,
    });
  };

  componentWillUnmount() {
    window.removeEventListener('mouseup', this.onGlobalMouseUp);
    this.unsubscribeEvent();
  }

  onGridContainerMouseDown = (event) => {
    if (event.button === 2) {
      return;
    } else if (event.button === 0) {
      hideMenu();
      this.props.onGridItemClick(null);
      if (event.target.closest('img') || event.target.closest('div.grid-file-name')) return;

      const containerBounds = this.containerRef.current.getBoundingClientRect();
      this.setState({
        startPoint: { x: event.clientX - containerBounds.left, y: event.clientY - containerBounds.top },
        endPoint: { x: event.clientX - containerBounds.left, y: event.clientY - containerBounds.top },
        selectedItemsList: [],
        isSelecting: false,
        isMouseDown: true,
      });
    }
  };

  onSelectMouseMove = (e) => {
    if (!this.state.isMouseDown) return;

    const containerBounds = this.containerRef.current.getBoundingClientRect();
    const endPoint = { x: e.clientX - containerBounds.left, y: e.clientY - containerBounds.top };

    // Constrain endPoint within the container bounds
    endPoint.x = Math.max(0, Math.min(endPoint.x, containerBounds.width));
    endPoint.y = Math.max(0, Math.min(endPoint.y, containerBounds.height));

    // Check if the mouse has moved a certain distance to start selection, prevents accidental selections
    const distance = Math.sqrt(
      Math.pow(endPoint.x - this.state.startPoint.x, 2) +
      Math.pow(endPoint.y - this.state.startPoint.y, 2)
    );
    if (distance > 5) {
      this.setState({
        isSelecting: true,
        endPoint: endPoint,
      }, () => {
        this.determineSelectedItems();
        this.autoScroll(e.clientY);

        const selectedItemNames = new Set(this.state.selectedItemsList.map(item => item.lastChild.lastChild.title));
        const filteredDirentList = this.props.direntList
          .filter(dirent => selectedItemNames.has(dirent.name))
          .map(dirent => ({ ...dirent, isSelected: true }));

        this.props.onSelectedDirentListUpdate(filteredDirentList);
      });
    }
  };

  onGlobalMouseUp = () => {
    if (!this.state.isMouseDown) return;
    clearInterval(this.state.autoScrollInterval);
    this.setState({
      isSelecting: false,
      isMouseDown: false,
      autoScrollInterval: null,
    });
  };

  determineSelectedItems = () => {
    const { startPoint, endPoint } = this.state;
    const container = this.containerRef.current;
    const items = container.querySelectorAll('.grid-item');

    const selectionRect = {
      left: Math.min(startPoint.x, endPoint.x),
      top: Math.min(startPoint.y, endPoint.y),
      right: Math.max(startPoint.x, endPoint.x),
      bottom: Math.max(startPoint.y, endPoint.y),
    };

    const newSelectedItemsList = [];

    items.forEach(item => {
      const bounds = item.getBoundingClientRect();
      const relativeBounds = {
        left: bounds.left - container.getBoundingClientRect().left,
        top: bounds.top - container.getBoundingClientRect().top,
        right: bounds.right - container.getBoundingClientRect().left,
        bottom: bounds.bottom - container.getBoundingClientRect().top,
      };

      // Check if the element is within the selection box's bounds
      if (relativeBounds.left < selectionRect.right && relativeBounds.right > selectionRect.left &&
        relativeBounds.top < selectionRect.bottom && relativeBounds.bottom > selectionRect.top) {
        newSelectedItemsList.push(item);
      }
    });
    this.setState({ selectedItemsList: newSelectedItemsList });
  };

  autoScroll = (mouseY) => {
    const container = this.containerRef.current;
    const containerBounds = container.getBoundingClientRect();
    const scrollSpeed = 10;
    const scrollThreshold = 20;

    const updateEndPoint = () => {
      const endPoint = {
        x: this.state.endPoint.x,
        y: mouseY - containerBounds.top + container.scrollTop,
      };
      this.setState({ endPoint }, () => {
        this.determineSelectedItems();
      });
    };

    if (mouseY < containerBounds.top + scrollThreshold) {
      // Scroll Up
      if (!this.state.autoScrollInterval) {
        const interval = setInterval(() => {
          container.scrollTop -= scrollSpeed;
          updateEndPoint();
        }, 50);
        this.setState({ autoScrollInterval: interval });
      }
    } else if (mouseY > containerBounds.bottom - scrollThreshold) {
      // Scroll Down
      if (!this.state.autoScrollInterval) {
        const interval = setInterval(() => {
          container.scrollTop += scrollSpeed;
          updateEndPoint();
        }, 50);
        this.setState({ autoScrollInterval: interval });
      }
    } else {
      clearInterval(this.state.autoScrollInterval);
      this.setState({ autoScrollInterval: null });
    }
  };

  onCreateFileToggle = (fileType) => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: fileType || ''
    });
  };

  onGridItemClick = (dirent, event) => {
    hideMenu();
    if (this.state.activeDirent !== dirent) {
      this.setState({ activeDirent: dirent });
    }
    this.props.onGridItemClick(dirent, event);
  };

  onMoveToggle = () => {
    this.setState({ isMoveDialogShow: !this.state.isMoveDialogShow });
  };

  onCopyToggle = () => {
    this.setState({ isCopyDialogShow: !this.state.isCopyDialogShow });
  };

  onAddFolder = (dirPath) => {
    this.setState({ isCreateFolderDialogShow: false });
    this.props.onAddFolder(dirPath);
  };

  onItemShare = (e) => {
    e.nativeEvent.stopImmediatePropagation(); // for document event
    this.setState({ isShareDialogShow: !this.state.isShareDialogShow });
  };

  closeSharedDialog = () => {
    this.setState({ isShareDialogShow: !this.state.isShareDialogShow });
  };

  onItemDelete = (currentObject, e) => {
    e.nativeEvent.stopImmediatePropagation(); // for document event
    if (this.props.selectedDirentList.length === 1) {
      this.props.onItemDelete(currentObject);
      return;
    } else {
      this.props.onItemsDelete();
    }
  };

  onItemConvert = (currentObject, e, dstType) => {
    e.nativeEvent.stopImmediatePropagation(); // for document event
    this.props.onItemConvert(currentObject, dstType);
  };

  exportDocx = () => {
    const serviceUrl = window.app.config.serviceURL;
    let dirent = this.state.activeDirent ? this.state.activeDirent : '';
    if (!dirent) {
      return;
    }
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(dirent);
    window.location.href = serviceUrl + '/repo/sdoc_export_to_docx/' + repoID + '/?file_path=' + filePath;
  };

  exportSdoc = () => {
    const serviceUrl = window.app.config.serviceURL;
    let dirent = this.state.activeDirent ? this.state.activeDirent : '';
    if (!dirent) {
      return;
    }
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(dirent);
    window.location.href = serviceUrl + '/lib/' + repoID + '/file/' + filePath + '?dl=1';
  };

  onMenuItemClick = (operation, currentObject, event) => {
    hideMenu();
    switch (operation) {
      case 'Download':
        this.onItemsDownload();
        break;
      case 'Share':
        this.onItemShare(event);
        break;
      case 'Delete':
        this.onItemDelete(currentObject, event);
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
      case 'Unfreeze Document':
        this.onUnlockItem(currentObject);
        break;
      case 'Freeze Document':
        this.onFreezeDocument(currentObject);
        break;
      case 'Convert to Markdown':
        this.onItemConvert(currentObject, event, 'markdown');
        break;
      case 'Convert to docx':
        this.onItemConvert(currentObject, event, 'docx');
        break;
      case 'Export docx':
        this.exportDocx();
        break;
      case 'Export sdoc':
        this.exportSdoc();
        break;
      case 'Convert to sdoc':
        this.onItemConvert(currentObject, event, 'sdoc');
        break;
      case 'Permission':
        this.onPermissionItem();
        break;
      case 'Unlock':
        this.onUnlockItem(currentObject);
        break;
      case 'Lock':
        this.onLockItem(currentObject);
        break;
      case 'History':
        this.onHistory(currentObject);
        break;
      case 'New Folder':
        this.onCreateFolderToggle(currentObject);
        break;
      case 'New File':
        this.onCreateFileToggle('');
        break;
      case 'New Markdown File':
        this.onCreateFileToggle('.md');
        break;
      case 'New Excel File':
        this.onCreateFileToggle('.xlsx');
        break;
      case 'New PowerPoint File':
        this.onCreateFileToggle('.pptx');
        break;
      case 'New Word File':
        this.onCreateFileToggle('.docx');
        break;
      case 'New Whiteboard File':
        this.onCreateFileToggle('.draw');
        break;
      case 'New Excalidraw File':
        this.onCreateFileToggle('.exdraw');
        break;
      case 'New SeaDoc File':
        this.onCreateFileToggle('.sdoc');
        break;
      case 'Access Log':
        this.toggleFileAccessLogDialog();
        break;
      case 'Properties':
        this.props.showDirentDetail('info');
        break;
      case 'Open via Client':
        this.onOpenViaClient(currentObject);
        break;
      default:
        break;
    }
  };

  onDirentsMenuItemClick = (operation) => {
    switch (operation) {
      case 'Move':
        this.onMoveToggle();
        break;
      case 'Copy':
        this.onCopyToggle();
        break;
      case 'Download':
        this.onItemsDownload();
        break;
      case 'Delete':
        this.props.onItemsDelete();
        break;
      default:
        break;
    }

    hideMenu();
  };

  getDirentPath = (dirent) => {
    let path = this.props.path;
    return path === '/' ? path + dirent.name : path + '/' + dirent.name;
  };

  closeZipDialog = () => {
    this.setState({
      isZipDialogOpen: false
    });
  };

  onItemsDownload = () => {
    let { path, repoID, selectedDirentList } = this.props;
    if (selectedDirentList.length === 1 && !selectedDirentList[0].isDir()) {
      let direntPath = Utils.joinPath(path, selectedDirentList[0].name);
      let url = URLDecorator.getUrl({ type: 'download_file_url', repoID: repoID, filePath: direntPath });
      location.href = url;
      return;
    }

    let selectedDirentNames = selectedDirentList.map(dirent => {
      return dirent.name;
    });

    if (useGoFileserver) {
      seafileAPI.zipDownload(repoID, path, selectedDirentNames).then((res) => {
        const zipToken = res.data['zip_token'];
        location.href = `${fileServerRoot}zip/${zipToken}`;
      }).catch((error) => {
        let errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
    } else {
      this.setState({
        isZipDialogOpen: true,
        downloadItems: selectedDirentNames
      });
    }
  };

  onCreateFolderToggle = () => {
    this.setState({
      isCreateFolderDialogShow: !this.state.isCreateFolderDialogShow,
    });
  };

  onItemRenameToggle = () => {
    this.setState({
      isRenameDialogShow: !this.state.isRenameDialogShow,
    });
  };

  onItemMoveToggle = () => {
    this.setState({ isMoveDialogShow: !this.state.isMoveDialogShow });
  };

  onItemCopyToggle = () => {
    this.setState({ isCopyDialogShow: !this.state.isCopyDialogShow });
  };

  onPermissionItem = () => {
    this.setState({ isPermissionDialogOpen: !this.state.isPermissionDialogOpen });
  };

  handleError = (error) => {
    toaster.danger(Utils.getErrorMsg(error));
  };

  onLockItem = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    seafileAPI.lockfile(repoID, filePath).then(() => {
      this.props.updateDirent(currentObject, 'is_locked', true);
      this.props.updateDirent(currentObject, 'locked_by_me', true);
      let lockName = username.split('@');
      this.props.updateDirent(currentObject, 'lock_owner_name', lockName[0]);
    }).catch(error => {
      this.handleError(error);
    });
  };

  onFreezeDocument = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    seafileAPI.lockfile(repoID, filePath, -1).then(() => {
      this.props.updateDirent(currentObject, 'is_freezed', true);
      this.props.updateDirent(currentObject, 'is_locked', true);
      this.props.updateDirent(currentObject, 'locked_by_me', true);
      let lockName = username.split('@');
      this.props.updateDirent(currentObject, 'lock_owner_name', lockName[0]);
    }).catch(error => {
      this.handleError(error);
    });
  };

  onUnlockItem = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    seafileAPI.unlockfile(repoID, filePath).then(() => {
      this.props.updateDirent(currentObject, 'is_locked', false);
      this.props.updateDirent(currentObject, 'locked_by_me', false);
      this.props.updateDirent(currentObject, 'lock_owner_name', '');
    }).catch(error => {
      this.handleError(error);
    });
  };

  onHistory = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    let url = URLDecorator.getUrl({ type: 'file_revisions', repoID: repoID, filePath: filePath });
    location.href = url;
  };

  toggleFileAccessLogDialog = () => {
    this.setState({
      isFileAccessLogDialogOpen: !this.state.isFileAccessLogDialogOpen
    });
  };

  onOpenViaClient = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    let url = URLDecorator.getUrl({ type: 'open_via_client', repoID: repoID, filePath: filePath });
    location.href = url;
  };

  onItemRename = (newName) => {
    this.props.onItemRename(this.state.activeDirent, newName);
  };

  prepareImageItem = (item) => {
    const { path: parentDir, repoID, currentRepoInfo } = this.props;
    const { name, mtime, id } = item;
    const repoEncrypted = currentRepoInfo.encrypted;
    const path = Utils.encodePath(Utils.joinPath(parentDir, name));
    const cacheBuster = new Date().getTime();
    const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();

    let thumbnail = '';
    const isGIF = fileExt === 'gif';
    if (repoEncrypted || isGIF) {
      thumbnail = `${siteRoot}repo/${repoID}/raw${path}?t=${cacheBuster}`;
    } else {
      thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}?mtime=${mtime}`;
    }

    let src = '';
    const isTIFF = fileExt == 'tiff';
    if (isTIFF) {
      src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}?mtime=${mtime}`;
    } else {
      src = `${siteRoot}repo/${repoID}/raw${path}`;
    }

    return {
      id,
      name,
      thumbnail,
      src,
      parentDir,
      'url': `${siteRoot}lib/${repoID}/file${path}`,
      'downloadURL': `${fileServerRoot}repos/${repoID}/files${path}?op=download`,
    };
  };

  showImagePopup = (curItem) => {
    let items = this.props.fullDirentList.filter((item) => {
      return Utils.imageCheck(item.name);
    });

    const imageItems = items.map((item) => {
      return this.prepareImageItem(item);
    });

    this.setState({
      isImagePopupOpen: true,
      imageItems: imageItems,
      imageIndex: items.indexOf(curItem)
    });
  };

  closeImagePopup = () => {
    this.setState({ isImagePopupOpen: false });
  };

  moveToPrevImage = () => {
    const imageItemsLength = this.state.imageItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + imageItemsLength - 1) % imageItemsLength
    }));
  };

  moveToNextImage = () => {
    const imageItemsLength = this.state.imageItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + 1) % imageItemsLength
    }));
  };

  deleteImage = (name) => {
    const item = this.props.fullDirentList.find((item) => item.name === name);
    this.props.onItemDelete(item);

    const newImageItems = this.props.fullDirentList
      .filter((item) => item.name !== name && Utils.imageCheck(item.name))
      .map((item) => this.prepareImageItem(item));

    this.setState((prevState) => ({
      isImagePopupOpen: newImageItems.length > 0,
      imageItems: newImageItems,
      imageIndex: prevState.imageIndex % newImageItems.length,
    }));
  };

  rotateImage = (imageIndex, angle) => {
    if (imageIndex >= 0 && angle !== 0) {
      let { repoID } = this.props;
      let imageName = this.state.imageItems[imageIndex].name;
      let path = Utils.joinPath(this.props.path, imageName);
      imageAPI.rotateImage(repoID, path, 360 - angle).then((res) => {
        seafileAPI.createThumbnail(repoID, path, thumbnailDefaultSize).then((res) => {
          // Generate a unique query parameter to bust the cache
          const cacheBuster = new Date().getTime();
          const newThumbnailSrc = `${res.data.encoded_thumbnail_src}?t=${cacheBuster}`;
          this.setState((prevState) => {
            const updatedImageItems = [...prevState.imageItems];
            updatedImageItems[imageIndex].thumbnail = newThumbnailSrc;
            return { imageItems: updatedImageItems };
          });
          // Update the thumbnail URL with the cache-busting query parameter
          const item = this.props.direntList.find((item) => item.name === imageName);
          this.props.updateDirent(item, ['encoded_thumbnail_src', 'mtime'], [newThumbnailSrc, cacheBuster]);
          this.props.updateTreeNode(path, ['encoded_thumbnail_src', 'mtime'], [newThumbnailSrc, cacheBuster]);
        }).catch(error => {
          this.handleError(error);
        });
      }).catch(error => {
        this.handleError(error);
      });
    }
  };

  checkDuplicatedName = (newName) => {
    return Utils.checkDuplicatedNameInList(this.props.direntList, newName);
  };

  onGridItemMouseDown = (event) => {
    event.stopPropagation();
    if (event.button === 2) {
      return;
    }
  };

  gridContainerClick = (event) => {
    event.stopPropagation();
    hideMenu();
  };

  onGridContainerContextMenu = (event) => {
    event.preventDefault();
    const hasCustomPermission = (action) => {
      const { isCustomPermission, customPermission } = Utils.getUserPermission(this.props.userPerm);
      if (isCustomPermission) {
        return customPermission.permission[action];
      }
      return true;
    };

    if (!['admin', 'rw'].includes(this.props.userPerm)) return;

    const {
      NEW_FOLDER,
      NEW_FILE,
      NEW_MARKDOWN_FILE,
      NEW_EXCEL_FILE,
      NEW_POWERPOINT_FILE,
      NEW_WORD_FILE,
      NEW_SEADOC_FILE,
      NEW_TLDRAW_FILE,
      NEW_EXCALIDRAW_FILE
    } = TextTranslation;

    let direntsContainerMenuList = [
      NEW_FOLDER, NEW_FILE, 'Divider',
    ];
    const { currentRepoInfo, selectedDirentList } = this.props;

    if (enableSeadoc && !currentRepoInfo.encrypted) {
      direntsContainerMenuList.push(NEW_SEADOC_FILE);
    }

    direntsContainerMenuList.push(
      NEW_MARKDOWN_FILE,
      NEW_EXCEL_FILE,
      NEW_POWERPOINT_FILE,
      NEW_WORD_FILE
    );

    if (enableWhiteboard) {
      direntsContainerMenuList.push(NEW_TLDRAW_FILE);
    }

    if (enableExcalidraw) {
      direntsContainerMenuList.push(NEW_EXCALIDRAW_FILE);
    }

    if (selectedDirentList.length === 0) {
      if (!hasCustomPermission('create')) return;
      this.handleContextClick(event, DIRENT_GRID_CONTAINER_MENU_ID, direntsContainerMenuList);
    } else if (selectedDirentList.length === 1) {
      if (!this.state.activeDirent) {
        let menuList = Utils.getDirentOperationList(this.isRepoOwner, currentRepoInfo, selectedDirentList[0], true);
        this.handleContextClick(event, GRID_ITEM_CONTEXTMENU_ID, menuList, selectedDirentList[0]);
      } else {
        this.props.onGridItemClick(null);
        event.persist();
        if (!hasCustomPermission('modify')) return;
        setTimeout(() => {
          this.handleContextClick(event, DIRENT_GRID_CONTAINER_MENU_ID, direntsContainerMenuList);
        }, 0);
      }
    } else {
      let menuList = [];
      if (!hasCustomPermission('modify') && !hasCustomPermission('copy') && !hasCustomPermission('download') && !hasCustomPermission('delete')) return;
      ['move', 'copy', 'download', 'delete'].forEach(action => {
        if (hasCustomPermission(action)) {
          menuList.push(TextTranslation[action.toUpperCase()]);
        }
      });
      this.handleContextClick(event, DIRENTS_MENU_ID, menuList);
    }
  };

  onGridItemContextMenu = (event, dirent) => {
    if (this.props.selectedDirentList.length > 1) return;
    // Display menu items according to the current dirent permission
    const menuList = this.getDirentItemMenuList(dirent, true);
    const id = 'grid-item-contextmenu';
    this.handleContextClick(event, id, menuList, dirent);
    if (this.props.direntList.filter(item => item.isSelected).length > 1) return;
    this.props.onGridItemClick && this.props.onGridItemClick(dirent);
  };

  handleContextClick = (event, id, menuList, currentObject = null) => {
    event.preventDefault();
    event.stopPropagation();

    let x = event.clientX || (event.touches && event.touches[0].pageX);
    let y = event.clientY || (event.touches && event.touches[0].pageY);

    if (this.props.posX) {
      x -= this.props.posX;
    }
    if (this.props.posY) {
      y -= this.props.posY;
    }

    hideMenu();

    this.setState({ activeDirent: currentObject });

    let showMenuConfig = {
      id: id,
      position: { x, y },
      target: event.target,
      currentObject: currentObject,
      menuList: menuList,
    };

    if (menuList.length === 0) {
      return;
    }

    showMenu(showMenuConfig);
  };

  getDirentItemMenuList = (dirent, isContextmenu) => {
    const isRepoOwner = this.isRepoOwner;
    const currentRepoInfo = this.props.currentRepoInfo;
    return Utils.getDirentOperationList(isRepoOwner, currentRepoInfo, dirent, isContextmenu);
  };

  renderSelectionBox = () => {
    const { startPoint, endPoint } = this.state;
    if (!this.state.isSelecting) return null;
    const left = Math.min(startPoint.x, endPoint.x);
    const top = Math.min(startPoint.y, endPoint.y);
    const width = Math.abs(startPoint.x - endPoint.x);
    const height = Math.abs(startPoint.y - endPoint.y);
    return (
      <div
        className="selection-box"
        style={{ left, top, width, height }}
      />
    );
  };

  render() {
    const { direntList, selectedDirentList, path, currentRepoInfo, userPerm } = this.props;
    const { encrypted: repoEncrypted } = currentRepoInfo;
    let dirent = this.state.activeDirent ? this.state.activeDirent : '';
    let direntPath = Utils.joinPath(path, dirent.name);

    let canModifyFile = false;
    let canDeleteFile = false;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    if (['rw', 'cloud-edit'].indexOf(userPerm) != -1) {
      canModifyFile = true;
      canDeleteFile = true;
    } else {
      if (isCustomPermission) {
        const { modify, delete: canDelete } = customPermission.permission;
        canModifyFile = modify;
        canDeleteFile = canDelete;
      }
    }

    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }

    return (
      <Fragment>
        {direntList.length > 0 ?
          <ul
            className="grid-view"
            onClick={this.gridContainerClick}
            onContextMenu={this.onGridContainerContextMenu}
            onMouseDown={this.onGridContainerMouseDown}
            onMouseMove={this.onSelectMouseMove}
            ref={this.containerRef}
          >
            {direntList.map((dirent, index) => {
              return (
                <DirentGridItem
                  key={dirent.name} // dirent.id is not unique, so use dirent.name as key
                  dirent={dirent}
                  repoID={this.props.repoID}
                  path={this.props.path}
                  onItemClick={this.props.onItemClick}
                  currentRepoInfo={this.props.currentRepoInfo}
                  showImagePopup={this.showImagePopup}
                  onGridItemContextMenu={this.onGridItemContextMenu}
                  onItemMove={this.props.onItemMove}
                  onItemsMove={this.props.onItemsMove}
                  onGridItemMouseDown={this.onGridItemMouseDown}
                  onGridItemClick={this.onGridItemClick}
                  selectedDirentList={selectedDirentList}
                  repoEncrypted={repoEncrypted}
                />
              );
            })}
            {this.renderSelectionBox()}
          </ul>
          :
          <ul
            className="grid-view"
            onClick={this.gridContainerClick}
            onContextMenu={this.onGridContainerContextMenu}
            onMouseDown={this.onGridContainerMouseDown}
            onMouseMove={this.onSelectMouseMove}
            ref={this.containerRef}
          >
            <EmptyTip text={gettext('No file')} className='w-100' />
          </ul>
        }
        <ContextMenu
          id={GRID_ITEM_CONTEXTMENU_ID}
          onMenuItemClick={this.onMenuItemClick}
          getMenuContainerSize={this.props.getMenuContainerSize}
        />
        <ContextMenu
          id={DIRENT_GRID_CONTAINER_MENU_ID}
          onMenuItemClick={this.onMenuItemClick}
          getMenuContainerSize={this.props.getMenuContainerSize}
        />
        <ContextMenu
          id={DIRENTS_MENU_ID}
          onMenuItemClick={this.onDirentsMenuItemClick}
          getMenuContainerSize={this.props.getMenuContainerSize}
        />
        {this.state.isCreateFolderDialogShow && (
          <ModalPortal>
            <CreateFolder
              parentPath={this.props.path}
              onAddFolder={this.onAddFolder}
              checkDuplicatedName={this.checkDuplicatedName}
              addFolderCancel={this.onCreateFolderToggle}
            />
          </ModalPortal>
        )}
        {this.state.isCreateFileDialogShow && (
          <ModalPortal>
            <CreateFile
              parentPath={this.props.path}
              fileType={this.state.fileType}
              onAddFile={this.props.onAddFile}
              checkDuplicatedName={this.checkDuplicatedName}
              toggleDialog={this.onCreateFileToggle}
            />
          </ModalPortal>
        )}
        {this.state.isMoveDialogShow &&
          <MoveDirentDialog
            path={this.props.path}
            repoID={this.props.repoID}
            repoEncrypted={repoEncrypted}
            isMultipleOperation={this.state.isMultipleOperation}
            selectedDirentList={selectedDirentList}
            onItemMove={this.props.onItemMove}
            onItemsMove={this.props.onItemsMove}
            onCancelMove={this.onMoveToggle}
            dirent={this.state.activeDirent}
            onAddFolder={this.props.onAddFolder}
          />
        }
        {this.state.isZipDialogOpen &&
          <ModalPortal>
            <ZipDownloadDialog
              repoID={this.props.repoID}
              path={this.props.path}
              target={this.state.downloadItems}
              toggleDialog={this.closeZipDialog}
            />
          </ModalPortal>
        }
        {this.state.isCopyDialogShow &&
          <CopyDirentDialog
            path={this.props.path}
            repoID={this.props.repoID}
            repoEncrypted={repoEncrypted}
            isMultipleOperation={this.state.isMultipleOperation}
            selectedDirentList={selectedDirentList}
            onItemsCopy={this.props.onItemsCopy}
            onCancelCopy={this.onCopyToggle}
            onAddFolder={this.props.onAddFolder}
          />
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
        {this.state.isRenameDialogShow && (
          <ModalPortal>
            <Rename
              dirent={selectedDirentList.length > 1 ? selectedDirentList[selectedDirentList.length - 1] : this.state.activeDirent}
              onRename={this.onItemRename}
              checkDuplicatedName={this.checkDuplicatedName}
              toggleCancel={this.onItemRenameToggle}
            />
          </ModalPortal>
        )}
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
        {this.state.isImagePopupOpen && this.state.imageItems.length && (
          <ModalPortal>
            <ImageDialog
              repoID={this.props.repoID}
              repoInfo={this.props.currentRepoInfo}
              imageItems={this.state.imageItems}
              imageIndex={this.state.imageIndex}
              closeImagePopup={this.closeImagePopup}
              moveToPrevImage={this.moveToPrevImage}
              moveToNextImage={this.moveToNextImage}
              onDeleteImage={(canDeleteFile && this.deleteImage) ? this.deleteImage : null}
              onRotateImage={this.rotateImage}
              enableRotate={canModifyFile}
              isCustomPermission={isCustomPermission}
            />
          </ModalPortal>
        )}
        {this.state.isFileAccessLogDialogOpen &&
          <ModalPortal>
            <FileAccessLog
              repoID={this.props.repoID}
              filePath={direntPath}
              fileName={dirent.name}
              toggleDialog={this.toggleFileAccessLogDialog}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

DirentGridView.propTypes = propTypes;

export default DirentGridView;
