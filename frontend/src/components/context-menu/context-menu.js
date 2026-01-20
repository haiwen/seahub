import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import listener from './globalEventListener';
import { hideMenu } from './actions';
import { callIfExists } from './helpers';
import { Utils } from '../../utils/utils';
import Icon from '../icon';

const propTypes = {
  id: PropTypes.string.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
  onShowMenu: PropTypes.func,
  onHideMenu: PropTypes.func,
  getMenuContainerSize: PropTypes.func,
};

const MENU_BORDER_INDENT = 10;

class ContextMenu extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      x: 0,
      y: 0,
      isVisible: false,
      currentObject: null,
      menuList: [],
      isSubMenuShown: false,
      currentItem: ''
    };
  }

  componentDidMount() {
    this.listenId = listener.register(this.handleShow, this.handleHide);
  }

  componentDidUpdate() {
    if (this.state.isVisible) {
      const wrapper = window.requestAnimationFrame || setTimeout;

      wrapper(() => {
        const { x, y } = this.state;
        const { top, left } = this.getMenuPosition(x, y);

        wrapper(() => {
          if (!this.menu) return;
          this.menu.style.top = `${top}px`;
          this.menu.style.left = `${left}px`;
          this.menu.style.opacity = 1;
          this.menu.style.pointerEvents = 'auto';
        });
      });
    } else {
      if (!this.menu) return;
      this.menu.style.opacity = 0;
      this.menu.style.pointerEvents = 'none';
    }
  }

  componentWillUnmount() {
    if (this.listenId) {
      listener.unregister(this.listenId);
    }

    this.unregisterHandlers();
  }

  registerHandlers = () => {
    document.addEventListener('mousedown', this.handleOutsideClick);
    document.addEventListener('touchstart', this.handleOutsideClick);
    document.addEventListener('scroll', this.handleHide);
    document.addEventListener('contextmenu', this.handleHide);
    document.addEventListener('keydown', this.handleKeyNavigation);
    window.addEventListener('resize', this.handleHide);
  };

  unregisterHandlers = () => {
    document.removeEventListener('mousedown', this.handleOutsideClick);
    document.removeEventListener('touchstart', this.handleOutsideClick);
    document.removeEventListener('scroll', this.handleHide);
    document.removeEventListener('contextmenu', this.handleHide);
    document.removeEventListener('keydown', this.handleKeyNavigation);
    window.removeEventListener('resize', this.handleHide);
  };

  handleShow = (e) => {
    if (e.detail.id !== this.props.id) return;
    const { x, y } = e.detail.position;
    if (this.props.getMenuContainerSize) {
      const containerSize = this.props.getMenuContainerSize();
      const relativeX = x - (window.innerWidth - parseFloat(containerSize.width));
      const relativeY = y - (window.innerHeight - parseFloat(containerSize.height));
      this.setState({
        x: relativeX,
        y: relativeY,
      });
    } else {
      this.setState({ x, y });
    }

    const { currentObject, menuList } = e.detail;
    this.setState({ isVisible: true, currentObject, menuList });
    this.registerHandlers();
    callIfExists(this.props.onShowMenu, e);
  };

  handleHide = (e) => {
    if (this.state.isVisible && (!e.detail || !e.detail.id || e.detail.id === this.props.id)) {
      this.unregisterHandlers();
      this.setState({ isVisible: false });
      callIfExists(this.props.onHideMenu, e);
    }
  };

  handleOutsideClick = (e) => {
    if (!this.menu.contains(e.target)) hideMenu();
  };

  handleMouseLeave = (event) => {
    event.preventDefault();
  };

  handleContextMenu = (e) => {
    this.handleHide(e);
  };

  handleKeyNavigation = (e) => {
    if (this.state.isVisible === false) {
      return;
    }
    e.preventDefault();
    this.hideMenu(e);
  };

  hideMenu = (e) => {
    if (e.keyCode === 27 || e.keyCode === 13) { // ECS or enter
      hideMenu();
    }
  };

  getMenuPosition = (x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };

    if (!this.menu) return menuStyles;

    let { innerWidth, innerHeight } = window;
    const rect = this.menu.getBoundingClientRect();

    if (this.props.getMenuContainerSize) {
      let containerSize = this.props.getMenuContainerSize();
      innerWidth = parseFloat(containerSize.width);
      innerHeight = parseFloat(containerSize.height);
    }

    if (y + rect.height > innerHeight - MENU_BORDER_INDENT) {
      menuStyles.top = innerHeight - rect.height - MENU_BORDER_INDENT;
    }

    if (x + rect.width > innerWidth - MENU_BORDER_INDENT) {
      menuStyles.left = innerWidth - rect.width - MENU_BORDER_INDENT;
    }

    if (menuStyles.left < 0) {
      menuStyles.left = rect.width < innerWidth ? (innerWidth - rect.width) / 2 : 0;
    }

    if (menuStyles.top < 0) {
      menuStyles.top = rect.height < innerHeight ? (innerHeight - rect.height) / 2 : 0;
    }

    return menuStyles;
  };


  onMenuItemClick = (event) => {
    event.stopPropagation();
    let operation = Utils.getEventData(event, 'operation');
    let currentObject = this.state.currentObject;
    this.props.onMenuItemClick(operation, currentObject, event);
  };

  onContextMenu = (event) => {
    event.stopPropagation();
  };

  onDropDownMouseMove = (e) => {
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
    const inlineStyle = { position: 'fixed', opacity: 0, pointerEvents: 'none', display: 'block' };
    return (
      <div role="menu" className="seafile-contextmenu dropdown-menu" style={inlineStyle} ref={menu => { this.menu = menu; }}>
        {this.state.menuList.map((menuItem, index) => {
          if (menuItem === 'Divider') {
            return <div key={index} className="seafile-divider dropdown-divider"></div>;
          } else if (menuItem.subOpList) {
            return (
              <Dropdown
                key={index}
                direction="right"
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
                  <Icon symbol="arrow-down" className="rotate-270" />
                </DropdownToggle>
                <DropdownMenu>
                  {menuItem.subOpList.map((item, index) => {
                    if (item == 'Divider') {
                      return <DropdownItem key={index} divider />;
                    } else {
                      return (
                        <DropdownItem key={index} data-operation={item.key} onClick={this.onMenuItemClick} onContextMenu={this.onContextMenu}>{item.value}</DropdownItem>
                      );
                    }
                  })}
                </DropdownMenu>
              </Dropdown>
            );
          } else {
            return (
              <button
                key={index}
                className="seafile-contextmenu-item dropdown-item"
                data-operation={menuItem.key}
                onClick={this.onMenuItemClick}
                onContextMenu={this.onContextMenu}
                onMouseMove={this.onDropDownMouseMove}
              >
                {menuItem.value}
              </button>
            );
          }
        })}
      </div>
    );
  }
}

ContextMenu.propTypes = propTypes;

export default ContextMenu;
