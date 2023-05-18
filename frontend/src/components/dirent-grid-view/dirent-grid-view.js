import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, thumbnailSizeForOriginal, username, isPro, enableFileComment, fileAuditEnabled, folderPermEnabled, canGenerateShareLink } from '../../utils/constants';
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
import EditFileTagDialog from '../dialog/edit-filetag-dialog';
import Rename from '../../components/dialog/rename-dirent';
import CreateFile from '../dialog/create-file-dialog';
import CreateFolder from '../dialog/create-folder-dialog';
import LibSubFolderPermissionDialog from '../dialog/lib-sub-folder-permission-dialog';
import toaster from '../toast';

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
  userPerm: PropTypes.string, // current path's user permission
  enableDirPrivateShare: PropTypes.bool.isRequired,
  updateDirent: PropTypes.func.isRequired,
  isDirentDetailShow: PropTypes.bool.isRequired,
  onGridItemClick: PropTypes.func,
  onFileTagChanged: PropTypes.func,
  onAddFolder: PropTypes.func.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
};

class DirentGridView extends React.Component{
  constructor(props) {
    super(props);
    this.state = {
      isImagePopupOpen: false,
      imageItems: [],
      imageIndex: 0,
      // onmenuClick
      isShareDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isEditFileTagShow: false,
      isZipDialogOpen: false,
      isRenameDialogShow: false,
      isCreateFolderDialogShow: false,
      isCreateFileDialogShow: false,
      isPermissionDialogOpen: false,

      isMutipleOperation: false,
      isGridItemFreezed: false,
      activeDirent: null,
    };
    this.isRepoOwner = props.currentRepoInfo.owner_email === username;
  }

  onCreateFileToggle = () => {
    this.setState({
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
    });
  }

  onGridItemClick = (dirent) => {
    hideMenu();
    this.setState({activeDirent: dirent});
    this.props.onGridItemClick(dirent);
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
      case 'Tags':
        this.onEditFileTagToggle();
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
        this.onCommentItem();
        break;
      case 'History':
        this.onHistory(currentObject);
        break;
      case 'New Folder':
        this.onCreateFolderToggle(currentObject);
        break;
      case 'New File':
        this.onCreateFileToggle(currentObject);
        break;
      case 'Access Log':
        this.onAccessLog(currentObject);
        break;
      case 'Open via Client':
        this.onOpenViaClient(currentObject);
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
    let dirent = this.state.activeDirent ? this.state.activeDirent : '';
    let direntPath = Utils.joinPath(this.props.path, dirent.name);
    this.props.onFileTagChanged(dirent, direntPath);
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
    this.setState({isPermissionDialogOpen: !this.state.isPermissionDialogOpen});
  }

  onLockItem = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    seafileAPI.lockfile(repoID, filePath).then(() => {
      this.props.updateDirent(currentObject, 'is_locked', true);
      this.props.updateDirent(currentObject, 'locked_by_me', true);
      let lockName = username.split('@');
      this.props.updateDirent(currentObject, 'lock_owner_name', lockName[0]);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onUnlockItem = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    seafileAPI.unlockfile(repoID, filePath).then(() => {
      this.props.updateDirent(currentObject, 'is_locked', false);
      this.props.updateDirent(currentObject, 'locked_by_me', false);
      this.props.updateDirent(currentObject, 'lock_owner_name', '');
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onCommentItem = () => {
    this.props.showDirentDetail('comments');
  }

  onHistory = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    let url = URLDecorator.getUrl({type: 'file_revisions', repoID: repoID, filePath: filePath});
    location.href = url;
  }

  onAccessLog = (currentObject) => {
    let filePath = this.getDirentPath(currentObject);
    let path = siteRoot + 'repo/file-access/' + this.props.repoID + '/?p=' + encodeURIComponent(filePath) ;
    window.open(path);
  }

  onOpenViaClient = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    let url = URLDecorator.getUrl({type: 'open_via_client', repoID: repoID, filePath: filePath});
    location.href = url;
  }

  onItemRename = (newName) => {
    this.props.onItemRename(this.state.activeDirent, newName);
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
  }

  closeImagePopup = () => {
    this.setState({isImagePopupOpen: false});
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
    return Utils.checkDuplicatedNameInList(this.props.direntList, newName);
  }

  // common contextmenu handle
  onMouseDown = (event) => {
    event.stopPropagation();
    if (event.button === 2) {
      return;
    }
  }

  onGridContainerMouseDown = (event) => {
    this.onMouseDown(event);
  }

  onGridItemMouseDown = (event) => {
    this.onMouseDown(event);
  }

  gridContainerClick = () => {
    hideMenu();
    if (!this.props.isDirentDetailShow) {
      this.onGridItemClick(null);
    }
  }

  onGridContainerContextMenu = (event) => {
    event.preventDefault();
    // Display menu items based on the permissions of the current path
    let permission = this.props.userPerm;
    if (permission !== 'admin' && permission !== 'rw') {
      return;
    }
    let id = 'dirent-grid-container-menu';
    let menuList = [TextTranslation.NEW_FOLDER, TextTranslation.NEW_FILE];
    this.handleContextClick(event, id, menuList);
  }

  onGridItemContextMenu = (event, dirent) => {
    // Display menu items according to the current dirent permission
    let id = 'grid-item-contextmenu';
    let menuList = this.getDirentItemMenuList(dirent, true);
    this.handleContextClick(event, id, menuList, dirent);
    this.props.onGridItemClick && this.props.onGridItemClick(dirent);
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

    if (menuList.length === 0) {
      return;
    }

    showMenu(showMenuConfig);
  }

  getDirentItemMenuList = (dirent, isContextmenu) => {
    const isRepoOwner = this.isRepoOwner;
    const currentRepoInfo = this.props.currentRepoInfo;
    return Utils.getDirentOperationList(isRepoOwner, currentRepoInfo, dirent, isContextmenu);
  }

  render() {
    let {direntList, path} = this.props;
    let dirent = this.state.activeDirent ? this.state.activeDirent : '';
    let direntPath = Utils.joinPath(path, dirent.name);

    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }

    return (
      <Fragment>
        <ul className="grid-view" onClick={this.gridContainerClick} onContextMenu={this.onGridContainerContextMenu} onMouseDown={this.onGridContainerMouseDown}>
          {
            direntList.length !== 0 && direntList.map((dirent, index) => {
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
              );
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
        {this.state.isEditFileTagShow &&
          <EditFileTagDialog
            repoID={this.props.repoID}
            fileTagList={dirent.file_tags}
            filePath={direntPath}
            toggleCancel={this.onEditFileTagToggle}
            onFileTagChanged={this.onFileTagChanged}
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
    );
  }
}

DirentGridView.propTypes = propTypes;

export default DirentGridView;
