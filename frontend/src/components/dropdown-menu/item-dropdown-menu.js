import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import listener from '../context-menu/globalEventListener';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import ModalPortal from '../modal-portal';

import '../../css/item-dropdown-menu.css';
import classNames from 'classnames';

const propTypes = {
  tagName: PropTypes.string,
  item: PropTypes.object.isRequired,
  toggleClass: PropTypes.string,
  toggleChildren: PropTypes.object,
  isHandleContextMenuEvent: PropTypes.bool,
  getMenuList: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  freezeItem: PropTypes.func,
  unfreezeItem: PropTypes.func,
  menuStyle: PropTypes.object,
  tickable: PropTypes.bool,
};

class ItemDropdownMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      menuList: [],
      isItemMenuShow: false,
      isSubMenuShown: false,
      currentItem: ''
    };
    this.dropdownRef = React.createRef();
    this.mainMenuDirection = 'down';
    this.subMenuDirection = 'right';
  }

  componentDidMount() {
    const { isHandleContextMenuEvent = true } = this.props;
    if (isHandleContextMenuEvent) {
      this.listenerId = listener.register(this.onShowMenu, this.onHideMenu);
    }
    this.setState({
      menuList: this.removeUselessDivider(this.props.getMenuList(this.props.item))
    });
    setTimeout(() => {
      if (this.dropdownRef.current) {
        const rect = this.dropdownRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        const spaceBelow = windowHeight - rect.bottom;
        const spaceAbove = rect.top;
        const menuHeightThreshold = 400;

        let mainMenuDirection;
        if (spaceBelow < menuHeightThreshold && spaceAbove < menuHeightThreshold) {
          const spaceRight = window.innerWidth - rect.right;
          mainMenuDirection = spaceRight >= 200 ? 'right' : 'left';
        } else if (spaceBelow < menuHeightThreshold) {
          mainMenuDirection = 'up';
        } else {
          mainMenuDirection = 'down';
        }

        this.mainMenuDirection = mainMenuDirection;
        this.subMenuDirection = (window.innerWidth - this.dropdownRef.current.getBoundingClientRect().right < 400) ? 'left' : 'right';
      }
    }, 1);
  }

  UNSAFE_componentWillReceiveProps(nextProps) { // for toolbar item operation
    const nextMenuList = this.removeUselessDivider(nextProps.getMenuList(nextProps.item));
    if (nextProps.item.name !== this.props.item.name || this.state.menuList !== nextMenuList) {
      this.setState({ menuList: nextMenuList });
    }
  }

  componentWillUnmount() {
    const { isHandleContextMenuEvent = true } = this.props;
    if (isHandleContextMenuEvent && this.listenerId) {
      listener.unregister(this.listenerId);
    }
  }

  removeUselessDivider = (menuList) => {
    while (menuList && menuList[0] === 'Divider') {
      menuList.shift();
    }
    return menuList;
  };

  onShowMenu = () => {
    // nothing todo
  };

  onHideMenu = () => {
    if (this.state.isItemMenuShow) {
      this.setState({ isItemMenuShow: false });
      if (typeof(this.props.unfreezeItem) === 'function') {
        this.props.unfreezeItem();
      }
    }
  };

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onDropdownToggleClick(e);
    }
  };

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    this.toggleOperationMenu();
  };

  toggleOperationMenu = () => {
    this.setState(
      { isItemMenuShow: !this.state.isItemMenuShow },
      () => {
        if (this.state.isItemMenuShow && typeof(this.props.freezeItem) === 'function') {
          this.props.freezeItem();
        } else if (!this.state.isItemMenuShow && typeof(this.props.unfreezeItem) === 'function') {
          this.props.unfreezeItem();
        }
      }
    );
  };

  onMenuItemKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onMenuItemClick(e);
    }
  };

  onMenuItemClick = (event) => {
    let operation = Utils.getEventData(event, 'toggle') ?? event.currentTarget.getAttribute('data-toggle');
    let item = this.props.item;
    if (typeof(this.props.unfreezeItem) === 'function') {
      this.props.unfreezeItem();
    }
    this.props.onMenuItemClick(operation, event, item);
    this.setState({ isItemMenuShow: false });
  };

  onDropDownMouseMove = () => {
    if (this.state.isSubMenuShown) {
      this.setState({
        isSubMenuShown: false
      });
    }
  };

  toggleSubMenu = (e) => {
    e.stopPropagation();
    this.setState({
      isSubMenuShown: !this.state.isSubMenuShown
    });
  };

  toggleSubMenuShown = (item) => {
    this.setState({
      isSubMenuShown: true,
      currentItem: item.key
    });
  };

  render() {
    let menuList = this.state.menuList;
    let { toggleClass = 'sf3-font-more sf3-font', toggleChildren, tagName, menuStyle = {} } = this.props;
    toggleClass = 'sf-dropdown-toggle ' + toggleClass;

    if (!menuList.length) {
      return '';
    }

    if (tagName && tagName === 'button') {
      return (
        <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.onDropdownToggleClick}>
          <DropdownToggle
            tag="span"
            className={this.props.toggleClass}
            data-toggle="dropdown"
            title={gettext('More operations')}
            aria-label={gettext('More operations')}
            aria-expanded={this.state.isItemMenuShow}
            onKeyDown={this.onDropdownToggleKeyDown}
          >
            {toggleChildren}
          </DropdownToggle>
          <DropdownMenu>
            {menuList.map((menuItem, index) => {
              if (menuItem === 'Divider') {
                return <DropdownItem key={index} divider />;
              } else {
                return (
                  <DropdownItem
                    key={index}
                    data-toggle={menuItem.key}
                    onClick={this.onMenuItemClick}
                    onKeyDown={this.onMenuItemKeyDown}
                  >
                    {menuItem.value}
                  </DropdownItem>
                );
              }
            })}
          </DropdownMenu>
        </Dropdown>
      );
    }

    return (
      <Dropdown
        isOpen={this.state.isItemMenuShow}
        toggle={this.onDropdownToggleClick}
        className="vam"
        direction={this.mainMenuDirection}
      >
        <DropdownToggle
          tag={tagName || 'i'}
          role="button"
          tabIndex="0"
          className={toggleClass}
          title={gettext('More operations')}
          data-toggle="dropdown"
          aria-expanded={this.state.isItemMenuShow}
          aria-label={gettext('More operations')}
          onKeyDown={this.onDropdownToggleKeyDown}
          innerRef={this.dropdownRef}
        />
        <ModalPortal>
          <DropdownMenu
            style={menuStyle}
          >
            {menuList.map((menuItem, index) => {
              if (menuItem === 'Divider') {
                return <DropdownItem key={index} divider />;
              } else if (menuItem.subOpList) {
                return (
                  <Dropdown
                    key={index}
                    direction={this.subMenuDirection}
                    className="w-100"
                    isOpen={this.state.isSubMenuShown && this.state.currentItem == menuItem.key}
                    toggle={this.toggleSubMenu}
                    onMouseMove={(e) => {e.stopPropagation();}}
                  >
                    <DropdownToggle
                      tag='span'
                      className="dropdown-item font-weight-normal rounded-0 d-flex align-items-center"
                      onMouseEnter={this.toggleSubMenuShown.bind(this, menuItem)}
                    >
                      <span className="mr-auto">{menuItem.value}</span>
                      <i className="sf3-font-down sf3-font rotate-270"></i>
                    </DropdownToggle>
                    <DropdownMenu>
                      {menuItem.subOpListHeader && <DropdownItem header>{menuItem.subOpListHeader}</DropdownItem>}
                      {menuItem.subOpList.map((item, index) => {
                        if (item == 'Divider') {
                          return <DropdownItem key={index} divider />;
                        } else {
                          return (
                            <DropdownItem key={index} data-toggle={item.key} onClick={this.onMenuItemClick} onKeyDown={this.onMenuItemKeyDown}>
                              {item.icon_dom || null}
                              <span>{item.value}</span>
                            </DropdownItem>
                          );
                        }
                      })}
                    </DropdownMenu>
                  </Dropdown>
                );
              } else {
                return (
                  <DropdownItem
                    key={index}
                    className={classNames({ 'position-relative pl-5': this.props.tickable })}
                    data-toggle={menuItem.key}
                    onClick={this.onMenuItemClick}
                    onKeyDown={this.onMenuItemKeyDown}
                    onMouseMove={this.onDropDownMouseMove}
                  >
                    {menuItem.tick && (
                      <i className="dropdown-item-tick sf2-icon-tick"></i>
                    )}
                    {menuItem.icon_dom || null}
                    {menuItem.value}
                  </DropdownItem>
                );
              }
            })}
          </DropdownMenu>
        </ModalPortal>
      </Dropdown>
    );
  }
}

ItemDropdownMenu.propTypes = propTypes;

export default ItemDropdownMenu;
