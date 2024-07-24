import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { siteRoot, username, enableSeadoc } from '../../utils/constants';
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
  fullDirentList: PropTypes.array,
  selectedDirentList: PropTypes.array.isRequired,
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
  isDirentDetailShow: PropTypes.bool.isRequired,
  onGridItemClick: PropTypes.func,
  repoTags: PropTypes.array.isRequired,
  onFileTagChanged: PropTypes.func,
  onAddFolder: PropTypes.func.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
  onItemRename: PropTypes.func.isRequired,
  posX: PropTypes.number,
  posY: PropTypes.number,
  dirent: PropTypes.object,
  getMenuContainerSize: PropTypes.func,
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
      isShareDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isEditFileTagShow: false,
      isZipDialogOpen: false,
      isRenameDialogShow: false,
      isCreateFolderDialogShow: false,
      isCreateFileDialogShow: false,
      fileType: '',
      isPermissionDialogOpen: false,

      isMutipleOperation: true,
      isGridItemFreezed: false,
      activeDirent: null,
      downloadItems: [],
    };
    this.isRepoOwner = props.currentRepoInfo.owner_email === username;
  }

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
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(this.props.dirent);
    let exportToDocxUrl = serviceUrl + '/repo/sdoc_export_to_docx/' + repoID + '/?file_path=' + filePath;
    window.location.href = exportToDocxUrl;
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
      case 'Convert to sdoc':
        this.onItemConvert(currentObject, event, 'sdoc');
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
      case 'New SeaDoc File':
        this.onCreateFileToggle('.sdoc');
        break;
      case 'Access Log':
        this.onAccessLog(currentObject);
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

  onEditFileTagToggle = () => {
    this.setState({
      isEditFileTagShow: !this.state.isEditFileTagShow
    });
  };

  onFileTagChanged = () => {
    let dirent = this.state.activeDirent ? this.state.activeDirent : '';
    let direntPath = Utils.joinPath(this.props.path, dirent.name);
    this.props.onFileTagChanged(dirent, direntPath);
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

    this.setState({
      isZipDialogOpen: true,
      downloadItems: selectedDirentNames
    });
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
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
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
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onHistory = (currentObject) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(currentObject);
    let url = URLDecorator.getUrl({ type: 'file_revisions', repoID: repoID, filePath: filePath });
    location.href = url;
  };

  onAccessLog = (currentObject) => {
    let filePath = this.getDirentPath(currentObject);
    let path = siteRoot + 'repo/file-access/' + this.props.repoID + '/?p=' + encodeURIComponent(filePath) ;
    window.open(path);
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
    const name = item.name;
    const repoID = this.props.repoID;
    const path = Utils.encodePath(Utils.joinPath(this.props.path, name));

    const src = `${siteRoot}repo/${repoID}/raw${path}`;

    return {
      'name': name,
      'url': `${siteRoot}lib/${repoID}/file${path}`,
      'src': src
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

  checkDuplicatedName = (newName) => {
    return Utils.checkDuplicatedNameInList(this.props.direntList, newName);
  };

  // common contextmenu handle
  onMouseDown = (event) => {
    if (event.button === 2) {
      event.stopPropagation();
      return;
    }
  };

  onGridContainerMouseDown = (event) => {
    this.onMouseDown(event);

    if (event.button === 0) {
      hideMenu();
      this.props.onGridItemClick(null);
    }
  };

  onGridItemMouseDown = (event) => {
    this.onMouseDown(event);
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
      NEW_FOLDER, NEW_FILE,
      NEW_MARKDOWN_FILE,
      NEW_EXCEL_FILE,
      NEW_POWERPOINT_FILE,
      NEW_WORD_FILE,
      NEW_SEADOC_FILE
    } = TextTranslation;

    let direntsContainerMenuList = [
      NEW_FOLDER, NEW_FILE, 'Divider',
      NEW_MARKDOWN_FILE,
      NEW_EXCEL_FILE,
      NEW_POWERPOINT_FILE,
      NEW_WORD_FILE
    ];
    const { currentRepoInfo, selectedDirentList } = this.props;

    if (enableSeadoc && !currentRepoInfo.encrypted) {
      direntsContainerMenuList.push(NEW_SEADOC_FILE);
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
    this.handleContextClick(event, GRID_ITEM_CONTEXTMENU_ID, menuList, dirent);
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

  render() {
    let { direntList, selectedDirentList, path } = this.props;
    let dirent = this.state.activeDirent ? this.state.activeDirent : '';
    let direntPath = Utils.joinPath(path, dirent.name);

    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }

    return (
      <Fragment>
        <ul className="grid-view" onContextMenu={this.onGridContainerContextMenu} onMouseDown={this.onGridContainerMouseDown}>
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
            repoEncrypted={this.props.currentRepoInfo.encrypted}
            isMutipleOperation={this.state.isMutipleOperation}
            selectedDirentList={selectedDirentList}
            onItemsMove={this.props.onItemsMove}
            onCancelMove={this.onMoveToggle}
            dirent={this.state.activeDirent}
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
            repoEncrypted={this.props.currentRepoInfo.encrypted}
            isMutipleOperation={this.state.isMutipleOperation}
            selectedDirentList={selectedDirentList}
            onItemsCopy={this.props.onItemsCopy}
            onCancelCopy={this.onCopyToggle}
          />
        }
        {this.state.isEditFileTagShow &&
          <EditFileTagDialog
            repoID={this.props.repoID}
            fileTagList={dirent.file_tags}
            filePath={direntPath}
            toggleCancel={this.onEditFileTagToggle}
            repoTags={this.props.repoTags}
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
