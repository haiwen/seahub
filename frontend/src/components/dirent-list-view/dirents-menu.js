import React from 'react';
import PropTypes from 'prop-types';
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
    let menuList;
    if (length === 1) {
      if (dirents[0].type === 'dir') {
        menuList = ['Share'];
      }
      else if (dirents[0].type === 'file') {
        if (dirents[0].is_locked) {
          menuList = ['Share', 'Tags', 'Unlock', 'Details', 'Related Files', 'History', 'Open via Client'];
        }
        else {
          menuList = ['Share', 'Tags', 'Lock', 'Details', 'Related Files', 'History', 'Open via Client'];
        }
        if (!(currentRepoInfo.is_admin && currentRepoInfo.permission === 'rw' || isRepoOwner)) {
          menuList.splice(2, 1);
        }
      }
    }
    else if (length > 1) {
      for (let i = 0; i < length; i++) {
        if (dirents[i].type === 'dir') {
          this.setState({
            menuList: [],
          });
          return;
        }
      }
      menuList = ['Tags'];
    }
    this.setState({
      menuList: menuList,
    });
  }

  translateMenuItem = (menuItem) => {
    let translateResult = '';
    switch(menuItem) {
      case 'Share':
        translateResult = gettext('Share');
        break;
      case 'Tags':
        translateResult = gettext('Tags');
        break;
      case 'Details':
        translateResult = gettext('Details');
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
