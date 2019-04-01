import React from 'react';
import PropTypes from 'prop-types';
import { gettext, isPro, enableFileComment, fileAuditEnabled, folderPermEnabled } from '../../utils/constants';


import '../../css/tree-view-contextmenu.css'

const propTypes = {
 
};

class DirentRightMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
      menuList: [],
    };
  }

  // componentWillMount() {
  //   let menuList = this.caculateMenuList();
  //   console.log(menuList)
  //   this.setState({menuList: menuList});
  // }

  componentDidMount() {
    let menuList = this.caculateMenuList();
    console.log(menuList)
    this.setState({menuList: menuList});
  }

  componentWillUpdate() {
    this.calculateMenuDistance();
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.listenClick);
    document.removeEventListener('mousemove', this.handleContextMenu);
  }

  caculateMenuList() {
    let { currentRepoInfo, dirent, isRepoOwner } = this.props;

    let type = dirent.type;
    let permission = dirent.permission;
    let can_set_folder_perm = folderPermEnabled  && ((isRepoOwner && currentRepoInfo.has_been_shared_out) || currentRepoInfo.is_admin);
    if (type === 'dir' && permission === 'rw') {
      let menuList = [];
      if (can_set_folder_perm) {
        menuList = ['Share','Delete','Download', 'Rename', 'Move', 'Copy', 'Permission', 'Details', 'Open via Client'];
      } else {
        menuList = ['Share','Delete','Download', 'Rename', 'Move', 'Copy', 'Details', 'Open via Client'];
      }
      return menuList;
    }

    if (type === 'dir' && permission === 'r') {
      let menuList = currentRepoInfo.encrypted ? ['Copy', 'Details'] : ['Details'];
      return menuList;
    }

    if (type === 'file' && permission === 'rw') {
      let menuList = ['Share','Delete','Download'];
      if (!dirent.is_locked || (dirent.is_locked && dirent.locked_by_me)) {
        menuList.push('Rename');
        menuList.push('Move');
      }
      menuList.push('Copy');
      if (isPro) {
        if (dirent.is_locked) {
          if (dirent.locked_by_me || (dirent.lock_owner === 'OnlineOffice' && permission === 'rw')) {
            menuList.push('Unlock');
          }
        } else {
          menuList.push('Lock');
        }
      }
      if (enableFileComment) {
        menuList.push('Comment');
      }
      menuList.push('History');
      if (fileAuditEnabled) {
        menuList.push('Access Log');
      }
      menuList.push('Details');
      menuList.push('Open via Client');
      return menuList;
    }

    if (type === 'file' && permission === 'r') {
      let menuList = ['Share','Delete','Download'];
      if (!currentRepoInfo.encrypted) {
        menuList.push('Copy');
      }
      if (enableFileComment) {
        menuList.push('Comment');
      }
      menuList.push('History');
      menuList.push('Details');
      return menuList;
    }
  }

 calculateMenuDistance = () => {
    let mousePosition = this.props.mousePosition;
    let rightTreeMenu = document.querySelector('.right-tree-menu');
    let rightTreeMenuHeight = rightTreeMenu.offsetHeight;

    if (mousePosition.clientY + rightTreeMenuHeight > document.body.clientHeight) {
      rightTreeMenu.style.top = mousePosition.clientY - rightTreeMenuHeight + 'px';
    } else {
      rightTreeMenu.style.top = mousePosition.clientY + 'px';
    }
    rightTreeMenu.style.left = mousePosition.clientX + 'px';

    document.addEventListener('click', this.listenClick);
    document.addEventListener('mousemove', this.handleContextMenu);
  }

  translateMenuItem = (menuItem) => {
    let translateResult = '';
    switch(menuItem) {
      case 'New Folder':
        translateResult = gettext('New Folder');
        break; 
      case 'Share':
        translateResult = gettext('Share');
        break; 
      case 'Download':
        translateResult = gettext('Download');
        break;
      case 'New File':
        translateResult = gettext('New File');
        break;
      case 'Rename':
        translateResult = gettext('Rename');
        break;
      case 'Copy':
        translateResult = gettext('Copy');
        break;
      case 'Move':
        translateResult = gettext('Move');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Details':
        translateResult = gettext('Details');
        break;
      case 'Unlock':
        translateResult = gettext('Unlock');
        break;
      case 'Lock':
        translateResult = gettext('Lock');
        break;
      case 'History':
        translateResult = gettext('History');
        break;
      case 'Open via Client':
        translateResult = gettext('Open via Client');
        break;
      default:
        break;
    }
    return translateResult;
  }

  handleContextMenu = (e) => {
    let mousePosition = this.props.mousePosition;
    let rightTreeMenu = document.querySelector('.right-tree-menu');
    let rightTreeMenuHeight = rightTreeMenu.offsetHeight;
    let rightTreeMenuWidth = rightTreeMenu.offsetWidth;

    if (mousePosition.clientY + rightTreeMenuHeight > document.body.clientHeight) {
      if ((e.clientX >= mousePosition.clientX) && (e.clientX <= (mousePosition.clientX + rightTreeMenuWidth)) && (e.clientY <= mousePosition.clientY) && (e.clientY >= (mousePosition.clientY - rightTreeMenuHeight))) {
        this.props.itemUnregisterHandlers();
      } else {
        this.props.itemRegisterHandlers();
      }
    } else {
      if ((e.clientX >= mousePosition.clientX) && (e.clientX <= (mousePosition.clientX + rightTreeMenuWidth)) && (e.clientY >= mousePosition.clientY) && (e.clientY <= (mousePosition.clientY + rightTreeMenuHeight))) {
        this.props.itemUnregisterHandlers();
      } else {
        this.props.itemRegisterHandlers();
      }
    }
  }

  listenClick = (e) => {
    let mousePosition = this.props.mousePosition;
    let rightTreeMenu = document.querySelector('.right-tree-menu');
    let rightTreeMenuHeight = rightTreeMenu.offsetHeight;
    let rightTreeMenuWidth = rightTreeMenu.offsetWidth;

    if ((e.clientX <= mousePosition.clientX) || (e.clientX >= (mousePosition.clientX + rightTreeMenuWidth))) {
      this.props.closeRightMenu();
    }

    if (mousePosition.clientY + rightTreeMenuHeight > document.body.clientHeight) {
      if ((e.clientY <= (mousePosition.clientY - rightTreeMenuHeight)) || e.clientY >= mousePosition.clientY) {
      this.props.closeRightMenu();
      }
    } else {
      if ((e.clientY <= mousePosition.clientY) || (e.clientY >= (mousePosition.clientY + rightTreeMenuHeight))) {
      this.props.closeRightMenu();
      }
    }
  }

  onMenuItemClick = (event) => {
    let operation = event.target.dataset.toggle;
    console.log(operation)
    
    if (operation === 'Share') {
      this.props.onItemShare(event);
    } else if (operation === 'Delete') {
      this.props.onItemDelete(event);
    } else if (operation === 'Download') {
      this.props.onItemDownload(event);
    } else {
      this.props.onMenuItemClick(operation);
    }
    this.props.closeRightMenu();
  }

  render() {
    return (
      <div className='right-tree-menu'>
        {this.state.menuList.map((menuItem, index) => {
          return (
            <button className='right-tree-item' key={index} data-toggle={menuItem} onClick={this.onMenuItemClick}>{this.translateMenuItem(menuItem)}</button>
          );
        })}
      </div>
    );
  }
}

DirentRightMenu.propTypes = propTypes;

export default DirentRightMenu;
