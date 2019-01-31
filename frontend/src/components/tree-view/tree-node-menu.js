import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  node: PropTypes.object.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnFreezedItem: PropTypes.func.isRequired,
};

class TreeNodeMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
      menuList: []
    };
  }

  componentDidMount() {
    let menuList = this.caculateMenuList();
    this.setState({menuList: menuList});
  }

  caculateMenuList() {
    let { node } = this.props;
    let menuList = [];
    if (node.object.type === 'dir') {
      menuList = ['New Folder', 'New File', 'Rename', 'Delete'];
    } else {
      menuList = ['Rename', 'Delete'];
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
    this.toggleOperationMenu(e);
  }

  toggleOperationMenu = (e) => {
    e.stopPropagation();
    this.setState(
      {isItemMenuShow: !this.state.isItemMenuShow }, () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.props.onUnFreezedItem();
        }
      }
    );
  }

  onMenuItemClick = (event) => {
    let operation = event.target.dataset.toggle;
    let node = this.props.node;
    this.props.onMenuItemClick(operation, node);
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
          {this.state.menuList.map((menuItem, index) => {
            return (
              <DropdownItem key={index} data-toggle={menuItem} onClick={this.onMenuItemClick}>{this.translateMenuItem(menuItem)}</DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }
}

TreeNodeMenu.propTypes = propTypes;

export default TreeNodeMenu;
