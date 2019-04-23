import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, thumbnailSizeForOriginal, username, isPro, enableFileComment, fileAuditEnabled, folderPermEnabled } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import Loading from '../loading';
import ModalPortal from '../modal-portal';
import ImageDialog from '../../components/dialog/image-dialog';
import DirentGridItem from '../../components/dirent-grid-view/dirent-grid-item';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, showMenu } from '../context-menu/actions';
import TextTranslation from '../../utils/text-translation';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';
import ShareDialog from '../dialog/share-dialog';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import Rename from '../../components/dialog/rename-grid-item-dialog';
import CreateFile from '../dialog/create-file-dialog';
import CreateFolder from '../dialog/create-folder-dialog';

import '../../css/grid-view.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object,
  direntList: PropTypes.array.isRequired,
  onAddFile: PropTypes.func,
  onItemDelete: PropTypes.func,
  onItemCopy: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  showShareBtn: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  updateDirent: PropTypes.func.isRequired,
  isDirentDetailShow: PropTypes.bool.isRequired,
  onGridItemClick: PropTypes.func,
  onAddFolder: PropTypes.func.isRequired,
  onPageScroll: PropTypes.func.isRequired,
  itemShownLimit: PropTypes.bool.isRequired
};

class DirentGridView extends React.Component{
  constructor(props) {
    super(props);
    this.state={
      isImagePopupOpen: false,
      imageItems: [],
      imageIndex: 0,
      // onmenuClick 
      isShareDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isZipDialogOpen: false,
      isRenameDialogShow: false,
      isCreateFolderDialogShow: false,
      isCreateFileDialogShow: false,

      isMutipleOperation: false,
      isGridItemFreezed: false,
      activeDirent: null,
      itemIdex: 100,
    }
    this.isRepoOwner = props.currentRepoInfo.owner_email === username;
  }

