import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import OpIcon from '../../components/op-icon';
import OpElement from '../../components/op-element';
import { Dirent } from '../../models';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import Icon from '../icon';
import { lockFile, unlockFile, freezeDocument, exportDocx, exportSdoc, toggleStar, openHistory, openByDefault, openViaClient, openWithOnlyOffice, exportMarkdown } from '../../utils/dirent-operations';
import EventBus from '../common/event-bus';
import { EVENT_BUS_TYPE as TABLE_EVENT_BUS_TYPE } from '@/metadata/constants';
import Tooltip from '../tooltip';
import CustomDropdown from '../dropdown';
import TextTranslation from '../../utils/text-translation';
import { getDirentItemMenuList, getBatchMenuList } from '../dir-view-mode/utils/contextMenuUtils';
import { menuHandlers } from '../dir-view-mode/utils/menuHandlers';

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

const SINGLE_EXCLUDES = ['Download', 'Delete', 'Share', 'Move', 'Copy'];
const MULTI_EXCLUDES = ['Download', 'Delete', 'Move', 'Copy'];

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

  onMenuItemClick = (operation) => {
    const {
      repoID,
      path,
      currentRepoInfo: repoInfo,
      selectedDirentList: dirents,
      updateDirent
    } = this.props;
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
      case 'Unlock':
        menuHandlers[operation]({
          repoID,
          path,
          dirent,
          updateDirent,
          dirents,
          isBatch: dirents.length > 1,
          repoInfo
        });
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
        this.props.showDirentDetail();
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
      case TextTranslation.CHAT_WITH_AI.key: {
        menuHandlers[TextTranslation.CHAT_WITH_AI.key]({
          path: this.props.path,
          repoID: this.props.repoID,
          dirent,
          dirents,
          isBatch: dirents.length > 1,
        });
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

  buildMenuOps = (allOperations, excludesOperations) => {
    const iconOps = excludesOperations.filter(item => {
      return allOperations.some(op => op.key === item);
    });
    const validOperations = allOperations
      .filter((item) => excludesOperations.indexOf(item.key) === -1)
      .map((item) => {
        if (item === 'Divider') return item;
        if (item.subOpList) {
          return {
            ...item,
            onClick: () => this.onMenuItemClick(item.key),
            subOpList: item.subOpList.map((subItem) => {
              if (subItem === 'Divider') return subItem;
              return {
                ...subItem,
                onClick: () => this.onMenuItemClick(subItem.key)
              };
            })
          };
        }
        return {
          ...item,
          onClick: () => this.onMenuItemClick(item.key)
        };
      });
    if (validOperations.length > 0 && validOperations[0] === 'Divider') {
      validOperations.shift();
    }
    return { iconOps, menuOps: validOperations };
  };

  getSelectedDirentOperations = () => {
    const { currentRepoInfo, selectedDirentList } = this.props;
    if (selectedDirentList.length !== 1) return {};
    const allOperations = getDirentItemMenuList(currentRepoInfo, selectedDirentList[0], true);
    return this.buildMenuOps(allOperations, SINGLE_EXCLUDES);
  };

  getSelectedDirentsOperations = () => {
    const { currentRepoInfo, userPerm, selectedDirentList } = this.props;
    if (selectedDirentList.length <= 1) return {};
    const allOperations = getBatchMenuList(currentRepoInfo, userPerm, selectedDirentList, getDirentItemMenuList);
    return this.buildMenuOps(allOperations, MULTI_EXCLUDES);
  };

  renderIconButtons = (iconOps) => {
    return iconOps.map((item) => {
      switch (item) {
        case 'Download':
          return <OpIcon key="dl-btn" id="dl-btn" symbol="download" className="cur-view-path-btn" tooltip={gettext('Download')} op={this.onDownload} />;
        case 'Delete':
          return <OpIcon key="del-btn" id="del-btn" symbol="delete" className="cur-view-path-btn" tooltip={gettext('Delete')} op={this.onItemsDelete} />;
        case 'Share':
          return <OpIcon key="share-btn" id="share-btn" symbol="share" className="cur-view-path-btn" tooltip={gettext('Share')} op={this.onShare} />;
        case 'Move':
          return <OpIcon key="move-btn" id="move-btn" symbol="move" className="cur-view-path-btn" tooltip={gettext('Move')} op={this.onMove} />;
        case 'Copy':
          return <OpIcon key="copy-btn" id="copy-btn" symbol="copy" className="cur-view-path-btn" tooltip={gettext('Copy')} op={this.onCopy} />;
        default:
          return null;
      }
    });
  };

  render() {
    const { selectedDirentList } = this.props;
    const selectedLen = selectedDirentList.length;

    const { iconOps, menuOps } = this.getSelectedDirentOperations();
    const { iconOps: iconOpsForMulti, menuOps: menuOpsForMulti } = this.getSelectedDirentsOperations();

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
        {selectedLen > 1 && (
          <>
            {this.renderIconButtons(iconOpsForMulti)}
            <CustomDropdown
              target="selected-items-dropdown-menu"
              items={menuOpsForMulti}
              triggerClassName="cur-view-path-btn"
            />
          </>
        )}
        {selectedLen == 1 && (
          <>
            {this.renderIconButtons(iconOps)}
            <CustomDropdown
              target="selected-item-dropdown-menu"
              items={menuOps}
              triggerClassName="cur-view-path-btn"
            />
          </>
        )}
      </div>
    );
  }
}

SelectedDirentsToolbar.propTypes = propTypes;

export default SelectedDirentsToolbar;
