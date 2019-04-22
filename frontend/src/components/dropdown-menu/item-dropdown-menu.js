import React from 'react';
import PropTypes from 'prop-types';
import listener from '../context-menu/globalEventListener';
import { Dropdown, ButtonDropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  tagName: PropTypes.string,
  opItem: PropTypes.object.isRequired,
  menuClass: PropTypes.string,
  isHandleContextMenuEvent: PropTypes.bool,
  getMenuList: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  freezeItem: PropTypes.func,
  unfreezeItem: PropTypes.func,
};

class ItemDropDownMenu extends React.Component {

  static defaultProps = {
    isHandleContextMenuEvent: true,
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
    let { opItem } = this.props;
    let menuList = this.props.getMenuList(opItem);
    this.setState({menuList: menuList});
  }

  componentWillReceiveProps(nextProps) {  // for toolbar opItem operation
    let { opItem } = nextProps;
    if (opItem.name !== this.props.opItem.name) {
      let menuList = this.props.getMenuList(opItem);
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
      if (typeof(this.props.unfreezeItem) === 'function') {
        this.props.unfreezeItem();
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
        if (this.state.isItemMenuShow && typeof(this.props.freezeItem) === 'function') {
          this.props.freezeItem();
        } else if (!this.state.isItemMenuShow && typeof(this.props.unfreezeItem) === 'function') {
          this.props.unfreezeItem();
        }
      }
    );
  }

  onMenuItemClick = (event) => {
    let operation = event.target.dataset.toggle;
    let opItem = this.props.opItem;
    this.props.onMenuItemClick(operation, event, opItem);
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
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.onDropdownToggleClick}>
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