  componentDidMount() {
    window.addEventListener('scroll', this.gridViewScroll, true);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.itemShownLimit) {
      this.setState({itemIdex: 100});
    }
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.gridViewScroll, true);
  }

  onCreateFileToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
    });
  }

  onGridItemClick = (dirent) => {
    this.setState({activeDirent: dirent});
    this.props.onGridItemClick(dirent);
  }
 
  gridViewScroll = (e) => {
    let target = e.target;
    let itemIdex = this.state.itemIdex;

    if (target.scrollTop + document.documentElement.clientHeight - target.offsetTop >= target.scrollHeight) {
      itemIdex += 100
      this.setState({itemIdex: itemIdex})
    }
    this.props.onPageScroll();
  }

  onMoveToggle = () => {
    this.setState({isMoveDialogShow: !this.state.isMoveDialogShow});
  }

  onCopyToggle = () => {
    this.setState({isCopyDialogShow: !this.state.isCopyDialogShow});
  }

  onAddFile = (filePath, isDraft) => {
    this.setState({isCreateFileDialogShow: false});
    this.props.onAddFile(filePath, isDraft);
  }

  onAddFolder = (dirPath) => {
    this.setState({isCreateFolderDialogShow: false});
    this.props.onAddFolder(dirPath);
  }

  onItemShare = (e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  }

  closeSharedDialog = () => {
    this.setState({isShareDialogShow: !this.state.isShareDialogShow});
  }

  onItemDelete = (currentObject, e) => {
    e.nativeEvent.stopImmediatePropagation(); //for document event
    this.props.onItemDelete(currentObject);
  }

  onMenuItemClick = (operation, currentObject, event) => {
    hideMenu();
    switch(operation) {
      case 'Download': 
        this.onItemDownload(currentObject, event);
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
      case 'Permission':
        this.onPermissionItem();
        break;
      case 'Unlock':
        this.onUnlockItem(currentObject);
        break;
      case 'Lock':
        this.onLockItem(currentObject);
        break;
      case 'Comment':
        this.onComnentItem();
        break;
      case 'History':
        this.onHistory(currentObject);
        break;
      case 'Details':
        this.onDetails(currentObject);
        break;
      case 'New Folder':
        this.onCreateFolderToggle(currentObject);
        break;
      case 'New File':
        this.onCreateFileToggle(currentObject);
        break;
      case 'Access Log':
        this.onAccessLog();
        break;
      case 'Open via Client':
        this.onOpenViaClient(currentObject);
        break;
      default:
        break;
    }
  }

  getDirentPath = (dirent) => {
    let path = this.props.path;
    return path === '/' ? path + dirent.name : path + '/' + dirent.name;
  }

  closeZipDialog = () => {
    this.setState({
      isZipDialogOpen: false
    });
  }

  onDetails = (dirent) => {
    this.props.onGridItemClick(dirent)
    this.props.showDirentDetail();
  }

  onItemDownload = (currentObject, e) => {
    e.nativeEvent.stopImmediatePropagation();
    let dirent = currentObject;
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

  onCreateFolderToggle = () => {
    this.setState({
      isCreateFolderDialogShow: !this.state.isCreateFolderDialogShow,
    });
  }

  onItemRenameToggle = () => {
    this.setState({
      isRenameDialogShow: !this.state.isRenameDialogShow,
    });
  }

  onItemMoveToggle = () => {
    this.setState({isMoveDialogShow: !this.state.isMoveDialogShow});
  }

  onItemCopyToggle = () => {
    this.setState({isCopyDialogShow: !this.state.isCopyDialogShow});
  }

  onPermissionItem = () => {

  }

  onLockItem = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    seafileAPI.lockfile(repoID, filePath).then(() => {
      this.props.updateDirent(currentObject, 'is_locked', true);
      this.props.updateDirent(currentObject, 'locked_by_me', true);
    });
  }

  onUnlockItem = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    seafileAPI.unlockfile(repoID, filePath).then(() => {
      this.props.updateDirent(currentObject, 'is_locked', false);
      this.props.updateDirent(currentObject, 'locked_by_me', false);
    });
  }

  onComnentItem = () => {

  }

  onHistory = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    let url = URLDecorator.getUrl({type: 'file_revisions', repoID: repoID, filePath: filePath});
    location.href = url;
  }
  
  onAccessLog = () => {

  }

  onOpenViaClient = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    let url = URLDecorator.getUrl({type: 'open_via_client', repoID: repoID, filePath: filePath});
    location.href = url;
  }

  onItemRename = (newName) => {
    this.setState({
      isRenameDialogShow: !this.state.isRenameDialogShow,
    });
    this.props.onItemRename(this.state.activeDirent, newName)
  }


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

  closeImagePopup = () => {
    this.setState({isImagePopupOpen: false})
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

  checkDuplicatedName = (newName) => {
    let direntList = this.props.direntList;
    let isDuplicated = direntList.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  }

  // common contextmenu handle
  onMouseDown = (event) => {
    event.stopPropagation();
    if (event.button === 2) {
      return;
    }
  }

  onGridContainerMouseDown = (event) => {
    this.onMouseDown(event)
  }

  onGridItemMouseDown = (event) => {
    this.onMouseDown(event);
  }

  gridContainerClick = () => {
    if (!this.props.isDirentDetailShow) {
      this.onGridItemClick(null);
    }
  }

  onGridContainerContextMenu = (event) => {
      let id = "dirent-grid-container-menu"
      let menuList = [TextTranslation.NEW_FOLDER, TextTranslation.NEW_FILE];
      this.handleContextClick(event, id, menuList);
  }

  onGridItemContextMenu = (event, dirent) => {
    let id = 'grid-item-contextmenu';
    let menuList = this.getDirentItemMenuList(dirent, true);
    this.handleContextClick(event, id, menuList, dirent);
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
    
    this.setState({activeDirent: currentObject});

    let showMenuConfig = {
      id: id,
      position: { x, y },
      target: event.target,
      currentObject: currentObject,
      menuList: menuList,
    };

    showMenu(showMenuConfig);
  }

  getDirentItemMenuList = (dirent, isContextmenu) => {

    let isRepoOwner = this.isRepoOwner;
    let currentRepoInfo = this.props.currentRepoInfo;
    let can_set_folder_perm = folderPermEnabled  && ((isRepoOwner && currentRepoInfo.has_been_shared_out) || currentRepoInfo.is_admin);

    let type = dirent.type;
    let permission = dirent.permission;

    let menuList = [];
    let contextmenuList = [];
    if (isContextmenu) {
      let { SHARE, DOWNLOAD, DELETE } = TextTranslation;
      contextmenuList = this.props.showShareBtn ? [SHARE, DOWNLOAD, DELETE, 'Divider'] : [DOWNLOAD, DELETE, 'Divider'];
    }

    let { RENAME, MOVE, COPY, PERMISSION, DETAILS, OPEN_VIA_CLIENT, LOCK, UNLOCK, COMMENT, HISTORY, ACCESS_LOG } = TextTranslation;
    if (type === 'dir' && permission === 'rw') {
      if (can_set_folder_perm) {
        menuList = [...contextmenuList, RENAME, MOVE, COPY, 'Divider', PERMISSION, DETAILS, 'Divider', OPEN_VIA_CLIENT];
      } else {
        menuList = [...contextmenuList, RENAME, MOVE, COPY, 'Divider', DETAILS, 'Divider', OPEN_VIA_CLIENT];
      }
      return menuList;
    }

    if (type === 'dir' && permission === 'r') {
      menuList = currentRepoInfo.encrypted ? [...contextmenuList, COPY, DETAILS] : [DETAILS];
      return menuList;
    }

    if (type === 'file' && permission === 'rw') {
      menuList = [...contextmenuList];
      if (!dirent.is_locked || (dirent.is_locked && dirent.locked_by_me)) {
        menuList.push(RENAME);
        menuList.push(MOVE);
      }
      menuList.push(COPY);
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
      if (fileAuditEnabled) {
        menuList.push(ACCESS_LOG);
      }
      menuList.push(DETAILS);
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
      menuList.push(DETAILS);
      return menuList;
    }

    return [];
  }

  render() {
    let {direntList, path} = this.props;
    let dirent = this.state.activeDirent ? this.state.activeDirent : '';
    let direntPath = Utils.joinPath(path, dirent.name);

    let direntItemsList = direntList.filter((item, index) => {
      return index < this.state.itemIdex;
    })

    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }
  
    return (
      <Fragment>
        <ul className="grid-view" onClick={this.gridContainerClick} onContextMenu={this.onGridContainerContextMenu} onMouseDown={this.onGridContainerMouseDown}  onScroll={this.gridViewScroll}>
          {
            direntItemsList.map((dirent, index) => {
              return (
                <DirentGridItem
                  key={index}
                  dirent={dirent}
                  repoID={this.props.repoID}
                  path={this.props.path}
                  onItemClick={this.props.onItemClick}
                  currentRepoInfo={this.props.currentRepoInfo}
                  showImagePopup={this.showImagePopup}
                  onGridItemContextMenu={this.onGridItemContextMenu}
                  onItemMove={this.props.onItemMove}
                  onGridItemMouseDown={this.onGridItemMouseDown}
                  onGridItemClick={this.onGridItemClick}
                  activeDirent={this.state.activeDirent}
                />
              )
            })
          }
        </ul>
        <ContextMenu 
          id={'grid-item-contextmenu'}
          onMenuItemClick={this.onMenuItemClick}
        />
        <ContextMenu 
          id={'dirent-grid-container-menu'}
          onMenuItemClick={this.onMenuItemClick}
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
            onItemMove={this.props.onItemMove}
            onCancelMove={this.onMoveToggle}
            dirent={this.state.activeDirent}
          />
        }
        {this.state.isZipDialogOpen &&
          <ModalPortal>
            <ZipDownloadDialog
              repoID={this.props.repoID}
              path={this.props.path}
              target={dirent.name}
              toggleDialog={this.closeZipDialog}
            />
          </ModalPortal>
        }
        {this.state.isCopyDialogShow &&
          <CopyDirentDialog
            path={this.props.path}
            repoID={this.props.repoID}
            repoEncrypted={this.props.currentRepoInfo.encrypted}
            isMutipleOperation={this.state.isMutipleOperation}
            onItemCopy={this.props.onItemCopy}
            onCancelCopy={this.onCopyToggle}
            dirent={this.state.activeDirent}
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
              dirent={this.state.activeDirent}
              onRename={this.onItemRename}
              checkDuplicatedName={this.checkDuplicatedName}
              toggleCancel={this.onItemRenameToggle}
            />
          </ModalPortal>
        )}
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
      </Fragment>
    )
  }
}

DirentGridView.propTypes = propTypes;
export default DirentGridView;