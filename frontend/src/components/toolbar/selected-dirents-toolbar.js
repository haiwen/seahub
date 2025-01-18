import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, name, fileServerRoot, useGoFileserver } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import ShareDialog from '../dialog/share-dialog';
import Rename from '../dialog/rename-dirent';
import LibSubFolderPermissionDialog from '../dialog/lib-sub-folder-permission-dialog';
import ModalPortal from '../modal-portal';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import toaster from '../toast';
import FileAccessLog from '../dialog/file-access-log';
import { Dirent } from '../../models';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';

import '../../css/selected-dirents-toolbar.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  userPerm: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  eventBus: PropTypes.object.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  onItemsCopy: PropTypes.func.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  onFilesTagChanged: PropTypes.func.isRequired,
  unSelectDirent: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  currentMode: PropTypes.string.isRequired,
  direntList: PropTypes.array.isRequired,
  onItemRename: PropTypes.func.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
  isGroupOwnedRepo: PropTypes.bool.isRequired,
  onAddFolder: PropTypes.func.isRequired,
};

class SelectedDirentsToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isFileAccessLogDialogOpen: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isMultipleOperation: true,
      showLibContentViewDialogs: false,
      showShareDialog: false,
      fileTagList: [],
      isRenameDialogOpen: false,
      isPermissionDialogOpen: false
    };
  }

  onMoveToggle = () => {
    this.setState({ isMoveDialogShow: !this.state.isMoveDialogShow });
  };

  onCopyToggle = () => {
    this.setState({ isCopyDialogShow: !this.state.isCopyDialogShow });
  };

  onItemsDelete = () => {
    this.props.onItemsDelete();
  };

  onItemsDownload = () => {
    const { path, selectedDirentList, eventBus } = this.props;
    const direntList = selectedDirentList.map(dirent => dirent instanceof Dirent ? dirent.toJson() : dirent);
    eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_FILE, path, direntList);
  };

  checkDuplicatedName = (newName) => {
    return Utils.checkDuplicatedNameInList(this.props.direntList, newName);
  };

  onItemRename = (newName) => {
    const dirent = this.props.selectedDirentList[0];
    this.props.onItemRename(dirent, newName);
  };

  onToggleStarItem = () => {
    const { repoID, selectedDirentList } = this.props;
    const dirent = selectedDirentList[0];
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

  onPermissionItem = () => {
    this.setState({
      showLibContentViewDialogs: !this.state.showLibContentViewDialogs,
      isPermissionDialogOpen: !this.state.isPermissionDialogOpen
    });
  };

  onStartRevise = (dirent) => {
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(dirent);
    seafileAPI.sdocStartRevise(repoID, filePath).then((res) => {
      let url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(res.data.file_path);
      window.open(url);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  getDirentSharePerm = () => {
    const { selectedDirentList, currentRepoInfo } = this.props;
    const dirent = selectedDirentList[0];
    return Utils.isHasPermissionToShare(currentRepoInfo, dirent.permission, dirent);
  };

  shareDirent = () => {
    this.setState({
      showLibContentViewDialogs: true,
      showShareDialog: true
    });
  };

  getDirentMenuList = (dirent) => {
    const isRepoOwner = this.props.isRepoOwner;
    const currentRepoInfo = this.props.currentRepoInfo;
    const isContextmenu = true;
    let opList = Utils.getDirentOperationList(isRepoOwner, currentRepoInfo, dirent, isContextmenu);
    const list = ['Move', 'Copy', 'Delete', 'Download', 'Share'];
    if (dirent.type == 'dir') {
      opList = opList.filter((item, index) => {
        return list.indexOf(item.key) == -1 && item != 'Divider';
      });
    } else {
      opList = opList.filter((item, index) => {
        return list.indexOf(item.key) == -1;
      });
    }
    return opList;
  };

  onMenuItemClick = (operation) => {
    const dirents = this.props.selectedDirentList;
    const dirent = dirents[0];
    switch (operation) {
      case 'Rename':
        this.setState({
          showLibContentViewDialogs: true,
          isRenameDialogOpen: true
        });
        break;
      case 'Star':
        this.onToggleStarItem();
        break;
      case 'Unstar':
        this.onToggleStarItem();
        break;
      case 'Permission':
        this.onPermissionItem();
        break;
      case 'Lock':
        this.lockFile(dirent);
        break;
      case 'Unlock':
        this.unlockFile(dirent);
        break;
      case 'History':
        this.onHistory(dirent);
        break;
      case 'Access Log':
        this.toggleFileAccessLogDialog();
        break;
      case 'Properties':
        this.props.showDirentDetail('info');
        break;
      case 'Open via Client':
        this.onOpenViaClient(dirent);
        break;
      case 'Convert to Markdown': {
        this.props.onItemConvert(dirent, 'markdown');
        break;
      }
      case 'Convert to docx': {
        this.props.onItemConvert(dirent, 'docx');
        break;
      }
      case 'Convert to sdoc': {
        this.props.onItemConvert(dirent, 'sdoc');
        break;
      }
      case 'Export docx': {
        this.exportDocx(dirent);
        break;
      }
      case 'Export sdoc': {
        this.exportSdoc(dirent);
        break;
      }
      default:
        break;
    }
  };

  exportDocx = (dirent) => {
    const serviceUrl = window.app.config.serviceURL;
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(dirent);
    let exportToDocxUrl = serviceUrl + '/repo/sdoc_export_to_docx/' + repoID + '/?file_path=' + filePath;
    window.location.href = exportToDocxUrl;
  };

  exportSdoc = (dirent) => {
    const serviceUrl = window.app.config.serviceURL;
    let repoID = this.props.repoID;
    let filePath = this.getDirentPath(dirent);
    let exportToSdocUrl = serviceUrl + '/lib/' + repoID + '/file/' + filePath + '?dl=1';
    window.location.href = exportToSdocUrl;
  };

  lockFile = (dirent) => {
    const filePath = this.getDirentPath(dirent);
    seafileAPI.lockfile(this.props.repoID, filePath).then((res) => {
      if (res.data.is_locked) {
        this.props.updateDirent(dirent, 'is_locked', true);
        this.props.updateDirent(dirent, 'locked_by_me', true);
        this.props.updateDirent(dirent, 'lock_owner_name', name);
        this.props.unSelectDirent();
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  unlockFile = (dirent) => {
    const filePath = this.getDirentPath(dirent);
    seafileAPI.unlockfile(this.props.repoID, filePath).then((res) => {
      if (!res.data.is_locked) {
        this.props.updateDirent(dirent, 'is_locked', false);
        this.props.updateDirent(dirent, 'locked_by_me', false);
        this.props.updateDirent(dirent, 'lock_owner_name', '');
        this.props.unSelectDirent();
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onOpenViaClient = (dirent) => {
    const filePath = this.getDirentPath(dirent);
    let url = URLDecorator.getUrl({
      type: 'open_via_client',
      repoID: this.props.repoID,
      filePath: filePath
    });
    location.href = url;
  };

  onHistory = (dirent) => {
    let filePath = this.getDirentPath(dirent);
    let url = URLDecorator.getUrl({
      type: 'file_revisions',
      repoID: this.props.repoID,
      filePath: filePath
    });
    location.href = url;
  };

  toggleFileAccessLogDialog = () => {
    this.setState({
      isFileAccessLogDialogOpen: !this.state.isFileAccessLogDialogOpen,
      showLibContentViewDialogs: !this.state.isFileAccessLogDialogOpen
    });
  };

  toggleCancel = () => {
    this.setState({
      showLibContentViewDialogs: false,
      showShareDialog: false,
      isRenameDialogOpen: false,
      isPermissionDialogOpen: false,
    });
  };

  getDirentPath = (dirent) => {
    if (dirent) return Utils.joinPath(this.props.path, dirent.name);
  };

  render() {
    const { repoID, userPerm, selectedDirentList } = this.props;
    const dirent = selectedDirentList[0];
    const selectedLen = selectedDirentList.length;
    const direntPath = this.getDirentPath(dirent);
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);

    let canModify = false;
    let canCopy = false;
    let canDelete = false;
    let canDownload = false;
    switch (userPerm) {
      case 'rw':
      case 'admin':
        canModify = true;
        canCopy = true;
        canDelete = true;
        canDownload = true;
        break;
      case 'cloud-edit':
        canModify = true;
        canCopy = true;
        canDelete = true;
        break;
      case 'r':
        canCopy = true;
        canDownload = true;
        break;
    }
    if (isCustomPermission) {
      const { permission } = customPermission;
      canModify = permission.modify;
      canCopy = permission.copy;
      canDownload = permission.download;
      canDelete = permission.delete;
    }

    return (
      <Fragment>
        <div className="selected-dirents-toolbar">
          <span className="cur-view-path-btn px-2" onClick={this.props.unSelectDirent}>
            <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
            <span>{selectedLen}{' '}{gettext('selected')}</span>
          </span>
          {canModify &&
            <span className="cur-view-path-btn sf3-font-move1 sf3-font" aria-label={gettext('Move')} title={gettext('Move')} onClick={this.onMoveToggle}></span>
          }
          {canCopy &&
            <span className="cur-view-path-btn sf3-font-copy1 sf3-font" aria-label={gettext('Copy')} title={gettext('Copy')} onClick={this.onCopyToggle}></span>
          }
          {canDelete &&
            <span className="cur-view-path-btn sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')} onClick={this.onItemsDelete}></span>
          }
          {canDownload &&
            <span className="cur-view-path-btn sf3-font-download1 sf3-font" aria-label={gettext('Download')} title={gettext('Download')} onClick={this.onItemsDownload}></span>
          }
          {selectedLen == 1 && this.getDirentSharePerm() &&
            <span className="cur-view-path-btn sf3-font-share sf3-font" aria-label={gettext('Share')} title={gettext('Share')} onClick={this.shareDirent}></span>
          }
          {selectedLen === 1 &&
            <ItemDropdownMenu
              item={this.props.selectedDirentList[0]}
              toggleClass={'cur-view-path-btn sf3-font-more sf3-font'}
              onMenuItemClick={this.onMenuItemClick}
              getMenuList={this.getDirentMenuList}
            />
          }
        </div>
        {this.state.isMoveDialogShow &&
          <MoveDirentDialog
            path={this.props.path}
            repoID={this.props.repoID}
            repoEncrypted={this.props.repoEncrypted}
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
            repoEncrypted={this.props.repoEncrypted}
            selectedDirentList={this.props.selectedDirentList}
            isMultipleOperation={this.state.isMultipleOperation}
            onItemsCopy={this.props.onItemsCopy}
            onCancelCopy={this.onCopyToggle}
            onAddFolder={this.props.onAddFolder}
          />
        }
        {this.state.showLibContentViewDialogs && (
          <Fragment>
            {this.state.showShareDialog &&
              <ModalPortal>
                <ShareDialog
                  itemType={dirent.type}
                  itemName={dirent.name}
                  itemPath={direntPath}
                  userPerm={dirent.permission}
                  repoID={repoID}
                  repoEncrypted={this.props.repoEncrypted}
                  enableDirPrivateShare={this.props.enableDirPrivateShare}
                  isGroupOwnedRepo={this.props.isGroupOwnedRepo}
                  toggleDialog={this.toggleCancel}
                />
              </ModalPortal>
            }
            {this.state.isRenameDialogOpen &&
              <ModalPortal>
                <Rename
                  dirent={dirent}
                  onRename={this.onItemRename}
                  checkDuplicatedName={this.checkDuplicatedName}
                  toggleCancel={this.toggleCancel}
                />
              </ModalPortal>
            }
            {this.state.isPermissionDialogOpen &&
              <ModalPortal>
                <LibSubFolderPermissionDialog
                  toggleDialog={this.toggleCancel}
                  repoID={repoID}
                  folderPath={direntPath}
                  folderName={dirent.name}
                  isDepartmentRepo={this.props.isGroupOwnedRepo}
                />
              </ModalPortal>
            }
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
        )}
      </Fragment>
    );
  }
}

SelectedDirentsToolbar.propTypes = propTypes;

export default SelectedDirentsToolbar;
