import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem, ButtonDropdown } from 'reactstrap';
import { gettext, isPro, enableFileComment, fileAuditEnabled, folderPermEnabled } from '../../utils/constants';
import '../../css/dirents-menu.css';

const propTypes = {
  dirents: PropTypes.array.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  isRepoOwner: PropTypes.bool.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
};

class DirentMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
      menuList: [],
    };
  }

  calculateMenuList(props) {
    const { currentRepoInfo, dirents, isRepoOwner } = props;
    const length = dirents.length;
    let menuList = [];
    if (length === 1) {
      const dirent = dirents[0];
      if (dirent.type === 'dir') {
        menuList = ['Share'];
      } else if (dirent.type === 'file') {
        menuList = ['Share', 'Tags', 'Related Files', 'Divider', 'History', 'Divider', 'Open via Client'];
        if (!Utils.isMarkdownFile(dirent.name)) {
          menuList.splice(2, 1);
        }
        if (isPro) {
          if (dirent.is_locked) {
            if (dirent.locked_by_me || (dirent.lock_owner === 'OnlineOffice' && currentRepoInfo.permission === 'rw')) {
              menuList.splice(1, 0, 'Unlock');
            }
          } else {
            menuList.splice(1, 0, 'Lock');
          }
        }
      }
    } else {
      menuList = [];
    }
    this.setState({
      menuList: menuList,
    });
  }

  translateMenuItem = (menuItem) => {
    let translateResult = '';
    switch (menuItem) {
      case 'Share':
        translateResult = gettext('Share');
        break;
      case 'Tags':
        translateResult = gettext('Tags');
        break;
      case 'Lock':
        translateResult = gettext('Lock');
        break;
      case 'Unlock':
        translateResult = gettext('Unlock');
        break;
      case 'Related Files':
        translateResult = gettext('Related Files');
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

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    this.setState({
      isItemMenuShow: !this.state.isItemMenuShow,
    });
  }

  onMenuItemClick = (event) => {
    let operation = event.target.dataset.toggle;
    this.props.onMenuItemClick(operation, this.props.dirents);
  }

  componentDidMount() {
    this.calculateMenuList(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.dirents.length !== nextProps.dirents.length) {
      this.calculateMenuList(nextProps);
    }
  }

  render() {
    if (this.state.menuList.length === 0) {
      return null;
    }
    return (
      <ButtonDropdown isOpen={this.state.isItemMenuShow} toggle={this.onDropdownToggleClick} title={gettext('More Operations')}>
        <DropdownToggle data-toggle="dropdown" aria-expanded={this.state.isItemMenuShow} onClick={this.onDropdownToggleClick} className="fas fa-ellipsis-v sf-dropdown-toggle dirents-more-menu">
        </DropdownToggle>
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
      </ButtonDropdown>
    );
  }
}

DirentMenu.propTypes = propTypes;

export default DirentMenu;
