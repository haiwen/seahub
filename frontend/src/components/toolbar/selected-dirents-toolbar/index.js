import React from 'react';
import PropTypes from 'prop-types';
import { EVENT_BUS_TYPE as TABLE_EVENT_BUS_TYPE } from '@/metadata/constants';
import OpElement from '../../../components/op-element';
import OpIcon from '../../../components/op-icon';
import { Dirent } from '../../../models';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { getDirentItemMenuList, getBatchMenuList } from '../../dir-view-mode/utils/contextMenuUtils';
import { menuHandlers } from '../../dir-view-mode/utils/menuHandlers';
import CustomDropdown from '../../dropdown';
import EventBus, { EVENT_BUS_TYPE } from '../../event-bus';
import Icon from '../../icon';
import Tooltip from '../../tooltip';

import './index.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  userPerm: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  eventBus: PropTypes.object.isRequired,
  onItemsDelete: PropTypes.func.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  unSelectDirent: PropTypes.func.isRequired,
  updateDirent: PropTypes.func.isRequired,
  direntList: PropTypes.array.isRequired,
  showDirentDetail: PropTypes.func.isRequired,
  onItemConvert: PropTypes.func,
};

const SINGLE_EXCLUDES = ['Download', 'Delete', 'Share', 'Move', 'Copy'];
const MULTI_EXCLUDES = ['Download', 'Delete', 'Move', 'Copy'];

class SelectedDirentsToolbar extends React.Component {

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

  onMenuItemClick = (operation) => {
    const {
      repoID,
      path,
      currentRepoInfo: repoInfo,
      selectedDirentList: dirents,
      updateDirent,
      eventBus,
      showDirentDetail,
      onItemConvert,
    } = this.props;
    const dirent = dirents[0];
    if (menuHandlers[operation]) {
      menuHandlers[operation]({
        repoID,
        path,
        dirent,
        dirents,
        updateDirent,
        isBatch: dirents.length > 1,
        repoInfo,
        eventBus,
        showDirentDetail,
        onItemConvert,
        onItemRename: this.onRename,
      });
    }
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
        {selectedLen === 1 && (
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
