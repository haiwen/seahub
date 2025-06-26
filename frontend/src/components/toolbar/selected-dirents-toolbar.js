import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, name } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import URLDecorator from '../../utils/url-decorator';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import toaster from '../toast';
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
  onItemsDelete: PropTypes.func.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
  enableDirPrivateShare: PropTypes.bool.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  onFilesTagChanged: PropTypes.func.isRequired,
  unSelectDirent: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  currentMode: PropTypes.string.isRequired,
  direntList: PropTypes.array.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
};

class SelectedDirentsToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isFileAccessLogDialogOpen: false,
      showLibContentViewDialogs: false,
      fileTagList: [],
    };
  }

  onItemsDelete = () => {
    this.props.onItemsDelete();
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

  onShare = () => {
    const { selectedDirentList, eventBus } = this.props;
    const dirent = selectedDirentList[0];
    const direntPath = this.getDirentPath(dirent);
    eventBus.dispatch(EVENT_BUS_TYPE.SHARE_FILE, direntPath, dirent);
  };

  onRename = () => {
    const { selectedDirentList, eventBus, direntList } = this.props;
    const dirent = selectedDirentList[0];
    eventBus.dispatch(EVENT_BUS_TYPE.RENAME_FILE, dirent, direntList);
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

  onPermission = () => {
    const { eventBus, selectedDirentList } = this.props;
    const dirent = selectedDirentList[0];
    const direntPath = this.getDirentPath(dirent);
    const name = Utils.getFileName(direntPath);
    eventBus.dispatch(EVENT_BUS_TYPE.PERMISSION, direntPath, name);
  };

  openFileAccessLog = (dirent) => {
    const { eventBus } = this.props;
    const direntPath = this.getDirentPath(dirent);
    const name = Utils.getFileName(direntPath);
    eventBus.dispatch(EVENT_BUS_TYPE.ACCESS_LOG, direntPath, name);
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
        this.onRename();
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
        this.openFileAccessLog(dirent);
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

  toggleCancel = () => {
    this.setState({
      showLibContentViewDialogs: false,
    });
  };

  getDirentPath = (dirent) => {
    if (dirent) return Utils.joinPath(this.props.path, dirent.name);
  };

  render() {
    const { userPerm, selectedDirentList } = this.props;
    const selectedLen = selectedDirentList.length;
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
      <div className="selected-dirents-toolbar">
        <span className="cur-view-path-btn px-2" onClick={this.props.unSelectDirent}>
          <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
          <span>{selectedLen}{' '}{gettext('selected')}</span>
        </span>
        {canModify &&
          <span className="cur-view-path-btn sf3-font-move1 sf3-font" aria-label={gettext('Move')} title={gettext('Move')} onClick={this.onMove}></span>
        }
        {canCopy &&
          <span className="cur-view-path-btn sf3-font-copy1 sf3-font" aria-label={gettext('Copy')} title={gettext('Copy')} onClick={this.onCopy}></span>
        }
        {canDelete &&
          <span className="cur-view-path-btn sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')} onClick={this.onItemsDelete}></span>
        }
        {canDownload &&
          <span className="cur-view-path-btn sf3-font-download1 sf3-font" aria-label={gettext('Download')} title={gettext('Download')} onClick={this.onDownload}></span>
        }
        {selectedLen == 1 && this.getDirentSharePerm() &&
          <span className="cur-view-path-btn sf3-font-share sf3-font" aria-label={gettext('Share')} title={gettext('Share')} onClick={this.onShare}></span>
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
    );
  }
}

SelectedDirentsToolbar.propTypes = propTypes;

export default SelectedDirentsToolbar;
