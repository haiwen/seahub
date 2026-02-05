import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, gettext, username, enableSeadoc, thumbnailSizeForOriginal, thumbnailDefaultSize, fileServerRoot, enableWhiteboard } from '../../utils/constants';
import { updateImageThumbnail, Utils } from '../../utils/utils';
import TextTranslation from '../../utils/text-translation';
import toaster from '../toast';
import ModalPortal from '../modal-portal';
import ImageDialog from '../dialog/image-dialog';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, showMenu } from '../context-menu/actions';
import DirentsDraggedPreview from '../draggable/dirents-dragged-preview';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import EmptyTip from '../empty-tip';
import imageAPI from '../../utils/image-api';
import { seafileAPI } from '../../utils/seafile-api';
import { Dirent } from '../../models';
import { createTableHeaders } from '../../utils/table-headers';
import DirentVirtualListView from './dirent-virtual-list-view';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object,
  isAllItemSelected: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemConvert: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  repoTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string,
  showDirentDetail: PropTypes.func.isRequired,
  loadDirentList: PropTypes.func,
  fullDirentList: PropTypes.array,
  posX: PropTypes.string,
  posY: PropTypes.string,
  getMenuContainerSize: PropTypes.func,
  eventBus: PropTypes.object,
  columns: PropTypes.array,
  hiddenColumnKeys: PropTypes.array,
  onColumnDataModified: PropTypes.func,
};

class DirentListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
      isImagePopupOpen: false,
      imageItems: [],
      imageIndex: 0,
      downloadItems: [],
      activeDirent: null,
      isListDropTipShow: false,
      isShowDirentsDraggablePreview: false,
    };

    this.enteredCounter = 0; // Determine whether to enter the child element to avoid dragging bubbling bugs。
    this.isRepoOwner = props.currentRepoInfo.owner_email === username;
    this.isAdmin = props.currentRepoInfo.is_admin;
    this.repoEncrypted = props.currentRepoInfo.encrypted;

    this.clickedDirent = null;
    this.currentItemRef = null;
    this.childComponents = new Map();

    this.zipToken = null;

    const { userPerm } = props;
    this.canDrop = userPerm === 'rw';
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    if (isCustomPermission) {
      const { modify } = customPermission.permission;
      this.canDrop = modify;
    }
  }

  componentDidMount() {
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
    this.unsubscribeEvent();
  }

  freezeItem = () => {
    this.setState({ isItemFreezed: true });
  };

  unfreezeItem = () => {
    this.setState({ isItemFreezed: false });
  };

  onItemRename = (dirent, newName) => {
    let isDuplicated = this.props.direntList.some(item => {
      return item.name === newName;
    });
    if (isDuplicated) {
      let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
      errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
      toaster.danger(errMessage);
      return false;
    }
    this.props.onItemRename(dirent, newName);
  };

  onItemRenameToggle = () => {
    this.freezeItem();
  };

  onItemSelected = (dirent, event) => {
    this.setState({ activeDirent: null });
    this.props.onItemSelected(dirent, event);
  };

  onDirentClick = (dirent, event) => {
    hideMenu();
    this.props.onDirentClick(dirent, event);
  };

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  // for image popup
  prepareImageItem = (item) => {
    const { path: parentDir, repoID, currentRepoInfo } = this.props;
    const { name, mtime, id, is_locked } = item;
    const repoEncrypted = currentRepoInfo.encrypted;
    const path = Utils.encodePath(Utils.joinPath(parentDir, name));
    const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();

    let thumbnail = '';
    const isGIF = fileExt === 'gif';
    if (repoEncrypted || isGIF) {
      thumbnail = `${siteRoot}repo/${repoID}/raw${path}`;
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
      'downloadURL': `${fileServerRoot}repos/${repoID}/files${path}/?op=download`
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
      imageIndex: items.findIndex((item) => item.name === curItem.name),
    });
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

  handleError = (error) => {
    toaster.danger(Utils.getErrorMsg(error));
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

  closeImagePopup = () => {
    this.setState({ isImagePopupOpen: false });
  };

  onCreateFolder = () => {
    const { path, direntList, eventBus } = this.props;
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FOLDER, path, direntList);
  };

  onCreateFile = (fileType = '') => {
    const { path, direntList, eventBus } = this.props;
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, direntList, fileType);
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

  // common contextmenu handle
  onMouseDown = (event) => {
    if (event.button === 2) {
      event.stopPropagation();
      return;
    }
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

  // table-container contextmenu handle
  onContainerClick = () => {
    hideMenu();
    if (this.props.selectedDirentList.length > 0) {
      this.onDirentClick(null);
    }
  };

  onContainerMouseDown = (event) => {
    this.onMouseDown(event);
  };

  onContainerContextMenu = (event) => {
    event.preventDefault();
    // Display menu items based on the permissions of the current path
    let permission = this.props.userPerm;

    const { isCustomPermission, customPermission } = Utils.getUserPermission(this.props.userPerm);
    if (permission !== 'admin' && permission !== 'rw' && !isCustomPermission) {
      return;
    }

    const {
      NEW_FOLDER, NEW_FILE,
      NEW_MARKDOWN_FILE,
      NEW_EXCEL_FILE,
      NEW_POWERPOINT_FILE,
      NEW_WORD_FILE,
      NEW_SEADOC_FILE,
      NEW_TLDRAW_FILE,
      NEW_EXCALIDRAW_FILE,
    } = TextTranslation;

    const direntsContainerMenuList = [
      NEW_FOLDER, NEW_FILE, 'Divider',
    ];
    const { currentRepoInfo } = this.props;
    if (enableSeadoc && !currentRepoInfo.encrypted) {
      direntsContainerMenuList.push(NEW_SEADOC_FILE);
      direntsContainerMenuList.push(NEW_EXCALIDRAW_FILE);
    }
    direntsContainerMenuList.push(
      NEW_MARKDOWN_FILE,
      NEW_EXCEL_FILE,
      NEW_POWERPOINT_FILE,
      NEW_WORD_FILE,
    );

    if (enableWhiteboard) {
      direntsContainerMenuList.push(NEW_TLDRAW_FILE);
    }

    if (this.props.selectedDirentList.length === 0) {
      let id = 'dirent-container-menu';

      // custom permission judgement
      if (isCustomPermission) {
        const { create: canCreate } = customPermission.permission;
        if (!canCreate) return;
      }

      let menuList = direntsContainerMenuList;
      this.handleContextClick(event, id, menuList);
    } else {
      if (this.props.selectedDirentList.length === 1) {
        if (!this.state.activeDirent) {
          let id = 'dirent-item-menu';
          let dirent = this.props.selectedDirentList[0];
          let menuList = this.getDirentItemMenuList(dirent, true);
          this.handleContextClick(event, id, menuList, dirent);
        } else {
          this.onDirentClick(null);
          event.preventDefault();
          event.persist();

          // custom permission judgement
          if (isCustomPermission) {
            const { modify } = customPermission.permission;
            if (!modify) return;
          }

          setTimeout(() => {
            let id = 'dirent-container-menu';

            let menuList = direntsContainerMenuList;
            this.handleContextClick(event, id, menuList);
          }, 0);
        }
      } else {
        let id = 'dirents-menu';
        let menuList = [];
        if (isCustomPermission) {
          const { modify: canModify, copy: canCopy, download: canDownload, delete: canDelete } = customPermission.permission;
          canDownload && menuList.push(TextTranslation.DOWNLOAD);
          canDelete && menuList.push(TextTranslation.DELETE);
          canModify && menuList.push(TextTranslation.MOVE);
          canCopy && menuList.push(TextTranslation.COPY);
        } else {
          menuList = [TextTranslation.DOWNLOAD, TextTranslation.DELETE, TextTranslation.MOVE, TextTranslation.COPY];
        }

        this.handleContextClick(event, id, menuList);
      }
    }
  };

  onContainerMenuItemClick = (operation) => {
    switch (operation) {
      case 'New Folder':
        this.onCreateFolder();
        break;
      case 'New File':
        this.onCreateFile();
        break;
      case 'New Markdown File':
        this.onCreateFile('.md');
        break;
      case 'New Excel File':
        this.onCreateFile('.xlsx');
        break;
      case 'New PowerPoint File':
        this.onCreateFile('.pptx');
        break;
      case 'New Word File':
        this.onCreateFile('.docx');
        break;
      case 'New Docxf File':
        this.onCreateFile('.docxf');
        break;
      case 'New Whiteboard File':
        this.onCreateFile('.draw');
        break;
      case 'New Excalidraw File':
        this.onCreateFile('.exdraw');
        break;
      case 'New SeaDoc File':
        this.onCreateFile('.sdoc');
        break;
      default:
        break;
    }

    hideMenu();
  };

  onDirentsMenuItemClick = (operation) => {
    switch (operation) {
      case 'Move':
        this.onMove();
        break;
      case 'Copy':
        this.onCopy();
        break;
      case 'Download':
        this.onDownload();
        break;
      case 'Delete':
        this.props.onItemsDelete();
        break;
      default:
        break;
    }

    hideMenu();
  };

  // table-thread contextmenu handle -- Shield event
  onThreadMouseDown = (event) => {
    this.onMouseDown(event);
  };

  onThreadContextMenu = (event) => {
    event.stopPropagation();
  };

  // table-dirent-item contextmenu handle
  onItemMouseDown = (event) => {
    this.onMouseDown(event);
  };

  onItemContextMenu = (event, dirent) => {
    // Display menu items according to the current dirent permission
    if (this.props.selectedDirentList.length > 1) {
      return;
    }
    this.onDirentClick(dirent);
    let id = 'dirent-item-menu';
    let menuList = this.getDirentItemMenuList(dirent, true);
    this.handleContextClick(event, id, menuList, dirent);
  };

  onMenuItemClick = (operation, currentObject, event) => {
    const childComponent = this.childComponents.get(currentObject.name);
    if (childComponent) {
      childComponent.onMenuItemClick(operation, event);
    }
    hideMenu();
  };

  registerExecuteOperation = (direntName, component) => {
    this.childComponents.set(direntName, component);
  };

  unregisterExecuteOperation = (direntName) => {
    this.childComponents.delete(direntName);
  };

  onShowMenu = (e) => {
    this.freezeItem();
  };

  onHideMenu = (e) => {
    this.unfreezeItem();
  };

  // contextmenu utils
  getDirentIndex = (dirent) => {
    let direntList = this.props.direntList;
    let index = 0;
    for (let i = 0; i < direntList.length; i++) {
      if (direntList[i].name === dirent.name) {
        index = i;
        break;
      }
    }
    return index;
  };

  getDirentItemMenuList = (dirent, isContextmenu) => {
    const isRepoOwner = this.isRepoOwner;
    const currentRepoInfo = this.props.currentRepoInfo;
    return Utils.getDirentOperationList(isRepoOwner, currentRepoInfo, dirent, isContextmenu);
  };

  onTableDragEnter = (e) => {
    if (Utils.isIEBrowser() || !this.canDrop) {
      return false;
    }
    this.enteredCounter++;
    if (this.enteredCounter !== 0) {
      if (this.state.isListDropTipShow) {
        return ;
      }
      this.setState({ isListDropTipShow: true });
    }
  };

  onTableDragOver = (e) => {
    if (Utils.isIEBrowser() || !this.canDrop) {
      return false;
    }
    if (e.dataTransfer.dropEffect === 'copy') {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  onTableDragLeave = (e) => {
    if (Utils.isIEBrowser() || !this.canDrop) {
      return false;
    }
    this.enteredCounter--;
    if (this.enteredCounter === 0) {
      this.setState({ isListDropTipShow: false });
    }
  };

  tableDrop = (e) => {
    if (Utils.isIEBrowser() || !this.canDrop) {
      return false;
    }
    e.persist();
    this.enteredCounter = 0;
    this.setState({ isListDropTipShow: false });
    if (e.dataTransfer.files.length) { // uploaded files
      return;
    }
    let dragStartItemData = e.dataTransfer.getData('application/drag-item-info');
    dragStartItemData = JSON.parse(dragStartItemData);

    let { nodeDirent, nodeParentPath, nodeRootPath } = dragStartItemData;

    if (Array.isArray(dragStartItemData)) { // selected items
      return;
    }

    if (nodeRootPath === this.props.path || nodeParentPath === this.props.path) {
      return;
    }

    if (this.props.path.indexOf(nodeRootPath) !== -1) {
      return;
    }

    this.props.onItemMove(this.props.currentRepoInfo, nodeDirent, this.props.path, nodeParentPath);
  };

  onShowDirentsDraggablePreview = () => {
    this.setState({
      isShowDirentsDraggablePreview: true,
    });
  };

  onHideDirentsDraggablePreview = () => {
    this.setState({
      isShowDirentsDraggablePreview: false
    });
  };

  setImageIndex = (index) => {
    this.setState({ imageIndex: index });
  };

  getHeaders = () => {
    const { sortBy, sortOrder, isAllItemSelected, selectedDirentList, columns, hiddenColumnKeys } = this.props;
    const visibleColumnKeys = columns.filter(col => !hiddenColumnKeys.includes(col.key)).map(col => col.key);

    const sortOptions = {
      sortBy,
      sortOrder,
      onSort: (field) => {
        const order = sortOrder === 'asc' ? 'desc' : 'asc';
        this.props.sortItems(field, order);
      }
    };

    const selectionOptions = {
      isAllSelected: isAllItemSelected,
      onAllItemSelected: this.props.onAllItemSelected,
      isPartiallySelected: selectedDirentList.length > 0 && !isAllItemSelected
    };

    return createTableHeaders(sortOptions, selectionOptions, visibleColumnKeys);
  };


  render() {
    const { direntList, userPerm } = this.props;

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

    const TABLE_ROW_HEIGHT = 42;

    return (
      <div
        className={`table-container ${(this.state.isListDropTipShow && this.canDrop) ? 'table-drop-active' : ''}`}
        onMouseDown={this.onContainerMouseDown}
        onContextMenu={this.onContainerContextMenu}
        onClick={this.onContainerClick}
        onDragEnter={this.onTableDragEnter}
        onDragOver={this.onTableDragOver}
        onDragLeave={this.onTableDragLeave}
        onDrop={this.tableDrop}
      >
        {direntList.length > 0 && (
          <DirentVirtualListView
            headers={this.getHeaders()}
            items={direntList}
            itemHeight={TABLE_ROW_HEIGHT}
            overscan={5}
            path={this.props.path}
            repoID={this.props.repoID}
            currentRepoInfo={this.props.currentRepoInfo}
            eventBus={this.props.eventBus}
            isAdmin={this.isAdmin}
            isRepoOwner={this.isRepoOwner}
            repoEncrypted={this.repoEncrypted}
            enableDirPrivateShare={this.props.enableDirPrivateShare}
            isGroupOwnedRepo={this.props.isGroupOwnedRepo}
            onItemClick={this.props.onItemClick}
            onItemRenameToggle={this.onItemRenameToggle}
            onItemSelected={this.onItemSelected}
            onItemDelete={this.props.onItemDelete}
            onItemRename={this.onItemRename}
            onItemMove={this.props.onItemMove}
            onItemConvert={this.props.onItemConvert}
            updateDirent={this.props.updateDirent}
            isItemFreezed={this.state.isItemFreezed}
            freezeItem={this.freezeItem}
            unfreezeItem={this.unfreezeItem}
            onDirentClick={this.onDirentClick}
            showImagePopup={this.showImagePopup}
            onItemMouseDown={this.onItemMouseDown}
            onItemContextMenu={this.onItemContextMenu}
            onMenuItemClick={this.onMenuItemClick}
            registerExecuteOperation={this.registerExecuteOperation}
            unregisterExecuteOperation={this.unregisterExecuteOperation}
            selectedDirentList={this.props.selectedDirentList}
            activeDirent={this.state.activeDirent}
            repoTags={this.props.repoTags}
            onFileTagChanged={this.props.onFileTagChanged}
            getDirentItemMenuList={this.getDirentItemMenuList}
            showDirentDetail={this.props.showDirentDetail}
            onItemsMove={this.props.onItemsMove}
            onShowDirentsDraggablePreview={this.onShowDirentsDraggablePreview}
            loadDirentList={this.props.loadDirentList}
            onAddFolder={this.props.onAddFolder}
            onThreadMouseDown={this.onThreadMouseDown}
            onThreadContextMenu={this.onThreadContextMenu}
            columns={this.props.columns}
            hiddenColumnKeys={this.props.hiddenColumnKeys}
            onColumnDataModified={this.props.onColumnDataModified}
          />
        )}
        {direntList.length === 0 &&
          <EmptyTip text={gettext('No file')}/>
        }
        <Fragment>
          <ContextMenu
            id={'dirent-container-menu'}
            onMenuItemClick={this.onContainerMenuItemClick}
            getMenuContainerSize={this.props.getMenuContainerSize}
          />
          <ContextMenu
            id={'dirent-item-menu'}
            onMenuItemClick={this.onMenuItemClick}
            onShowMenu={this.onShowMenu}
            onHideMenu={this.onHideMenu}
            getMenuContainerSize={this.props.getMenuContainerSize}
          />
          <ContextMenu
            id={'dirents-menu'}
            onMenuItemClick={this.onDirentsMenuItemClick}
            getMenuContainerSize={this.props.getMenuContainerSize}
          />
          {this.state.isShowDirentsDraggablePreview &&
            <ModalPortal>
              <DirentsDraggedPreview
                selectedDirentList={this.props.selectedDirentList}
                onHideDirentsDraggablePreview={this.onHideDirentsDraggablePreview}
                dragStartPosition={this.state.dragStartPosition}
              />
            </ModalPortal>
          }
          {this.state.isImagePopupOpen && (
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
      </div>
    );
  }
}

DirentListView.propTypes = propTypes;

export default DirentListView;
