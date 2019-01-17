import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';

const propTypes = {
  node: PropTypes.object.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  onFreezedToggle: PropTypes.func.isRequired,
};

class TreeNodeMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false
    }
    this.menuList = [];
  }

  componentDidMount() {
    this.menuList = this.caculateMenuList();
  }

  caculateMenuList() {
    let { node } = this.props.node;
    let menuList = [];
    if (node.object.type === 'dir') {
      menuList = ['New Folder', 'New File', 'Rename File', 'Delete File'];
    } else {
      menuList = ['Rename File', 'Delete File'];
    }
    return menuList;
  }

  translateMenuItem = (menuItem) => {
    let translateResult = '';
    switch(menuItem) {
      case 'New Folder':
        translateResult = gettext('New Folder');
        break;
      case 'New File':
        translateResult = gettext('New File');
        break;
      case 'Rename':
        translateResult = gettext('Rename');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      default:
        break;
    }
    return translateResult;
  }

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    this.toggleOperationMenu();
  }

  toggleOperationMenu = () => {
    this.setState(
      {isItemMenuShow: !this.state.isItemMenuShow},
      () => {
        this.props.onFreezedToggle();
      }
    );
  }

  onMenuItemClick = (event) => {
    let operation = event.target.dataset.toggle;
    this.props.onMenuItemClick(operation);
  }

  render() {
    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle 
          tag="i" 
          className="fas fa-ellipsis-v" 
          title={gettext('More Operations')}
          data-toggle="dropdown" 
          aria-expanded={this.state.isItemMenuShow}
          onClick={this.onDropdownToggleClick}
        />
        <DropdownMenu>
          {this.menuList.map((menuItem, index) => {
            <DropdownItem key={index} data-toggle={menuItem} onClick={this.onMenuItemClick}>{this.translateMenuItem(menuItem)}</DropdownItem>
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }
}

TreeNodeMenu.propTypes = propTypes;

export default TreeNodeMenu;
