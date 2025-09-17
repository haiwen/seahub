import React from 'react';
import PropTypes from 'prop-types';
import { enableSeadoc, gettext, enableWhiteboard } from '../../utils/constants';
import Loading from '../loading';
import TextTranslation from '../../utils/text-translation';
import { Utils } from '../../utils/utils';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, showMenu } from '../context-menu/actions';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';

import '../../css/tip-for-new-file.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  eventBus: PropTypes.object,
  getMenuContainerSize: PropTypes.func.isRequired,
  userPerm: PropTypes.string,
};

class DirentNoneView extends React.Component {

  onCreateFile = (type) => {
    const { eventBus, path } = this.props;
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, path, [], type);
  };

  onCreateFolder = () => {
    const { eventBus, path } = this.props;
    eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FOLDER, path, []);
  };

  onContainerContextMenu = (event) => {
    event.preventDefault();
    let permission = this.props.userPerm;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(permission);
    if (permission !== 'admin' && permission !== 'rw' && !isCustomPermission) {
      return;
    }
    const {
      NEW_FOLDER, NEW_FILE,
      NEW_MARKDOWN_FILE,
      NEW_EXCEL_FILE,
      NEW_POWERPOINT_FILE,
      NEW_WORD_FILE,
      NEW_SEADOC_FILE,
      NEW_TLDRAW_FILE,
      NEW_EXCALIDRAW_FILE
    } = TextTranslation;
    const direntsContainerMenuList = [
      NEW_FOLDER, NEW_FILE, 'Divider',
    ];
    const { currentRepoInfo } = this.props;
    if (enableSeadoc && !currentRepoInfo.encrypted) {
      direntsContainerMenuList.push(NEW_SEADOC_FILE);
      direntsContainerMenuList.push(NEW_EXCALIDRAW_FILE);
    }
    direntsContainerMenuList.push(
      NEW_MARKDOWN_FILE,
      NEW_EXCEL_FILE,
      NEW_POWERPOINT_FILE,
      NEW_WORD_FILE,
    );
    if (enableWhiteboard) {
      direntsContainerMenuList.push(NEW_TLDRAW_FILE);
    }
    let id = 'dirent-container-menu';
    if (isCustomPermission) {
      const { create: canCreate } = customPermission.permission;
      if (!canCreate) return;
    }
    let menuList = direntsContainerMenuList;
    this.handleContextClick(event, id, menuList);
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

  onContainerMenuItemClick = (operation) => {
    switch (operation) {
      case 'New Folder':
        this.onCreateFolder();
        break;
      case 'New File':
        this.onCreateFile('');
        break;
      case 'New Markdown File':
        this.onCreateFile('.md');
        break;
      case 'New Excel File':
        this.onCreateFile('.xlsx');
        break;
      case 'New PowerPoint File':
        this.onCreateFile('.pptx');
        break;
      case 'New Word File':
        this.onCreateFile('.docx');
        break;
      case 'New Whiteboard File':
        this.onCreateFile('.draw');
        break;
      case 'New SeaDoc File':
        this.onCreateFile('.sdoc');
        break;
      default:
        break;
    }
    hideMenu();
  };

  render() {
    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }
    const { currentRepoInfo, userPerm } = this.props;
    let canCreateFile = false;
    if (['rw', 'cloud-edit'].indexOf(userPerm) != -1) {
      canCreateFile = true;
    } else {
      const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
      if (isCustomPermission) {
        const { create } = customPermission.permission;
        canCreateFile = create;
      }
    }

    return (
      <div className="tip-for-new-file-container" onContextMenu={this.onContainerContextMenu}>
        <div className="tip-for-new-file">
          <p className="text-secondary text-center">{gettext('This folder has no content at this time.')}</p>
          {canCreateFile && (
            <>
              <p className="text-secondary text-center">{gettext('You can create files quickly')}{' +'}</p>
              <button className="big-new-file-button" onClick={this.onCreateFile.bind(this, '.md')}>{'+ Markdown'}</button>
              <button className="big-new-file-button" onClick={this.onCreateFile.bind(this, '.pptx')}>{'+ PPT'}</button>
              <br />
              <button className="big-new-file-button" onClick={this.onCreateFile.bind(this, '.docx')}>{'+ Word'}</button>
              <button className="big-new-file-button" onClick={this.onCreateFile.bind(this, '.xlsx')}>{'+ Excel'}</button>
              <br />
              {enableSeadoc && !currentRepoInfo.encrypted &&
                <button className="big-new-file-button" onClick={this.onCreateFile.bind(this, '.sdoc')}>{'+ SeaDoc'}</button>
              }
            </>
          )}
        </div>
        <ContextMenu
          id={'dirent-container-menu'}
          onMenuItemClick={this.onContainerMenuItemClick}
          getMenuContainerSize={this.props.getMenuContainerSize}
        />
      </div>
    );
  }
}

DirentNoneView.propTypes = propTypes;

export default DirentNoneView;
