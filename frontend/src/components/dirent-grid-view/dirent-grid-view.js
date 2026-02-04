import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, username, enableSeadoc, thumbnailDefaultSize, thumbnailSizeForOriginal, gettext, fileServerRoot, enableWhiteboard } from '../../utils/constants';
import { updateImageThumbnail, Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import Loading from '../loading';
import ModalPortal from '../modal-portal';
import ImageDialog from '../dialog/image-dialog';
import DirentGridItem from '../../components/dirent-grid-view/dirent-grid-item';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, showMenu } from '../context-menu/actions';
import TextTranslation from '../../utils/text-translation';
import toaster from '../toast';
import imageAPI from '../../utils/image-api';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import EmptyTip from '../empty-tip';
import { Dirent } from '../../models';
import { VirtualGrid } from '../virtual-list';
import { getSelectionRect, viewportToContentBounds, isIntersecting } from '../../utils/grid-selection';
import { lockFile, unlockFile, exportDocx, exportSdoc, toggleStar, openHistory, openViaClient, freezeDocument } from '../../utils/dirent-operations';
import { withDirentContextMenu } from '../dir-view-mode/hoc/withDirentContextMenu';
import { menuHandlers } from '../dir-view-mode/utils/menuHandlers';
import { getCreateMenuList } from '../dir-view-mode/utils/contextMenuUtils';

