import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import OpIcon from '../../components/op-icon';
import OpElement from '../../components/op-element';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import toaster from '../toast';
import { Dirent } from '../../models';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import Icon from '../icon';
import { lockFile, unlockFile, freezeDocument, exportDocx, exportSdoc, toggleStar, openHistory, openByDefault, openViaClient, openWithOnlyOffice, exportMarkdown } from '../../utils/dirent-operations';
import EventBus from '../common/event-bus';
import { EVENT_BUS_TYPE as TABLE_EVENT_BUS_TYPE } from '@/metadata/constants';
import Tooltip from '../tooltip';

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
    const { selectedDirentList, repoID, path, updateDirent } = this.props;
    const dirent = selectedDirentList[0];
    if (dirent) {
      toggleStar(repoID, path, dirent, updateDirent);
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
        this.onPermission();
        break;
      case 'Lock':
        this.lockFile(dirent);
        break;
      case 'Unlock':
        this.unlockFile(dirent);
        break;
      case 'Unfreeze Document':
        this.unlockFile(dirent);
        break;
      case 'Freeze Document':
        this.onFreezeDocument(dirent);
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
      case 'Open with Default':
        this.onOpenByDefault(dirent);
        break;
      case 'Open via Client':
        this.onOpenViaClient(dirent);
        break;
      case 'Open with OnlyOffice':
        this.onOpenWithOnlyOffice(dirent);
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
      case 'Export markdown': {
        this.exportMarkdown(dirent);
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
    const { repoID, path } = this.props;
    exportDocx(repoID, path, dirent);
  };

  exportMarkdown = (dirent) => {
    const { repoID, path } = this.props;
    exportMarkdown(repoID, path, dirent);
  };

  exportSdoc = (dirent) => {
    const { repoID, path } = this.props;
    exportSdoc(repoID, path, dirent);
  };

  lockFile = (dirent) => {
    const { repoID, path, updateDirent } = this.props;
    lockFile(repoID, path, dirent, updateDirent);
  };

  unlockFile = (dirent) => {
    const { repoID, path, updateDirent } = this.props;
    unlockFile(repoID, path, dirent, updateDirent);
  };

  onFreezeDocument = (dirent) => {
    const { repoID, path, updateDirent } = this.props;
    freezeDocument(repoID, path, dirent, updateDirent);
  };

  onOpenByDefault = (dirent) => {
    const { repoID, path } = this.props;
    openByDefault(repoID, path, dirent);
  };

  onOpenViaClient = (dirent) => {
    const { repoID, path } = this.props;
    openViaClient(repoID, path, dirent);
  };

  onOpenWithOnlyOffice = (dirent) => {
    const { repoID, path } = this.props;
    openWithOnlyOffice(repoID, path, dirent);
  };

  onHistory = (dirent) => {
    const { repoID, path } = this.props;
    openHistory(repoID, path, dirent);
  };

  toggleCancel = () => {
    this.setState({
      showLibContentViewDialogs: false,
    });
  };

  getDirentPath = (dirent) => {
    if (dirent) return Utils.joinPath(this.props.path, dirent.name);
  };

  handleUnselect = () => {
    EventBus.getInstance().dispatch(TABLE_EVENT_BUS_TYPE.SELECT_NONE);
    this.props.unSelectDirent();
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

    const modifiers = [{
      name: 'offset',
      options: {
        offset: [0, 4],
      },
    }];

    return (
      <div className="selected-dirents-toolbar">
        <OpElement
          className="cur-view-path-btn px-2"
          op={this.handleUnselect}
        >
          <span className="d-flex align-items-center justify-content-center mr-2">
            <Icon id="close-selected-toolbar-icon" symbol="close" />
            <Tooltip target="close-selected-toolbar-icon">{gettext('Unselect')}</Tooltip>
          </span>
          <span>{selectedLen}{' '}{gettext('selected')}</span>
        </OpElement>
        {canDownload &&
          <OpIcon
            id="cur-view-path-btn-download"
            className="cur-view-path-btn"
            symbol="download"
            tooltip={gettext('Download')}
            modifiers={modifiers}
            op={this.onDownload}
          />
        }
        {canDelete &&
          <OpIcon
            id="cur-view-path-btn-delete"
            className="cur-view-path-btn"
            symbol="delete1"
            tooltip={gettext('Delete')}
            modifiers={modifiers}
            op={this.onItemsDelete}
          />
        }
        {selectedLen == 1 && this.getDirentSharePerm() &&
          <OpIcon
            id="cur-view-path-btn-share"
            className="cur-view-path-btn"
            symbol="share"
            tooltip={gettext('Share')}
            modifiers={modifiers}
            op={this.onShare}
          />
        }
        {canModify &&
          <OpIcon
            id="cur-view-path-btn-move"
            className="cur-view-path-btn"
            symbol="move"
            tooltip={gettext('Move')}
            modifiers={modifiers}
            op={this.onMove}
          />
        }
        {canCopy &&
          <OpIcon
            id="cur-view-path-btn-copy"
            className="cur-view-path-btn position-relative"
            symbol="copy"
            tooltip={gettext('Copy')}
            modifiers={modifiers}
            op={this.onCopy}
          />
        }
        {selectedLen === 1 &&
          <ItemDropdownMenu
            item={this.props.selectedDirentList[0]}
            toggleClass={'cur-view-path-btn'}
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
