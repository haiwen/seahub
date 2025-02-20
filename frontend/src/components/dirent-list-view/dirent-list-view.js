import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { siteRoot, gettext, username, enableSeadoc, thumbnailSizeForOriginal, thumbnailDefaultSize, fileServerRoot, enableWhiteboard, useGoFileserver } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import TextTranslation from '../../utils/text-translation';
import URLDecorator from '../../utils/url-decorator';
import toaster from '../toast';
import ModalPortal from '../modal-portal';
import CreateFile from '../dialog/create-file-dialog';
import CreateFolder from '../dialog/create-folder-dialog';
import ImageDialog from '../dialog/image-dialog';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';
import DirentListItem from './dirent-list-item';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, showMenu } from '../context-menu/actions';
import DirentsDraggedPreview from '../draggable/dirents-dragged-preview';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import EmptyTip from '../empty-tip';
import imageAPI from '../../utils/image-api';
import { seafileAPI } from '../../utils/seafile-api';
import FixedWidthTable from '../common/fixed-width-table';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object,
  isAllItemSelected: PropTypes.bool.isRequired,
  direntList: PropTypes.array.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortItems: PropTypes.func.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  onItemDelete: PropTypes.func.isRequired,
  onAllItemSelected: PropTypes.func.isRequired,
  onItemSelected: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onDirentClick: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
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
};

class DirentListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
      isImagePopupOpen: false,
      imageItems: [],
      imageIndex: 0,
      fileType: '',
      isCreateFileDialogShow: false,
      isCreateFolderDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isProgressDialogShow: false,
      downloadItems: [],
      isMultipleOperation: true,
      activeDirent: null,
      isListDropTipShow: false,
      isShowDirentsDraggablePreview: false,
    };

    this.enteredCounter = 0; // Determine whether to enter the child element to avoid dragging bubbling bugs。
    this.isRepoOwner = props.currentRepoInfo.owner_email === username;
    this.isAdmin = props.currentRepoInfo.is_admin;
    this.repoEncrypted = props.currentRepoInfo.encrypted;

    this.clickedDirent = null;
    this.direntItems = [];
    this.currentItemRef = null;

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
    const name = item.name;
    const repoEncrypted = currentRepoInfo.encrypted;
    const path = Utils.encodePath(Utils.joinPath(parentDir, name));
    const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();

    let thumbnail = '';
    const isGIF = fileExt === 'gif';
    if (repoEncrypted || isGIF) {
      thumbnail = `${siteRoot}repo/${repoID}/raw${path}`;
    } else {
      thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`;
    }

    let src = '';
    const isTIFF = fileExt == 'tiff';
    if (isTIFF) {
      src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`;
    } else {
      src = `${siteRoot}repo/${repoID}/raw${path}`;
    }

    return {
      name,
      thumbnail,
      src,
      parentDir,
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
      imageIndex: items.findIndex((item) => item.id === curItem.id),
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
          this.setState((prevState) => {
            const updatedImageItems = [...prevState.imageItems];
            updatedImageItems[imageIndex].src = newThumbnailSrc;
            return { imageItems: updatedImageItems };
          });
          // Update the thumbnail URL with the cache-busting query parameter
          const item = this.props.direntList.find((item) => item.name === imageName);
          this.props.updateDirent(item, 'encoded_thumbnail_src', newThumbnailSrc);
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

  onCreateFileToggle = (fileType) => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
      fileType: fileType || ''
    });
  };

  onCreateFolderToggle = () => {
    this.setState({ isCreateFolderDialogShow: !this.state.isCreateFolderDialogShow });
  };

  onAddFolder = (dirPath) => {
    this.setState({ isCreateFolderDialogShow: false });
    this.props.onAddFolder(dirPath);
  };

  checkDuplicatedName = (newName) => {
    let direntList = this.props.direntList;
    let isDuplicated = direntList.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  };

  onMoveToggle = () => {
    this.setState({ isMoveDialogShow: !this.state.isMoveDialogShow });
  };

  onCopyToggle = () => {
    this.setState({ isCopyDialogShow: !this.state.isCopyDialogShow });
  };

  onItemsDownload = () => {
    let { path, repoID, selectedDirentList } = this.props;
    if (selectedDirentList.length) {
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
          isProgressDialogShow: true,
          downloadItems: selectedDirentNames
        });
      }
    }
  };

  onCloseZipDownloadDialog = () => {
    this.setState({ isProgressDialogShow: false });
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
      NEW_TLDRAW_FILE
    } = TextTranslation;

    const direntsContainerMenuList = [
      NEW_FOLDER, NEW_FILE, 'Divider',
    ];
    const { currentRepoInfo } = this.props;
    if (enableSeadoc && !currentRepoInfo.encrypted) {
      direntsContainerMenuList.push(NEW_SEADOC_FILE);
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
          canModify && menuList.push(TextTranslation.MOVE);
          canCopy && menuList.push(TextTranslation.COPY);
          canDownload && menuList.push(TextTranslation.DOWNLOAD);
          canDelete && menuList.push(TextTranslation.DELETE);
        } else {
          menuList = [TextTranslation.MOVE, TextTranslation.COPY, TextTranslation.DOWNLOAD, TextTranslation.DELETE];
        }

        this.handleContextClick(event, id, menuList);
      }
    }
  };

  onContainerMenuItemClick = (operation) => {
    switch (operation) {
      case 'New Folder':
        this.onCreateFolderToggle();
        break;
      case 'New File':
        this.onCreateFileToggle();
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
      case 'New SeaDoc File':
        this.onCreateFileToggle('.sdoc');
        break;
      default:
        break;
    }

    hideMenu();
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

  setDirentItemRef = (index) => item => {
    this.direntItems[index] = item;
  };

  onMenuItemClick = (operation, currentObject, event) => {
    let index = this.getDirentIndex(currentObject);
    this.direntItems[index].onMenuItemClick(operation, event);

    hideMenu();
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

  getHeaders = (isDesktop) => {
    const { direntList, sortBy, sortOrder } = this.props;
    if (!isDesktop) {
      return [
        { isFixed: false, width: 0.12 },
        { isFixed: false, width: 0.8 },
        { isFixed: false, width: 0.08 },
      ];
    }

    const sortIcon = <span className={`sf3-font sf3-font-down ${sortOrder == 'asc' ? 'rotate-180 d-inline-block' : ''}`}></span>;
    return [
      { isFixed: true,
        width: 31,
        className: 'pl10 pr-2 cursor-pointer',
        title: this.props.isAllItemSelected ? gettext('Unselect all items') : gettext('Select all items'),
        ariaLabel: this.props.isAllItemSelected ? gettext('Unselect all items') : gettext('Select all items'),
        children: (
          <input
            type="checkbox"
            className="vam cursor-pointer"
            checked={this.props.isAllItemSelected}
            disabled={direntList.length === 0}
            readOnly
          />
        ),
        onClick: (e) => {
          e.stopPropagation();
          this.props.onAllItemSelected();
        }
      },
      {
        isFixed: true, width: 32, className: 'pl-2 pr-2', // star
      },
      {
        isFixed: true, width: 40, className: 'pl-2 pr-2', // icon
      },
      {
        isFixed: false,
        width: 0.5,
        children: (<a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortBy == 'name' && sortIcon}</a>),
      },
      {
        isFixed: false, width: 0.06, // tag
      },
      {
        isFixed: false, width: 0.18, // operation
      },
      {
        isFixed: false,
        width: 0.11,
        children: (<a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBy == 'size' && sortIcon}</a>)
      },
      {
        isFixed: false,
        width: 0.15,
        children: (<a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortBy == 'time' && sortIcon}</a>)
      }
    ];
  };

  render() {
    const { direntList, currentRepoInfo, userPerm } = this.props;
    const { encrypted: repoEncrypted } = currentRepoInfo;
    const isDesktop = Utils.isDesktop();

    let canModifyFile = false;
    let canDeleteFile = false;
    if (['rw', 'cloud-edit'].indexOf(userPerm) != -1) {
      canModifyFile = true;
      canDeleteFile = true;
    } else {
      const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
      if (isCustomPermission) {
        const { modify, delete: canDelete } = customPermission.permission;
        canModifyFile = modify;
        canDeleteFile = canDelete;
      }
    }

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
          <FixedWidthTable
            className={classnames('table-hover', { 'table-thead-hidden': !isDesktop })}
            headers={this.getHeaders(isDesktop)}
            theadOptions={isDesktop ? { onMouseDown: this.onThreadMouseDown, onContextMenu: this.onThreadContextMenu } : {}}
          >
            {direntList.map((dirent, index) => {
              return (
                <DirentListItem
                  ref={this.setDirentItemRef(index)}
                  key={dirent.name} // dirent.id is not unique, so use dirent.name as key
                  dirent={dirent}
                  path={this.props.path}
                  repoID={this.props.repoID}
                  currentRepoInfo={this.props.currentRepoInfo}
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
                  onItemCopy={this.props.onItemCopy}
                  onItemConvert={this.props.onItemConvert}
                  updateDirent={this.props.updateDirent}
                  isItemFreezed={this.state.isItemFreezed}
                  freezeItem={this.freezeItem}
                  unfreezeItem={this.unfreezeItem}
                  onDirentClick={this.onDirentClick}
                  showImagePopup={this.showImagePopup}
                  onItemMouseDown={this.onItemMouseDown}
                  onItemContextMenu={this.onItemContextMenu}
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
                />
              );
            })}
          </FixedWidthTable>
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
                imageItems={this.state.imageItems}
                imageIndex={this.state.imageIndex}
                closeImagePopup={this.closeImagePopup}
                moveToPrevImage={this.moveToPrevImage}
                moveToNextImage={this.moveToNextImage}
                onDeleteImage={(canDeleteFile && this.deleteImage) ? this.deleteImage : null}
                onRotateImage={this.rotateImage}
                enableRotate={canModifyFile}
              />
            </ModalPortal>
          )}
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
              selectedDirentList={this.props.selectedDirentList}
              onItemsMove={this.props.onItemsMove}
              onCancelMove={this.onMoveToggle}
              onAddFolder={this.props.onAddFolder}
            />
          }
          {this.state.isCopyDialogShow &&
            <CopyDirentDialog
              path={this.props.path}
              repoID={this.props.repoID}
              repoEncrypted={repoEncrypted}
              selectedDirentList={this.props.selectedDirentList}
              isMultipleOperation={this.state.isMultipleOperation}
              onItemsCopy={this.props.onItemsCopy}
              onCancelCopy={this.onCopyToggle}
              onAddFolder={this.props.onAddFolder}
            />
          }
          {this.state.isProgressDialogShow &&
            <ZipDownloadDialog
              repoID={this.props.repoID}
              path={this.props.path}
              target={this.state.downloadItems}
              toggleDialog={this.onCloseZipDownloadDialog}
            />
          }
        </Fragment>
      </div>
    );
  }
}

DirentListView.propTypes = propTypes;

export default DirentListView;
