import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button , ButtonGroup } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import ZipDownloadDialog from '../dialog/zip-download-dialog';
import MoveDirentDialog from '../dialog/move-dirent-dialog';
import CopyDirentDialog from '../dialog/copy-dirent-dialog';
import DirentsMenu from '../dirent-list-view/dirents-menu';
import ShareDialog from '../dialog/share-dialog';
import AddRelatedFileDialog from '../dialog/add-related-file-dialog';
import ListRelatedFileDialog from '../dialog/list-related-file-dialog';
import EditFileTagDialog from '../dialog/edit-filetag-dialog';
import toaster from '../toast';
import ModalPortal from '../modal-portal';

const propTypes = {
  path: PropTypes.string.isRequired,
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
  showDirentDetail: PropTypes.func.isRequired,
};

class MutipleDirOperationToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      progress: 0,
      isProgressDialogShow: false,
      isMoveDialogShow: false,
      isCopyDialogShow: false,
      isMutipleOperation: true,
      showLibContentViewDialogs: false,
      showShareDialog: false,
      showEditFileTagDialog: false,
      showAddRelatedFileDialog: false,
      showListRelatedFileDialog: false,
      fileTagList: [],
      multiFileTagList: [],
    };
    this.zipToken = null;
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
      let selectedDirentNames = selectedDirentList.map(dirent => {
        return dirent.name;
      });
      this.setState({isProgressDialogShow: true, progress: 0});
      seafileAPI.zipDownload(repoID, path, selectedDirentNames).then(res => {
        this.zipToken = res.data['zip_token'];
        this.addDownloadAnimation();
        this.interval = setInterval(this.addDownloadAnimation, 1000);
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

    });
  }

  onCancelDownload = () => {
    seafileAPI.cancelZipTask(this.zipToken).then(() => {
      this.setState({isProgressDialogShow: false});
    });
  }

  onMenuItemClick = (operation) => {
    const dirents = this.props.selectedDirentList;
    const dirent = dirents[0];
    switch(operation) {
      case 'Share':
        this.setState({
          showLibContentViewDialogs: true,
          showShareDialog: true,
        });
        break;
      case 'Tags':
        this.listFileTags(dirent);
        break;
      case 'Details':
        this.props.showDirentDetail();
        break;
      case 'Lock':
        this.lockFile(dirent);
        break;
      case 'Unlock':
        this.unlockFile(dirent);
        break;
      case 'Related Files':
        this.openRelatedFilesDialog(dirent);
        break;
      case 'History':
        this.onHistory(dirent);
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
        let message = gettext('Successfully locked %(name)s.');
        message = message.replace('%(name)s', dirent.name);
        toaster.success(message);
        this.props.updateDirent(dirent, 'is_locked', true);
        this.props.updateDirent(dirent, 'locked_by_me', true);
        this.props.unSelectDirent();
      }
    });
  }

  unlockFile = (dirent) => {
    const filePath = this.getDirentPath(dirent);
    seafileAPI.unlockfile(this.props.repoID, filePath).then((res) => {
      if (!res.data.is_locked) {
        let message = gettext('Successfully unlocked %(name)s.');
        message = message.replace('%(name)s', dirent.name);
        toaster.success(message);
        this.props.updateDirent(dirent, 'is_locked', false);
        this.props.updateDirent(dirent, 'locked_by_me', false);
        this.props.unSelectDirent();
      }
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
    this.props.unSelectDirent();
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

  openRelatedFilesDialog = (dirent) => {
    let filePath = this.getDirentPath(dirent);
    seafileAPI.listRelatedFiles(this.props.repoID, filePath).then(res => {
      this.setState({
        relatedFiles: res.data.related_files,
        showLibContentViewDialogs: true,
      });
      if (res.data.related_files.length > 0) {
        this.setState({
          showListRelatedFileDialog: true,
        });
      } else {
        this.setState({
          showAddRelatedFileDialog: true,
        });
      }
    });
  }

  toggleCancel = () => {
    this.setState({
      showLibContentViewDialogs: false,
      showShareDialog: false,
      showEditFileTagDialog: false,
      showAddRelatedFileDialog: false,
      showListRelatedFileDialog: false,
    });
  }

  closeAddRelatedFileDialog = () => {
    this.setState({
      showLibContentViewDialogs: true,
      showAddRelatedFileDialog: false,
      showListRelatedFileDialog: true,
    });
  }

  addRelatedFileToggle = () => {
    this.setState({
      showLibContentViewDialogs: true,
      showAddRelatedFileDialog: true,
      showListRelatedFileDialog: false,
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
    });
  }

  onRelatedFileChange = () => {
    this.listRelatedFiles(this.props.selectedDirentList[0]);
  }

  getDirentPath = (dirent) => {
    if (dirent) return Utils.joinPath(this.props.path, dirent.name);
  }

  render() {
    const { repoID } = this.props;
    let direntPath = this.getDirentPath(this.props.selectedDirentList[0]);
    return (
      <Fragment>
        <div className="d-flex">
          <ButtonGroup className="flex-row group-operations">
            <Button className="secondary group-op-item action-icon sf2-icon-move" title={gettext('Move')} onClick={this.onMoveToggle}></Button>
            <Button className="secondary group-op-item action-icon sf2-icon-copy" title={gettext('Copy')} onClick={this.onCopyToggle}></Button>
            <Button className="secondary group-op-item action-icon sf2-icon-delete" title={gettext('Delete')} onClick={this.onItemsDelete}></Button>
            <Button className="secondary group-op-item action-icon sf2-icon-download" title={gettext('Download')} onClick={this.onItemsDownload}></Button>
          </ButtonGroup>
          {
            this.props.selectedDirentList.length > 0 &&
            <DirentsMenu
              dirents={this.props.selectedDirentList}
              currentRepoInfo={this.props.currentRepoInfo}
              isRepoOwner={this.props.isRepoOwner}
              onMenuItemClick={this.onMenuItemClick}
            />
          }
        </div>
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
        {this.state.isProgressDialogShow &&
          <ZipDownloadDialog progress={this.state.progress} onCancelDownload={this.onCancelDownload} />
        }
        {this.state.showLibContentViewDialogs && (
          <Fragment>
            {this.state.showShareDialog &&
              <ModalPortal>
                <ShareDialog
                  itemType={this.props.selectedDirentList[0].type}
                  itemName={this.props.selectedDirentList[0].name}
                  itemPath={direntPath}
                  userPerm={this.props.selectedDirentList[0].permission}
                  repoID={repoID}
                  repoEncrypted={false}
                  enableDirPrivateShare={this.props.enableDirPrivateShare}
                  isGroupOwnedRepo={this.state.isGroupOwnedRepo}
                  toggleDialog={this.toggleCancel}
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
            {this.state.showListRelatedFileDialog &&
              <ModalPortal>
                <ListRelatedFileDialog
                  repoID={repoID}
                  filePath={direntPath}
                  relatedFiles={this.state.relatedFiles}
                  toggleCancel={this.toggleCancel}
                  addRelatedFileToggle={this.addRelatedFileToggle}
                  onRelatedFileChange={this.onRelatedFileChange}
                />
              </ModalPortal>
            }
            {this.state.showAddRelatedFileDialog &&
              <ModalPortal>
                <AddRelatedFileDialog
                  repoID={repoID}
                  filePath={direntPath}
                  toggleCancel={this.closeAddRelatedFileDialog}
                  dirent={this.props.selectedDirentList[0]}
                  onRelatedFileChange={this.onRelatedFileChange}
                />
              </ModalPortal>
            }
          </Fragment>
        )}
      </Fragment>
    );
  }
}

MutipleDirOperationToolbar.propTypes = propTypes;

export default MutipleDirOperationToolbar;
