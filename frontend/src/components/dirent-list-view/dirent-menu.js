import React from 'react';
import PropTypes from 'prop-types';
import listener from '../context-menu/globalEventListener';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, isPro, enableFileComment, fileAuditEnabled, folderPermEnabled } from '../../utils/constants';

const propTypes = {
  dirent: PropTypes.object.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
};

class DirentMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
      menuList: [],
    };
  }

  componentDidMount() {
    this.listenerId = listener.register(this.onShowMenu, this.onHideMenu);
    let { currentRepoInfo, dirent, isRepoOwner } = this.props;
    let menuList = this.calculateMenuList(currentRepoInfo, dirent, isRepoOwner);
    this.setState({menuList: menuList});
  }
  
  componentWillReceiveProps(nextProps) {
    let { currentRepoInfo, dirent, isRepoOwner } = nextProps;
    let menuList = this.calculateMenuList(currentRepoInfo, dirent, isRepoOwner);
    this.setState({menuList: menuList});
    
  }

  componentWillUnmount () {
    if (this.listenerId) {
      listener.unregister(this.listenerId);
    }
  }

  onShowMenu = () => {
    // nothing todo
  }

  onHideMenu = () => {
    if (this.state.isItemMenuShow) {
      this.setState({isItemMenuShow: false});
      this.props.onUnfreezedItem();
    }
  }

  calculateMenuList(currentRepoInfo, dirent, isRepoOwner) {

    let type = dirent.type;
    let permission = dirent.permission;
    let can_set_folder_perm = folderPermEnabled  && ((isRepoOwner && currentRepoInfo.has_been_shared_out) || currentRepoInfo.is_admin);
    if (type === 'dir' && permission === 'rw') {
      let menuList = [];
      if (can_set_folder_perm) {
        menuList = ['Rename', 'Move', 'Copy', 'Divider', 'Permission', 'Divider', 'Open via Client'];
      } else {
        menuList = ['Rename', 'Move', 'Copy', 'Divider', 'Open via Client'];
      }
      return menuList;
    }

    if (type === 'dir' && permission === 'r') {
      let menuList = currentRepoInfo.encrypted ? ['Copy'] : [];
      return menuList;
    }

    if (type === 'file' && permission === 'rw') {
      let menuList = [];
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
      menuList.push('Divider');
      if (enableFileComment) {
        menuList.push('Comment');
      }
      menuList.push('History');
      if (fileAuditEnabled) {
        menuList.push('Access Log');
      }
      menuList.push('Divider');
      menuList.push('Open via Client');
      return menuList;
    }

    if (type === 'file' && permission === 'r') {
      let menuList = [];
      if (!currentRepoInfo.encrypted) {
        menuList.push('Copy');
      }
      if (enableFileComment) {
        menuList.push('Comment');
      }
      menuList.push('History');
      return menuList;
    }
  }

  translateMenuItem = (menuItem) => {
    let translateResult = '';
    switch(menuItem) {
      case 'Rename':
        translateResult = gettext('Rename');
        break;
      case 'Move':
        translateResult = gettext('Move');
        break;
      case 'Copy':
        translateResult = gettext('Copy');
        break;
      case 'Permission':
        translateResult = gettext('Permission');
        break;
      case 'Unlock':
        translateResult = gettext('Unlock');
        break;
      case 'Lock':
        translateResult = gettext('Lock');
        break;
      case 'Comment':
        translateResult = gettext('Comment');
        break;
      case 'History':
        translateResult = gettext('History');
        break;
      case 'Access Log':
        translateResult = gettext('Access Log');
        break;
      case 'Open via Client':
        translateResult = gettext('Open via Client');
        break;
      default:
        break;
    }
    return translateResult;
  }

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.toggleOperationMenu();
  }

  toggleOperationMenu = () => {
    this.setState(
      {isItemMenuShow: !this.state.isItemMenuShow},
      () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.props.onUnfreezedItem();
        }
      }
    );
  }

  onMenuItemClick = (event) => {
    let operation = event.target.dataset.toggle;
    this.props.onMenuItemClick(operation);
  }

  render() { 
    if (!this.state.menuList.length) {
      return '';
    }
    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle
          tag="i" 
          className="sf-dropdown-toggle sf2-icon-caret-down" 
          title={gettext('More Operations')}
          data-toggle="dropdown" 
          aria-expanded={this.state.isItemMenuShow}
          onClick={this.onDropdownToggleClick}
        />
        <DropdownMenu>
          {this.state.menuList.map((menuItem, index) => {
            if (menuItem === 'Divider') {
              return <DropdownItem key={index} divider/>;
            } else {
              return (
                <DropdownItem key={index} data-toggle={menuItem} onClick={this.onMenuItemClick}>{this.translateMenuItem(menuItem)}</DropdownItem>
              );
            }
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }
}

DirentMenu.propTypes = propTypes;

export default DirentMenu;
