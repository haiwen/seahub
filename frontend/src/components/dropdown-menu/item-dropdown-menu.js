import React from 'react';
import PropTypes from 'prop-types';
import listener from '../context-menu/globalEventListener';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import ModalPortal from '../modal-portal';

import '../../css/item-dropdown-menu.css';

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
  isDisplayFiles: PropTypes.bool,
};

class ItemDropdownMenu extends React.Component {

  static defaultProps = {
    isHandleContextMenuEvent: true,
    menuStyle: {},
    toggleClass: 'sf3-font-more sf3-font'
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
    let { item } = this.props;
    let menuList = this.props.getMenuList(item);
    this.setState({ menuList: menuList });
  }

  UNSAFE_componentWillReceiveProps(nextProps) { // for toolbar item operation
    let { item } = nextProps;
    if (item.name !== this.props.item.name) {
      let menuList = this.props.getMenuList(item);
      this.setState({ menuList: menuList });
    }
  }

  componentWillUnmount() {
    if (this.props.isHandleContextMenuEvent && this.listenerId) {
      listener.unregister(this.listenerId);
    }
  }

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
    this.props.onMenuItemClick(operation, event, item);
  };

  render() {
    let menuList = this.state.menuList;
    let { toggleClass, toggleChildren, tagName, menuStyle } = this.props;
    toggleClass = 'sf-dropdown-toggle ' + toggleClass;

    if (!menuList.length) {
      return '';
    }

    if (tagName && tagName === 'button') {
      return (
        <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.onDropdownToggleClick}>
          <DropdownToggle
            className={this.props.toggleClass}
            data-toggle="dropdown"
            title={gettext('More operations')}
            aria-label={gettext('More operations')}
            aria-expanded={this.state.isItemMenuShow}
            onKeyDown={this.onDropdownToggleKeyDown}
            // onClick={this.onDropdownToggleClick}
          >
            {toggleChildren}
          </DropdownToggle>
          <DropdownMenu>
            {menuList.map((menuItem, index) => {
              if (menuItem === 'Divider') {
                return <DropdownItem key={index} divider />;
              } else {
                return (
                  <DropdownItem key={index} data-toggle={menuItem.key} onClick={this.onMenuItemClick} onKeyDown={this.onMenuItemKeyDown}>{menuItem.value}</DropdownItem>
                );
              }
            })}
          </DropdownMenu>
        </Dropdown>
      );
    }

    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.onDropdownToggleClick} className="vam">
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
          // onClick={this.onDropdownToggleClick}
        />
        <ModalPortal>
          <DropdownMenu style={menuStyle}>
            {menuList.map((menuItem, index) => {
              if (menuItem === 'Divider') {
                return <DropdownItem key={index} divider />;
              } else {
                return (
                  <DropdownItem className='p-0' key={index} data-toggle={menuItem.key} onClick={this.onMenuItemClick} onKeyDown={this.onMenuItemKeyDown}>
                    <div className='dropdown-item-wrapper'>
                      <span className='dropdown-item-tick'>
                        {menuItem.value === 'Display files' && this.props.isDisplayFiles && (
                          <i className="sf2-icon-tick"></i>
                        )}
                      </span>
                      <span className='dropdown-item-content'>{menuItem.value}</span>
                    </div>
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
