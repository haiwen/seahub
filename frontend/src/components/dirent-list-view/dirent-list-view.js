import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, gettext, thumbnailSizeForOriginal, username, isPro, enableFileComment, fileAuditEnabled, folderPermEnabled, canGenerateShareLink } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import TextTranslation from '../../utils/text-translation';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import Loading from '../loading';
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

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object,
  isAllItemSelected: PropTypes.bool.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
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
  onItemsDelete: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  userPerm: PropTypes.string,
  showDirentDetail: PropTypes.func.isRequired,
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
      progress: 0,
      isMutipleOperation: true,
      activeDirent: null,
      isListDropTipShow: false,
    };

    this.enteredCounter = 0; // Determine whether to enter the child element to avoid dragging bubbling bugs。
    this.isRepoOwner = props.currentRepoInfo.owner_email === username;
    this.isAdmin = props.currentRepoInfo.is_admin;
    this.repoEncrypted = props.currentRepoInfo.encrypted;

    this.clickedDirent = null;
    this.direntItems = [];
    this.currentItemRef = null;

    this.zipToken = null;
  }

  freezeItem = () => {
    this.setState({isItemFreezed: true});
  }

  unfreezeItem = () => {
    this.setState({isItemFreezed: false});
  }

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
  }

  onItemRenameToggle = () => {
    this.freezeItem();
  }

  onItemSelected = (dirent) => {
    this.setState({activeDirent: null});
    this.props.onItemSelected(dirent);
  }

  onDirentClick = (dirent) => {
    if (this.props.selectedDirentList.length > 0 && !this.state.activeDirent ) {
      return;
    }
    this.setState({activeDirent: dirent});
    this.props.onDirentClick(dirent);
  }

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  }

  // for image popup
  prepareImageItem = (item) => {
    const useThumbnail = !this.repoEncrypted;
    const name = item.name;

    const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
    const isGIF = fileExt == 'gif';

    const path = Utils.encodePath(Utils.joinPath(this.props.path, name));
    const repoID = this.props.repoID;
    let src;
    if (useThumbnail && !isGIF) {
      src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`;
    } else {
      src = `${siteRoot}repo/${repoID}/raw${path}`;
    }

    return {
      'name': name,
      'url': `${siteRoot}lib/${repoID}/file${path}`,
      'src': src
    };
  }

  showImagePopup = (curItem) => {
    let items = this.props.direntList.filter((item) => {
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
  }

  moveToPrevImage = () => {
    const imageItemsLength = this.state.imageItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + imageItemsLength - 1) % imageItemsLength
    }));
  }

  moveToNextImage = () => {
    const imageItemsLength = this.state.imageItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + 1) % imageItemsLength
    }));
  }

  closeImagePopup = () => {
    this.setState({isImagePopupOpen: false});
  }

  onCreateFileToggle = () => {
    this.setState({isCreateFileDialogShow: !this.state.isCreateFileDialogShow});
  }

  onCreateFolderToggle = () => {
    this.setState({isCreateFolderDialogShow: !this.state.isCreateFolderDialogShow});
  }

  onAddFile = (filePath, isDraft) => {
    this.setState({isCreateFileDialogShow: false});
    this.props.onAddFile(filePath, isDraft);
  }

  onAddFolder = (dirPath) => {
    this.setState({isCreateFolderDialogShow: false});
    this.props.onAddFolder(dirPath);
  }

  checkDuplicatedName = (newName) => {
    let direntList = this.props.direntList;
    let isDuplicated = direntList.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  }

  onMoveToggle = () => {
    this.setState({isMoveDialogShow: !this.state.isMoveDialogShow});
  }

  onCopyToggle = () => {
    this.setState({isCopyDialogShow: !this.state.isCopyDialogShow});
  }

  onItemsDownload = () => {
    let { path, repoID, selectedDirentList } = this.props;
    if (selectedDirentList.length) {
      if (selectedDirentList.length === 1 && !selectedDirentList[0].isDir()) {
        let direntPath = Utils.joinPath(path, selectedDirentList[0].name);
        let url = URLDecorator.getUrl({type: 'download_file_url', repoID: repoID, filePath: direntPath});
        location.href= url;
        return;
      }
      let selectedDirentNames = selectedDirentList.map(dirent => {
        return dirent.name;
      });
      this.setState({isProgressDialogShow: true, progress: 0});
      seafileAPI.zipDownload(repoID, path, selectedDirentNames).then(res => {
        this.zipToken = res.data['zip_token'];
        this.addDownloadAnimation();
        this.interval = setInterval(this.addDownloadAnimation, 1000);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  addDownloadAnimation = () => {
    let _this = this;
    let token = this.zipToken;
    seafileAPI.queryZipProgress(token).then(res => {
      let data = res.data;
      let progress = data.total === 0 ? 100 : (data.zipped / data.total * 100).toFixed(0);
      this.setState({progress: parseInt(progress)});

      if (data['total'] === data['zipped']) {
        this.setState({
          progress: 100
        });
        clearInterval(this.interval);
        location.href = URLDecorator.getUrl({type: 'download_dir_zip_url', token: token});
        setTimeout(function() {
          _this.setState({isProgressDialogShow: false});
        }, 500);
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onCancelDownload = () => {
    seafileAPI.cancelZipTask(this.zipToken).then(() => {
      this.setState({isProgressDialogShow: false});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  // common contextmenu handle
  onMouseDown = (event) => {
    event.stopPropagation();
    if (event.button === 2) {
      return;
    }
  }

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
  }

  // table-container contextmenu handle
  onContainerClick = () => {
    if (this.state.activeDirent) {
      this.onDirentClick(null);
    }
  }

  onContainerMouseDown = (event) => {
    this.onMouseDown(event);
  }

  onContainerContextMenu = (event) => {
    event.preventDefault();
    // Display menu items based on the permissions of the current path
    let permission = this.props.userPerm;
    if (permission !== 'admin' && permission !== 'rw') {
      return;
    }

    if (this.props.selectedDirentList.length === 0) {
      let id = 'dirent-container-menu';
      let menuList = [TextTranslation.NEW_FOLDER, TextTranslation.NEW_FILE];
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
          setTimeout(() => {
            let id = 'dirent-container-menu';
            let menuList = [TextTranslation.NEW_FOLDER, TextTranslation.NEW_FILE];
            this.handleContextClick(event, id, menuList);
          }, 0);
        }
      } else {
        let id = 'dirents-menu';
        let menuList = [TextTranslation.MOVE, TextTranslation.COPY, TextTranslation.DOWNLOAD, TextTranslation.DELETE];
        this.handleContextClick(event, id, menuList);
      }
    }
  }

  onContainerMenuItemClick = (operation) => {
    switch(operation) {
      case 'New Folder':
        this.onCreateFolderToggle();
        break;
      case 'New File':
        this.onCreateFileToggle();
        break;
      default: 
        break;
    }

    hideMenu();
  }

  onDirentsMenuItemClick = (operation) => {
    switch(operation) {
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
  }

  // table-thread contextmenu handle -- Shield event
  onThreadMouseDown = (event) => {
    this.onMouseDown(event);
  }

  onThreadContextMenu = (event) => {
    event.stopPropagation();
  }

  // table-dirent-item contextmenu handle
  onItemMouseDown = (event) => {
    this.onMouseDown(event);
  }

  onItemContextMenu = (event, dirent) => {
    // Display menu items according to the current dirent permission
    if (this.props.selectedDirentList.length > 1) {
      return;
    }
    this.onDirentClick(dirent);
    let id = 'dirent-item-menu';
    let menuList = this.getDirentItemMenuList(dirent, true);
    this.handleContextClick(event, id, menuList, dirent);
  }

  setDirentItemRef = (index) => item => {
    this.direntItems[index] = item;
  }

  onMenuItemClick = (operation, currentObject, event) => {
    let index = this.getDirentIndex(currentObject);
    this.direntItems[index].onMenuItemClick(operation, event);

    hideMenu();
  }

  onShowMenu = (e) => {
    this.freezeItem();
  }

  onHideMenu = (e) => {
    this.unfreezeItem();
  }

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
  }

  getDirentItemMenuList = (dirent, isContextmenu) => {
    let isRepoOwner = this.isRepoOwner;
    let currentRepoInfo = this.props.currentRepoInfo;
    let can_set_folder_perm = folderPermEnabled  && ((isRepoOwner && currentRepoInfo.has_been_shared_out) || currentRepoInfo.is_admin);

    let type = dirent.type;
    let permission = dirent.permission;
    let showShareBtn = Utils.isHasPermissionToShare(currentRepoInfo, permission, dirent);

    let menuList = [];
    let contextmenuList = [];

    if (isContextmenu) {
      let { SHARE, DOWNLOAD, DELETE } = TextTranslation;
      
      if (showShareBtn) {
        contextmenuList = [SHARE];
      }

      if (dirent.permission === 'rw' || dirent.permission === 'r') {
        contextmenuList = [...contextmenuList, DOWNLOAD];
      }

      if (dirent.permission === 'rw') {
        contextmenuList = [...contextmenuList, DELETE];
      }
      contextmenuList = contextmenuList.length > 0 ? [...contextmenuList, 'Divider'] : [];
    }

    let { RENAME, MOVE, COPY, PERMISSION, OPEN_VIA_CLIENT, LOCK, UNLOCK, COMMENT, HISTORY, ACCESS_LOG, TAGS } = TextTranslation;
    if (type === 'dir' && permission === 'rw') {
      if (can_set_folder_perm) {
        menuList = [...contextmenuList, RENAME, MOVE, COPY, 'Divider', PERMISSION, 'Divider', OPEN_VIA_CLIENT];
      } else {
        menuList = [...contextmenuList, RENAME, MOVE, COPY, 'Divider', OPEN_VIA_CLIENT];
      }
      return menuList;
    }

    if (type === 'dir' && permission === 'r') {
      menuList = [...contextmenuList];
      menuList = currentRepoInfo.encrypted ? [...menuList, COPY] : menuList.slice(0, menuList.length - 1);
      return menuList;
    }

    if (type === 'file' && permission === 'rw') {
      menuList = [...contextmenuList];
      if (!dirent.is_locked || (dirent.is_locked && dirent.locked_by_me)) {
        menuList.push(RENAME);
        menuList.push(MOVE);
      }
      menuList.push(COPY);
      menuList.push(TAGS);
      if (isPro) {
        if (dirent.is_locked) {
          if (dirent.locked_by_me || (dirent.lock_owner === 'OnlineOffice' && permission === 'rw')) {
            menuList.push(UNLOCK);
          }
        } else {
          menuList.push(LOCK);
        }
      }
      menuList.push('Divider');
      if (enableFileComment) {
        menuList.push(COMMENT);
      }
      menuList.push(HISTORY);
      if (isPro && fileAuditEnabled) {
        menuList.push(ACCESS_LOG);
      }
      menuList.push('Divider');
      menuList.push(OPEN_VIA_CLIENT);
      return menuList;
    }

    if (type === 'file' && permission === 'r') {
      menuList = [...contextmenuList];
      if (!currentRepoInfo.encrypted) {
        menuList.push(COPY);
      }
      if (enableFileComment) {
        menuList.push(COMMENT);
      }
      menuList.push(HISTORY);
      return menuList;
    }

    return [];
  }

  onTableDragEnter = (e) => {
    if (Utils.isIEBrower()) {
      return false;
    }
    this.enteredCounter++;
    if (this.enteredCounter !== 0) {
      this.setState({isListDropTipShow: true});
    }
  }

  onTableDragOver = (e) => {
    if (Utils.isIEBrower()) {
      return false;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  onTableDragLeave = (e) => {
    if (Utils.isIEBrower()) {
      return false;
    }
    this.enteredCounter--;
    if (this.enteredCounter === 0) {
      this.setState({isListDropTipShow: false});
    }
  }

  tableDrop = (e) => {
    if (Utils.isIEBrower()) {
      return false;
    }
    e.persist();
    this.enteredCounter = 0;
    this.setState({isListDropTipShow: false});
    if (e.dataTransfer.files.length) { // uploaded files
      return;
    }
    let dragStartItemData = e.dataTransfer.getData('applicaiton/drag-item-info');
    dragStartItemData = JSON.parse(dragStartItemData);

    let {nodeDirent, nodeParentPath, nodeRootPath} = dragStartItemData;

    if (Array.isArray(dragStartItemData)) { //selected items
      return;
    }

    if (nodeRootPath === this.props.path || nodeParentPath === this.props.path) {
      return;
    }

    if (this.props.path.indexOf(nodeRootPath) !== -1) {
      return;
    }

    this.props.onItemMove(this.props.currentRepoInfo, nodeDirent, this.props.path, nodeParentPath);
  }

  render() {
    const { direntList, sortBy, sortOrder } = this.props;

    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }

    // sort
    const sortByName = sortBy == 'name';
    const sortByTime = sortBy == 'time';
    const sortBySize = sortBy == 'size';
    const sortIcon = sortOrder == 'asc' ? <span className="fas fa-caret-up"></span> : <span className="fas fa-caret-down"></span>;

    return (
      <div 
        className={`table-container ${this.state.isListDropTipShow ? 'table-drop-active' : ''}`}
        onMouseDown={this.onContainerMouseDown} 
        onContextMenu={this.onContainerContextMenu} 
        onClick={this.onContainerClick}
        onDragEnter={this.onTableDragEnter}
        onDragOver={this.onTableDragOver}
        onDragLeave={this.onTableDragLeave}
        onDrop={this.tableDrop}
      >
        <table>
          <thead onMouseDown={this.onThreadMouseDown} onContextMenu={this.onThreadContextMenu}>
            <tr>
              <th width="3%" className="pl10">
                <input type="checkbox" className="vam" onChange={this.props.onAllItemSelected} checked={this.props.isAllItemSelected}/>
              </th>
              <th width="3%" className="pl10">{/*icon */}</th>
              <th width="5%" className="pl10">{/*star */}</th>
              <th width="39%"><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a></th>
              <th width="6%">{/*tag */}</th>
              <th width="18%">{/*operation */}</th>
              <th width="11%"><a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBySize && sortIcon}</a></th>
              <th width="15%"><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortByTime && sortIcon}</a></th>
            </tr>
          </thead>
          <tbody>
            {direntList.map((dirent, index) => {
              return (
                <DirentListItem
                  ref={this.setDirentItemRef(index)}
                  key={index}
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
                  onFileTagChanged={this.props.onFileTagChanged}
                  getDirentItemMenuList={this.getDirentItemMenuList}
                  showDirentDetail={this.props.showDirentDetail}
                  onItemsMove={this.props.onItemsMove}
                />
              );
            })}
          </tbody>
        </table>
        <Fragment>
          <ContextMenu 
            id={'dirent-container-menu'}
            onMenuItemClick={this.onContainerMenuItemClick}
          />
          <ContextMenu 
            id={'dirent-item-menu'}
            onMenuItemClick={this.onMenuItemClick}
            onShowMenu={this.onShowMenu}
            onHideMenu={this.onHideMenu}
          />
          <ContextMenu
            id={'dirents-menu'}
            onMenuItemClick={this.onDirentsMenuItemClick}
          />
          {this.state.isImagePopupOpen && (
            <ModalPortal>
              <ImageDialog
                imageItems={this.state.imageItems}
                imageIndex={this.state.imageIndex}
                closeImagePopup={this.closeImagePopup}
                moveToPrevImage={this.moveToPrevImage}
                moveToNextImage={this.moveToNextImage}
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
                onAddFile={this.onAddFile}
                checkDuplicatedName={this.checkDuplicatedName}
                addFileCancel={this.onCreateFileToggle}
              />
            </ModalPortal>
          )}
          {this.state.isMoveDialogShow && 
            <MoveDirentDialog 
              path={this.props.path}
              repoID={this.props.repoID}
              repoEncrypted={this.props.currentRepoInfo.encrypted}
              isMutipleOperation={this.state.isMutipleOperation}
              selectedDirentList={this.props.selectedDirentList}
              onItemsMove={this.props.onItemsMove}
              onCancelMove={this.onMoveToggle}
            />
          }
          {this.state.isCopyDialogShow &&
            <CopyDirentDialog
              path={this.props.path}
              repoID={this.props.repoID}
              repoEncrypted={this.props.currentRepoInfo.encrypted}
              selectedDirentList={this.props.selectedDirentList}
              isMutipleOperation={this.state.isMutipleOperation}
              onItemsCopy={this.props.onItemsCopy}
              onCancelCopy={this.onCopyToggle}
            />
          }
          {this.state.isProgressDialogShow &&
            <ZipDownloadDialog progress={this.state.progress} onCancelDownload={this.onCancelDownload} />
          }
        </Fragment>
      </div>
    );
  }
}

DirentListView.propTypes = propTypes;

export default DirentListView;
