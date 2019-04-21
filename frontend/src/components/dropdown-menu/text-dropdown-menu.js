import React from 'react';
import PropTypes from 'prop-types';
import listener from '../context-menu/globalEventListener';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  menuClass: PropTypes.string,
  menuType: PropTypes.oneOf(['pc', 'mobile']),
  menuChildren: PropTypes.string.isRequired,
  menuList: PropTypes.array.isRequired,
  isHandleContextMenuEvent: PropTypes.bool,
  onMenuItemClick: PropTypes.func.isRequired,
};

class TextDropDownMenu extends React.Component {

  static defaultProps = {
    isHandleContextMenuEvent: true,
    menuType: 'pc',
  };

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
    };
  }

  componentDidMount() {
    if (this.props.isHandleContextMenuEvent) {
      this.listenerId = listener.register(this.onShowMenu, this.onHideMenu);
    }
  }

  componentWillUnmount() {
    if (this.props.isHandleContextMenuEvent && this.listenerId) {
      listener.unregister(this.listenerId);
    }
  }

  onShowMenu = () => {
    // nothing todo
  }

  onHideMenu = () => {
    if (this.state.isItemMenuShow) {
      this.setState({isItemMenuShow: false});
    }
  }

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    this.toggleOperationMenu();
  }

  toggleOperationMenu = () => {
    this.setState({isItemMenuShow: !this.state.isItemMenuShow});
  }

  onMenuItemClick = (event) => {
    let operation = event.target.dataset.toggle;
    this.props.onMenuItemClick(operation, event);
  }

  render() {
    let { menuClass, menuChildren, menuList } = this.props;
    menuClass = 'btn btn-secondary operation-item ' + menuClass;

    if (!menuList.length) {
      return '';
    }

    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle
          className={menuClass}
          title={gettext('More Operations')}
          data-toggle="dropdown" 
          aria-expanded={this.state.isItemMenuShow}
          // onClick={this.onDropdownToggleClick}
        >
          {menuChildren}
        </DropdownToggle>
        <DropdownMenu>
          {menuList.map((menuItem, index) => {
            if (menuItem === 'Divider') {
              return <DropdownItem key={index} divider />;
            } else {
              return (
                <DropdownItem key={index} data-toggle={menuItem.key} onClick={this.onMenuItemClick}>{menuItem.value}</DropdownItem>
              );
            }
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }
}

TextDropDownMenu.propTypes = propTypes;

export default TextDropDownMenu;
