import React from 'react';
import PropTypes from 'prop-types';
import listener from '../context-menu/globalEventListener';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  tagName: PropTypes.string,
  opItem: PropTypes.object.isRequired,
  menuType: PropTypes.oneOf(['pc', 'mobile']).isRequired,
  menuClass: PropTypes.string.isRequired,
  isHandleContextMenuEvent: PropTypes.bool,
  getOpItemMenuList: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  onFrezeedItem: PropTypes.func,
  onUnfrezeedItem: PropTypes.func,
};

class DropDownMenu extends React.Component {

  static defaultProps = {
    isHandleContextMenuEvent: false,
    menuType: 'pc',
  };

  constructor(props) {
    super(props);
    this.state = {
      menuList: [],
      isItemMenuShow: false,
    };

  }

  componentDidMount() {
    if (this.props.isHandleContextMenuEvent) {
      this.listenerId = listener.register(this.onShowMenu, this.onHideMenu);
    }
    let { opItem, menuType } = this.props;

    // scene 1: menuType === 'pc', Get some menu operations
    // scene 2: menuType === 'mobile', Get all menu operations
    let isAllOperations = menuType === 'pc' ? false : true;
    let menuList = this.props.getOpItemMenuList(opItem, isAllOperations);
    this.setState({menuList: menuList});
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
      if (typeof(this.props.onUnfreezedItem) === 'function') {
        this.props.onUnfreezedItem();
      }
    }
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
        if (this.state.isItemMenuShow && typeof(this.props.onFreezedItem) === 'function') {
          this.props.onFreezedItem();
        } else if (!this.state.isItemMenuShow && typeof(this.props.onUnfreezedItem) === 'function') {
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
    let menuList = this.state.menuList;
    let { menuClass, tagName } = this.props;
    menuClass = 'sf-dropdown-toggle ' + menuClass;

    if (!menuList.length) {
      return '';
    }

    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
        <DropdownToggle
          tag={tagName || 'i'}
          className={menuClass}
          title={gettext('More Operations')}
          data-toggle="dropdown" 
          aria-expanded={this.state.isItemMenuShow}
          // onClick={this.onDropdownToggleClick}
        />
        <DropdownMenu>
          {menuList.map((menuItem, index) => {
            if (menuItem === 'Divider') {
              return <DropdownItem key={index} divider/>;
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

DropDownMenu.propTypes = propTypes;

export default DropDownMenu;
