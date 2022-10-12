import React from 'react';
import PropTypes from 'prop-types';
import listener from '../context-menu/globalEventListener';
import { Dropdown, ButtonDropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  tagName: PropTypes.string,
  item: PropTypes.object.isRequired,
  toggleClass: PropTypes.string,
  isHandleContextMenuEvent: PropTypes.bool,
  getMenuList: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  freezeItem: PropTypes.func,
  unfreezeItem: PropTypes.func,
};

class ItemDropdownMenu extends React.Component {

  static defaultProps = {
    isHandleContextMenuEvent: true,
    toggleClass: 'sf2-icon-caret-down'
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
    this.setState({menuList: menuList});
  }

  componentWillReceiveProps(nextProps) {  // for toolbar item operation
    let { item } = nextProps;
    if (item.name !== this.props.item.name) {
      let menuList = this.props.getMenuList(item);
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

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onDropdownToggleClick(e);
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

  onMenuItemKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onMenuItemClick(e);
    }
  }

  onMenuItemClick = (event) => {
    let operation = Utils.getEventData(event, 'toggle');
    let item = this.props.item;
    this.props.onMenuItemClick(operation, event, item);
  }

  render() {
    let menuList = this.state.menuList;
    let { toggleClass, tagName } = this.props;
    toggleClass = 'sf-dropdown-toggle ' + toggleClass;

    if (!menuList.length) {
      return '';
    }

    if (tagName && tagName === 'button') {
      return (
        <ButtonDropdown isOpen={this.state.isItemMenuShow} toggle={this.onDropdownToggleClick}>
          <DropdownToggle
            className={toggleClass}
            data-toggle="dropdown"
            title={gettext('More Operations')}
            aria-label={gettext('More Operations')}
            aria-expanded={this.state.isItemMenuShow}
            onKeyDown={this.onDropdownToggleKeyDown}
            // onClick={this.onDropdownToggleClick}
          >
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
        </ButtonDropdown>
      );
    }

    return (
      <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.onDropdownToggleClick} className="vam">
        <DropdownToggle
          tag={tagName || 'i'}
          role="button"
          tabIndex="0"
          className={toggleClass}
          title={gettext('More Operations')}
          data-toggle="dropdown"
          aria-expanded={this.state.isItemMenuShow}
          aria-label={gettext('More Operations')}
          onKeyDown={this.onDropdownToggleKeyDown}
          // onClick={this.onDropdownToggleClick}
        />
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
}

ItemDropdownMenu.propTypes = propTypes;

export default ItemDropdownMenu;
