import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'reactstrap';
import { gettext, siteRoot, canGenerateShareLink, isPro, fileAuditEnabled, name } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import TextTranslation from '../../utils/text-translation';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';
import ShareDialog from '../dialog/share-dialog';
import RelatedFileDialogs from '../dialog/related-file-dialogs';
import EditFileTagDialog from '../dialog/edit-filetag-dialog';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import Rename from '../dialog/rename-dirent';
import LibSubFolderPermissionDialog from '../dialog/lib-sub-folder-permission-dialog';
import ViewModeToolbar from './view-mode-toolbar';

import ModalPortal from '../modal-portal';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import toaster from '../toast';

import '../../css/dirents-menu.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  userPerm: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
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
  switchViewMode: PropTypes.func.isRequired,
};

class MultipleDirOperationToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isZipDialogOpen: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isMutipleOperation: true,
      showLibContentViewDialogs: false,
      showShareDialog: false,
      showEditFileTagDialog: false,
      fileTagList: [],
      multiFileTagList: [],
      showRelatedFileDialog: false,
      viewMode: 'list_related_file',     
      isRenameDialogOpen: false,
      isPermissionDialogOpen: false
    };
  }

  onMoveToggle = () => {
    this.setState({isMoveDialogShow: !this.state.isMoveDialogShow});
  }

  onCopyToggle = () => {
    this.setState({isCopyDialogShow: !this.state.isCopyDialogShow});
  }

  onItemsDelete = () => {
    this.props.onItemsDelete();
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
      this.setState({
        isZipDialogOpen: true
      });
    }
  }

  closeZipDialog = () => {
    this.setState({
      isZipDialogOpen: false
    });
  }

  checkDuplicatedName = (newName) => {
    return Utils.checkDuplicatedNameInList(this.props.direntList, newName);
  }

  onItemRename = (newName) => {
    const dirent = this.props.selectedDirentList[0];
    this.props.onItemRename(dirent, newName);
  }

  onPermissionItem = () => {
    this.setState({
      showLibContentViewDialogs: !this.state.showLibContentViewDialogs,
      isPermissionDialogOpen: !this.state.isPermissionDialogOpen
    });
  }

  onCommentItem = () => {
    this.props.showDirentDetail('comments');
  }

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
  }

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
      case 'Comment':
        this.onCommentItem();
        break;
      case 'Related Files':
        this.openRelatedFilesDialog(dirent);
        break;
      case 'History':
        this.onHistory(dirent);
        break;
      case 'Access Log': 
        this.onAccessLog(dirent);
        break;
      case 'Open via Client':
        this.onOpenViaClient(dirent);
        break;
      default:
        break;
    }
  }

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
  }

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
  }

  onOpenViaClient = (dirent) => {
    const filePath = this.getDirentPath(dirent);
    let url = URLDecorator.getUrl({
      type: 'open_via_client',
      repoID: this.props.repoID,
      filePath: filePath
    });
    location.href = url;
  }

  onHistory = (dirent) => {
    let filePath = this.getDirentPath(dirent);
    let url = URLDecorator.getUrl({
      type: 'file_revisions',
      repoID: this.props.repoID,
      filePath: filePath
    });
    location.href = url;
  }

  onAccessLog = (dirent) => {
    let filePath = this.getDirentPath(dirent);
    let path = siteRoot + 'repo/file-access/' + this.props.repoID + '/?p=' + encodeURIComponent(filePath) ;
    window.open(path);
  }

  openRelatedFilesDialog = (dirent) => {
    let filePath = this.getDirentPath(dirent);
    seafileAPI.listRelatedFiles(this.props.repoID, filePath).then(res => {
      let relatedFiles = res.data.related_files;
      if (relatedFiles.length > 0) {
        this.setState({
          relatedFiles: relatedFiles,
          showLibContentViewDialogs: true,
          showRelatedFileDialog: true,
          viewMode: 'list_related_file',
        });
      } else {
        this.setState({
          relatedFiles: relatedFiles,
          showLibContentViewDialogs: true,
          showRelatedFileDialog: true,
          viewMode: 'add_related_file',
        });
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleCancel = () => {
    this.setState({
      showLibContentViewDialogs: false,
      showShareDialog: false,
      showEditFileTagDialog: false,
      showRelatedFileDialog: false,
      isRenameDialogOpen: false,
      isPermissionDialogOpen: false,
    });
  }

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
  }

  onMenuFileTagChanged = () => {
    this.listFileTags(this.props.selectedDirentList[0]);
    let length = this.props.selectedDirentList.length;
    for (let i = 0; i < length; i++) {
      const dirent = this.props.selectedDirentList[i];
      const direntPath = this.getDirentPath(dirent);
      this.props.onFilesTagChanged(dirent, direntPath);
    }
  }

  listRelatedFiles = (dirent) => {
    let filePath = this.getDirentPath(dirent);
    seafileAPI.listRelatedFiles(this.props.repoID, filePath).then(res => {
      this.setState({
        relatedFiles: res.data.related_files
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onRelatedFileChange = () => {
    this.listRelatedFiles(this.props.selectedDirentList[0]);
  }

  getDirentPath = (dirent) => {
    if (dirent) return Utils.joinPath(this.props.path, dirent.name);
  }

  render() {

    const { repoID, userPerm } = this.props;
    const dirent = this.props.selectedDirentList[0];

    let direntPath = this.getDirentPath(dirent);

    if (userPerm !== 'rw' && userPerm !== 'admin') {
      return '';
    }
    
    return (
      <Fragment>
        <div className="dir-operation">
          <div className="d-flex">
            <ButtonGroup className="flex-row group-operations">
              <Button className="secondary group-op-item action-icon sf2-icon-move" title={gettext('Move')} onClick={this.onMoveToggle}></Button>
              <Button className="secondary group-op-item action-icon sf2-icon-copy" title={gettext('Copy')} onClick={this.onCopyToggle}></Button>
              <Button className="secondary group-op-item action-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.onItemsDelete}></Button>
              <Button className="secondary group-op-item action-icon sf2-icon-download" title={gettext('Download')} onClick={this.onItemsDownload}></Button>
              {this.props.selectedDirentList.length === 1 &&
                <ItemDropdownMenu
                  tagName={'button'}
                  item={this.props.selectedDirentList[0]}
                  toggleClass={'fas fa-ellipsis-v dirents-more-menu'}
                  onMenuItemClick={this.onMenuItemClick}
                  getMenuList={this.getDirentMenuList}
                />
              }
            </ButtonGroup>
          </div>
        </div>
        {Utils.isDesktop() && <ViewModeToolbar currentMode={this.props.currentMode} switchViewMode={this.props.switchViewMode} />}
        {this.state.isMoveDialogShow && 
          <MoveDirentDialog 
            path={this.props.path}
            repoID={this.props.repoID}
            repoEncrypted={this.props.repoEncrypted}
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
            repoEncrypted={this.props.repoEncrypted}
            selectedDirentList={this.props.selectedDirentList}
            isMutipleOperation={this.state.isMutipleOperation}
            onItemsCopy={this.props.onItemsCopy}
            onCancelCopy={this.onCopyToggle}
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
                  repoEncrypted={false}
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
                  filePath={direntPath}
                  fileTagList={this.state.fileTagList}
                  toggleCancel={this.toggleCancel}
                  onFileTagChanged={this.onMenuFileTagChanged}
                />
              </ModalPortal>
            }
            {this.state.showRelatedFileDialog &&
              <ModalPortal>
                <RelatedFileDialogs
                  repoID={repoID}
                  filePath={direntPath}
                  relatedFiles={this.state.relatedFiles}
                  toggleCancel={this.toggleCancel}
                  onRelatedFileChange={this.onRelatedFileChange}
                  dirent={this.props.selectedDirentList[0]}
                  viewMode={this.state.viewMode}
                />
              </ModalPortal>
            }
          </Fragment>
        )}
      </Fragment>
    );
  }
}

MultipleDirOperationToolbar.propTypes = propTypes;

export default MultipleDirOperationToolbar;