import '../../css/grid-view.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object,
  direntList: PropTypes.array.isRequired,
  fullDirentList: PropTypes.array,
  selectedDirentList: PropTypes.array.isRequired,
  onSelectedDirentListUpdate: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func,
  onItemConvert: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  userPerm: PropTypes.string, // current path's user permission
  enableDirPrivateShare: PropTypes.bool.isRequired,
  updateDirent: PropTypes.func.isRequired,
  onGridItemClick: PropTypes.func,
  repoTags: PropTypes.array.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
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
      isGridItemFreezed: false,
      activeDirent: null,
      downloadItems: [],

      startPoint: { x: 0, y: 0 },
      endPoint: { x: 0, y: 0 },
      selectedItemsList: [],
      isSelecting: false,
      isMouseDown: false,
      autoScrollInterval: null,
      startYContentOffset: 0,
    };
    this.containerRef = React.createRef();
    this.scrollContainerRef = React.createRef();
    this.cachedContainerBounds = null;
    this.resizeObserver = null;
    this.isRepoOwner = props.currentRepoInfo.owner_email === username;
  }

  componentDidMount() {
    window.addEventListener('mouseup', this.onGlobalMouseUp);
    this.unsubscribeEvent = this.props.eventBus.subscribe(EVENT_BUS_TYPE.RESTORE_IMAGE, this.recalculateImageItems);
    this.setupResizeObserver();
  }

  setupResizeObserver = () => {
    const container = this.scrollContainerRef.current;
    if (!container) return;

    this.cachedContainerBounds = container.getBoundingClientRect();

    this.resizeObserver = new ResizeObserver(() => {
      this.cachedContainerBounds = container.getBoundingClientRect();
    });

    this.resizeObserver.observe(container);
  };

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
    clearInterval(this.state.autoScrollInterval);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.setState({
      autoScrollInterval: null,
    });
  }

  onGridContainerMouseDown = (event) => {
    if (event.button === 2) {
      return;
    } else if (event.button === 0) {
      hideMenu();
      this.props.onGridItemClick(null);
      if (event.target.closest('img') || event.target.closest('div.grid-file-name')) {
        return;
      }

      const container = this.scrollContainerRef.current;
      const containerBounds = this.cachedContainerBounds || container.getBoundingClientRect();

      const startX = event.clientX - containerBounds.left;
      const startY = event.clientY - containerBounds.top + container.scrollTop;

      this.setState({
        startPoint: { x: startX, y: startY },
        endPoint: { x: startX, y: startY },
        selectedItemsList: [],
        isSelecting: false,
        isMouseDown: true,
        startYContentOffset: startY,
      });
    }
  };

  onSelectMouseMove = (e) => {
    if (!this.state.isMouseDown) return;

    const container = this.scrollContainerRef.current;
    const containerBounds = this.cachedContainerBounds || container.getBoundingClientRect();

    const endPoint = {
      x: e.clientX - containerBounds.left,
      y: e.clientY - containerBounds.top + container.scrollTop
    };

    endPoint.x = Math.max(0, Math.min(endPoint.x, containerBounds.width));
    endPoint.y = Math.max(0, Math.min(endPoint.y, container.scrollHeight));

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
    } else {
      this.setState({ endPoint });
      this.autoScroll(e.clientY);
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
    const container = this.scrollContainerRef.current;
    if (!container) return;

    const containerBounds = this.cachedContainerBounds || container.getBoundingClientRect();
    const items = container.querySelectorAll('.grid-item');
    const selectionRect = getSelectionRect(startPoint, endPoint);

    const newSelectedItemsList = [];

    items.forEach(item => {
      const itemBounds = item.getBoundingClientRect();
      const contentBounds = viewportToContentBounds(itemBounds, containerBounds, container.scrollTop);

      if (isIntersecting(contentBounds, selectionRect)) {
        newSelectedItemsList.push(item);
      }
    });

    this.setState({ selectedItemsList: newSelectedItemsList });
  };

  autoScroll = (mouseY) => {
    const container = this.scrollContainerRef.current;
    if (!container) return;

    const containerBounds = this.cachedContainerBounds || container.getBoundingClientRect();
    const scrollSpeed = 10;
    const scrollThreshold = 20;

    const updateEndPoint = () => {
      const endPoint = {
        x: this.state.endPoint.x,
        y: mouseY - containerBounds.top + container.scrollTop,
      };

      endPoint.y = Math.max(0, Math.min(endPoint.y, container.scrollHeight));

      this.setState({ endPoint }, () => {
        if (this.state.isSelecting) {
          this.determineSelectedItems();
        }
      });
    };

    if (mouseY < containerBounds.top + scrollThreshold) {
      if (!this.state.autoScrollInterval) {
        const interval = setInterval(() => {
          container.scrollTop -= scrollSpeed;
          updateEndPoint();
        }, 50);
        this.setState({ autoScrollInterval: interval });
      }
    } else if (mouseY > containerBounds.bottom - scrollThreshold) {
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

  onGridItemClick = (dirent, event) => {
    hideMenu();
    if (this.state.activeDirent !== dirent) {
      this.setState({ activeDirent: dirent });
    }
    this.props.onGridItemClick(dirent, event);
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
    const { activeDirent: dirent } = this.state;
    const { repoID, path } = this.props;
    if (dirent) {
      exportDocx(dirent, repoID, path);
    }
  };

  exportSdoc = () => {
    const { activeDirent: dirent } = this.state;
    const { repoID, path } = this.props;
    if (dirent) {
      exportSdoc(dirent, repoID, path);
    }
  };

  onMenuItemClick = (operation, currentObject, event) => {
    hideMenu();

    // Use unified menuHandlers for all operations
    // operation is already the key string (from data-operation attribute)
    const handler = menuHandlers[operation];
    if (handler) {
      handler({
        eventBus: this.props.eventBus,
        path: this.props.path,
        repoID: this.props.repoID,
        dirent: currentObject,
        dirents: currentObject,
        isBatch: false,
        updateDirentProperties: this.props.updateDirent,
        onItemDelete: this.props.onItemDelete,
        onItemConvert: this.props.onItemConvert,
        showDirentDetail: this.props.showDirentDetail
      });
    }
  };

  onDirentsMenuItemClick = (operation) => {
    // Use shared menu handlers directly
    // operation is already the key string (from data-operation attribute)
    const handler = menuHandlers[operation];
    if (handler) {
      handler({
        eventBus: this.props.eventBus,
        path: this.props.path,
        repoID: this.props.repoID,
        dirents: this.props.selectedDirentList,
        isBatch: true,
        onBatchDelete: this.props.onItemsDelete,
        updateDirentProperties: this.props.updateDirent
      });
    }

    hideMenu();
  };

  getDirentPath = (dirent) => {
    let path = this.props.path;
    return path === '/' ? path + dirent.name : path + '/' + dirent.name;
  };

  onMove = () => {
    const { path, selectedDirentList, eventBus } = this.props;
    eventBus.dispatch(EVENT_BUS_TYPE.MOVE_FILE, path, selectedDirentList, true);
  };

  onCopy = () => {
    const { path, selectedDirentList, eventBus } = this.props;
    eventBus.dispatch(EVENT_BUS_TYPE.COPY_FILE, path, selectedDirentList, true);
  };

  onDownload = () => {
    const { path, selectedDirentList, eventBus } = this.props;
    const direntList = selectedDirentList.map(dirent => dirent instanceof Dirent ? dirent.toJson() : dirent);
    eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_FILE, path, direntList);
  };

  onCreateFolder = () => {
    const { path, direntList, eventBus } = this.props;
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FOLDER, path, direntList);
  };

  onCreateFile = (fileType = '') => {
    const { path, direntList, eventBus } = this.props;
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList, fileType);
  };

  onShare = (e) => {
    e.nativeEvent.stopImmediatePropagation(); // for document event

    const { path, eventBus } = this.props;
    const { activeDirent } = this.state;
    const dirent = activeDirent || '';
    const direntPath = Utils.joinPath(path, dirent.name);
    eventBus.dispatch(EVENT_BUS_TYPE.SHARE_FILE, direntPath, dirent);
  };

  onRename = () => {
    const { eventBus, direntList } = this.props;
    const { activeDirent } = this.state;
    const dirent = activeDirent || '';
    eventBus.dispatch(EVENT_BUS_TYPE.RENAME_FILE, dirent, direntList);
  };

  onPermission = () => {
    const { eventBus, path } = this.props;
    const { activeDirent } = this.state;
    const dirent = activeDirent || '';
    const direntPath = Utils.joinPath(path, dirent?.name);
    const name = Utils.getFileName(direntPath);
    eventBus.dispatch(EVENT_BUS_TYPE.PERMISSION, direntPath, name);
  };

  openFileAccessLog = () => {
    const { eventBus, path } = this.props;
    const { activeDirent } = this.state;
    const dirent = activeDirent || '';
    const direntPath = Utils.joinPath(path, dirent?.name);
    const name = Utils.getFileName(direntPath);
    eventBus.dispatch(EVENT_BUS_TYPE.ACCESS_LOG, direntPath, name);
  };

  onToggleStarItem = () => {
    const { activeDirent: dirent } = this.state;
    const { repoID, path, updateDirent } = this.props;
    toggleStar(dirent, repoID, path, updateDirent);
  };

  handleError = (error) => {
    toaster.danger(Utils.getErrorMsg(error));
  };

  onLockItem = (currentObject) => {
    const { repoID, path, updateDirent } = this.props;
    lockFile(currentObject, repoID, path, updateDirent);
  };

  onFreezeDocument = (currentObject) => {
    const { repoID, path, updateDirent } = this.props;
    freezeDocument(currentObject, repoID, path, updateDirent);
  };

  onUnlockItem = (currentObject) => {
    const { repoID, path, updateDirent } = this.props;
    unlockFile(currentObject, repoID, path, updateDirent);
  };

  onHistory = (currentObject) => {
    const { repoID, path } = this.props;
    openHistory(currentObject, repoID, path);
  };

  onOpenViaClient = (currentObject) => {
    const { repoID, path } = this.props;
    openViaClient(currentObject, repoID, path);
  };

  prepareImageItem = (item) => {
    const { path: parentDir, repoID, currentRepoInfo } = this.props;
    const { name, mtime, id, is_locked } = item;
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
    const isTIFF = fileExt == 'tiff' || fileExt == 'tif';
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
      is_locked,
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

          // Update correct image thumbnail into lightbox component
          const adjustedThumbnailSrc = updateImageThumbnail(newThumbnailSrc);
          this.setState((prevState) => {
            const updatedImageItems = [...prevState.imageItems];
            updatedImageItems[imageIndex].thumbnail = adjustedThumbnailSrc;
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

    const { currentRepoInfo, selectedDirentList } = this.props;

    // Use shared function to get create menu options
    let direntsContainerMenuList = getCreateMenuList({
      enableSeadoc,
      enableWhiteboard,
      isRepoEncrypted: currentRepoInfo.encrypted
    });

    if (selectedDirentList.length === 0) {
      if (!hasCustomPermission('create')) return;
      this.handleContextClick(event, DIRENT_GRID_CONTAINER_MENU_ID, direntsContainerMenuList);
    } else if (selectedDirentList.length === 1) {
      if (!this.state.activeDirent) {
        // Use shared HOC method for getting item menu
        let menuList = this.props.getItemMenuList(selectedDirentList[0], true);
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
      [TextTranslation.DOWNLOAD, TextTranslation.DELETE, TextTranslation.MOVE, TextTranslation.COPY].forEach(action => {
        if (hasCustomPermission(action.key.toLowerCase())) {
          menuList.push(action);
        }
      });
      this.handleContextClick(event, DIRENTS_MENU_ID, menuList);
    }
  };

  onGridItemContextMenu = (event, dirent) => {
    if (this.props.selectedDirentList.length > 1) return;
    // Display menu items according to the current dirent permission
    const menuList = this.props.getItemMenuList(dirent, true);
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

  setImageIndex = (index) => {
    this.setState({ imageIndex: index });
  };

  render() {
    const { direntList, selectedDirentList, currentRepoInfo, userPerm } = this.props;
    const { encrypted: repoEncrypted } = currentRepoInfo;

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

    // Grid dimensions - using actual grid-item size from CSS (134px + margins)
    const ITEM_WIDTH = 142; // 134px grid-item width + 8px for spacing
    const ITEM_HEIGHT = 140; // Height based on grid-item content

    return (
      <Fragment>
        {direntList.length > 0 ?
          <div
            className="grid-view-container w-100 h-100"
            onClick={this.gridContainerClick}
            onContextMenu={this.onGridContainerContextMenu}
            onMouseDown={this.onGridContainerMouseDown}
            onMouseMove={this.onSelectMouseMove}
            ref={this.containerRef}
          >
            <VirtualGrid
              items={direntList}
              renderItem={({ item, index }) => (
                <DirentGridItem
                  key={item.name}
                  dirent={item}
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
              )}
              itemWidth={ITEM_WIDTH}
              itemHeight={ITEM_HEIGHT}
              overscan={2}
              renderOverlay={this.renderSelectionBox}
              scrollContainerRef={this.scrollContainerRef}
            />
          </div>
          :
          <div
            className="grid-view-container w-100 h-100"
            onClick={this.gridContainerClick}
            onContextMenu={this.onGridContainerContextMenu}
            onMouseDown={this.onGridContainerMouseDown}
            onMouseMove={this.onSelectMouseMove}
            ref={this.containerRef}
          >
            <EmptyTip text={gettext('No file')} className="w-100" />
          </div>
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
        {this.state.isImagePopupOpen && this.state.imageItems.length && (
          <ModalPortal>
            <ImageDialog
              repoID={this.props.repoID}
              repoInfo={this.props.currentRepoInfo}
              imageItems={this.state.imageItems}
              imageIndex={this.state.imageIndex}
              setImageIndex={index => this.setImageIndex(index)}
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
      </Fragment>
    );
  }
}

DirentGridView.propTypes = propTypes;

export default withDirentContextMenu(DirentGridView);
