import React from 'react';
import PropTypes from 'prop-types';
import listener from '../context-menu/globalEventListener';
import { Dropdown, ButtonDropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  tagName: PropTypes.string,
  opItem: PropTypes.object.isRequired,
  menuType: PropTypes.oneOf(['pc', 'mobile']),
  menuClass: PropTypes.string,
  isHandleContextMenuEvent: PropTypes.bool,
  getOpItemMenuList: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  onFrezeedItem: PropTypes.func,
  onUnfrezeedItem: PropTypes.func,
};

class ItemDropDownMenu extends React.Component {

  static defaultProps = {
    isHandleContextMenuEvent: true,
    menuType: 'pc',
    menuClass: 'sf2-icon-caret-down'
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

  componentWillReceiveProps(nextProps) {  // for toolbar opItem operation
    let { opItem, menuType } = nextProps;
    if (opItem.name !== this.props.opItem.name) {
      let isAllOperations = menuType === 'pc' ? false : true;
      let menuList = this.props.getOpItemMenuList(opItem, isAllOperations);
      this.setState({menuList: menuList});
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
    this.props.onMenuItemClick(operation, event);
  }

  render() {
    let menuList = this.state.menuList;
    let { menuClass, tagName } = this.props;
    menuClass = 'sf-dropdown-toggle ' + menuClass;

    if (!menuList.length) {
      return '';
    }

    if (tagName && tagName === 'button') {
      return (
        <ButtonDropdown isOpen={this.state.isItemMenuShow} toggle={this.onDropdownToggleClick} title={gettext('More Operations')}>
          <DropdownToggle 
            className={menuClass}
            data-toggle="dropdown" 
            title={gettext('More Operations')}
            aria-expanded={this.state.isItemMenuShow} 
            // onClick={this.onDropdownToggleClick} 
          >
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
        </ButtonDropdown>
      );
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

ItemDropDownMenu.propTypes = propTypes;

export default ItemDropDownMenu;
