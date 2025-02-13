import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, name, fileServerRoot, useGoFileserver } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';
import EditFileTagDialog from '../dialog/edit-filetag-dialog';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import ShareDialog from '../dialog/share-dialog';
import Rename from '../dialog/rename-dirent';
import LibSubFolderPermissionDialog from '../dialog/lib-sub-folder-permission-dialog';
import ModalPortal from '../modal-portal';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import toaster from '../toast';
import FileAccessLog from '../dialog/file-access-log';

import '../../css/selected-dirents-toolbar.css';
import { TAGS_MODE } from '../dir-view-mode/constants';
import TagFilesToolbar from './tag-files-toolbar';

const propTypes = {
  path: PropTypes.string.isRequired,
  userPerm: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
  repoTags: PropTypes.array.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
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
      isZipDialogOpen: false,
      isFileAccessLogDialogOpen: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isMultipleOperation: true,
      showLibContentViewDialogs: false,
      showShareDialog: false,
      showEditFileTagDialog: false,
      fileTagList: [],
      multiFileTagList: [],
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
    let { path, repoID, selectedDirentList } = this.props;
    if (selectedDirentList.length) {
      if (selectedDirentList.length === 1 && !selectedDirentList[0].isDir()) {
        let direntPath = Utils.joinPath(path, selectedDirentList[0].name);
        let url = URLDecorator.getUrl({ type: 'download_file_url', repoID: repoID, filePath: direntPath });
        location.href = url;
        return;
      }
      if (useGoFileserver) {
        const target = this.props.selectedDirentList.map(dirent => dirent.name);
        seafileAPI.zipDownload(repoID, path, target).then((res) => {
          const zipToken = res.data['zip_token'];
          location.href = `${fileServerRoot}zip/${zipToken}`;
        }).catch((error) => {
          let errorMsg = Utils.getErrorMsg(error);
          this.setState({
            isLoading: false,
            errorMsg: errorMsg
          });
        });
      } else {
        this.setState({
          isZipDialogOpen: true
        });
      }
    }
  };

  closeZipDialog = () => {
    this.setState({
      isZipDialogOpen: false
    });
  };

  checkDuplicatedName = (newName) => {
    return Utils.checkDuplicatedNameInList(this.props.direntList, newName);
  };

  onItemRename = (newName) => {
    const dirent = this.props.selectedDirentList[0];
    this.props.onItemRename(dirent, newName);
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

  getDirentMenuList = (dirent) => {
    const isRepoOwner = this.props.isRepoOwner;
    const currentRepoInfo = this.props.currentRepoInfo;
    const isContextmenu = true;
    let opList = Utils.getDirentOperationList(isRepoOwner, currentRepoInfo, dirent, isContextmenu);
    const list = ['Move', 'Copy', 'Delete', 'Download'];
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
      case 'Share':
        this.setState({
          showLibContentViewDialogs: true,
          showShareDialog: true,
        });
        break;
      case 'Rename':
        this.setState({
          showLibContentViewDialogs: true,
          isRenameDialogOpen: true
        });
        break;
      case 'Permission':
        this.onPermissionItem();
        break;
      case 'Tags':
        this.listFileTags(dirent);
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
      showEditFileTagDialog: false,
      isRenameDialogOpen: false,
      isPermissionDialogOpen: false,
    });
  };

  listFileTags = (dirent) => {
    let filePath = this.getDirentPath(dirent);
    seafileAPI.listFileTags(this.props.repoID, filePath).then(res => {
      let fileTagList = res.data.file_tags;
      for (let i = 0, length = fileTagList.length; i < length; i++) {
        fileTagList[i].id = fileTagList[i].file_tag_id;
      }
      this.setState({
        fileTagList: fileTagList,
        showLibContentViewDialogs: true,
        showEditFileTagDialog: true,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onMenuFileTagChanged = () => {
    this.listFileTags(this.props.selectedDirentList[0]);
    let length = this.props.selectedDirentList.length;
    for (let i = 0; i < length; i++) {
      const dirent = this.props.selectedDirentList[i];
      const direntPath = this.getDirentPath(dirent);
      this.props.onFilesTagChanged(dirent, direntPath);
    }
  };

  getDirentPath = (dirent) => {
    if (dirent) return Utils.joinPath(this.props.path, dirent.name);
  };

  render() {
    const { repoID, repoTags, userPerm, selectedDirentList } = this.props;
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
    const isTagView = this.props.currentMode === TAGS_MODE;

    if (isTagView) {
      return <TagFilesToolbar />;
    }
    return (
      <Fragment>
        <div className="selected-dirents-toolbar">
          <span className="cur-view-path-btn px-2" onClick={this.props.unSelectDirent}>
            <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
            <span>{selectedLen}{' '}{gettext('selected')}</span>
          </span>
          {canModify &&
            <span className="cur-view-path-btn" onClick={this.onMoveToggle}>
              <span className="sf3-font-move1 sf3-font" aria-label={gettext('Move')} title={gettext('Move')}></span>
            </span>
          }
          {canCopy &&
            <span className="cur-view-path-btn" onClick={this.onCopyToggle}>
              <span className="sf3-font-copy1 sf3-font" aria-label={gettext('Copy')} title={gettext('Copy')}></span>
            </span>
          }
          {canDelete &&
            <span className="cur-view-path-btn" onClick={this.onItemsDelete}>
              <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')}></span>
            </span>
          }
          {canDownload &&
            <span className="cur-view-path-btn" onClick={this.onItemsDownload}>
              <span className="sf3-font-download1 sf3-font" aria-label={gettext('Download')} title={gettext('Download')}></span>
            </span>
          }
          {selectedLen === 1 &&
            <ItemDropdownMenu
              item={this.props.selectedDirentList[0]}
              toggleClass={'cur-view-path-btn sf3-font-more-vertical sf3-font'}
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
        {this.state.isZipDialogOpen &&
        <ModalPortal>
          <ZipDownloadDialog
            repoID={this.props.repoID}
            path={this.props.path}
            target={this.props.selectedDirentList.map(dirent => dirent.name)}
            toggleDialog={this.closeZipDialog}
          />
        </ModalPortal>
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
            {this.state.showEditFileTagDialog &&
              <ModalPortal>
                <EditFileTagDialog
                  repoID={repoID}
                  repoTags={repoTags}
                  filePath={direntPath}
                  fileTagList={this.state.fileTagList}
                  toggleCancel={this.toggleCancel}
                  onFileTagChanged={this.onMenuFileTagChanged}
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
