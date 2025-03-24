import React from 'react';
import PropTypes from 'prop-types';
import { enableSeadoc, gettext, enableWhiteboard, enableExcalidraw } from '../../utils/constants';
import Loading from '../loading';
import ModalPortal from '../modal-portal';
import CreateFile from '../../components/dialog/create-file-dialog';
import CreateFolder from '../dialog/create-folder-dialog';
import TextTranslation from '../../utils/text-translation';
import { Utils } from '../../utils/utils';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, showMenu } from '../context-menu/actions';

import '../../css/tip-for-new-file.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  onAddFile: PropTypes.func.isRequired,
  onAddFolder: PropTypes.func.isRequired,
  getMenuContainerSize: PropTypes.func.isRequired,
  userPerm: PropTypes.string,
};

class DirentNoneView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      fileType: '',
      isCreateFileDialogShow: false,
      isCreateFolderDialogShow: false,
    };
  }

  onCreateFolderToggle = () => {
    this.setState({ isCreateFolderDialogShow: !this.state.isCreateFolderDialogShow });
  };

  onAddFolder = (dirPath) => {
    this.setState({ isCreateFolderDialogShow: false });
    this.props.onAddFolder(dirPath);
  };

  onCreateNewFile = (type) => {
    this.setState({
      fileType: type,
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
    });
  };

  onCreateFileToggle = () => {
    this.setState({
      fileType: '',
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
    });
  };

  checkDuplicatedName = () => {
    return false; // current repo is null, and unnecessary to check duplicated name
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
    if (enableExcalidraw) {
      direntsContainerMenuList.push(NEW_EXCALIDRAW_FILE);
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
        this.onCreateFolderToggle();
        break;
      case 'New File':
        this.onCreateNewFile('');
        break;
      case 'New Markdown File':
        this.onCreateNewFile('.md');
        break;
      case 'New Excel File':
        this.onCreateNewFile('.xlsx');
        break;
      case 'New PowerPoint File':
        this.onCreateNewFile('.pptx');
        break;
      case 'New Word File':
        this.onCreateNewFile('.docx');
        break;
      case 'New Whiteboard File':
        this.onCreateNewFile('.draw');
        break;
      case 'New SeaDoc File':
        this.onCreateNewFile('.sdoc');
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
              <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.md')}>{'+ Markdown'}</button>
              <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.pptx')}>{'+ PPT'}</button>
              <br />
              <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.docx')}>{'+ Word'}</button>
              <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.xlsx')}>{'+ Excel'}</button>
              <br />
              {enableSeadoc && !currentRepoInfo.encrypted &&
                <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.sdoc')}>{'+ SeaDoc'}</button>
              }
            </>
          )}
        </div>
        {this.state.isCreateFileDialogShow && (
          <ModalPortal>
            <CreateFile
              parentPath={this.props.path}
              fileType={this.state.fileType}
              onAddFile={this.props.onAddFile}
              toggleDialog={this.onCreateFileToggle}
              checkDuplicatedName={this.checkDuplicatedName}
            />
          </ModalPortal>
        )}
        {this.state.isCreateFolderDialogShow &&
          <ModalPortal>
            <CreateFolder
              parentPath={this.props.path}
              onAddFolder={this.onAddFolder}
              checkDuplicatedName={this.checkDuplicatedName}
              addFolderCancel={this.onCreateFolderToggle}
            />
          </ModalPortal>
        }
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
