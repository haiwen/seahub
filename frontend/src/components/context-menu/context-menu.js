import React from 'react';
import PropTypes from 'prop-types';
import listener from './globalEventListener';
import { hideMenu } from './actions';
import { callIfExists } from './helpers';
import { Utils } from '../../utils/utils';

const propTypes = {
  id: PropTypes.string.isRequired,
  rtl: PropTypes.bool,
  onMenuItemClick: PropTypes.func.isRequired,
  onShowMenu: PropTypes.func,
  onHideMenu: PropTypes.func,
};

class ContextMenu extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      x: 0,
      y: 0,
      isVisible: false,
      currentObject: null,
      menuList: [],
    };
  }

  componentDidMount() {
    this.listenId = listener.register(this.handleShow, this.handleHide);
  }

  componentDidUpdate () {
    if (this.state.isVisible) {
      const wrapper = window.requestAnimationFrame || setTimeout;

      wrapper(() => {
        const { x, y } = this.state;
        const { top, left } = this.props.rtl ? this.getRTLMenuPosition(x, y) : this.getMenuPosition(x, y);

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
  }

  unregisterHandlers = () => {
    document.removeEventListener('mousedown', this.handleOutsideClick);
    document.removeEventListener('touchstart', this.handleOutsideClick);
    document.removeEventListener('scroll', this.handleHide);
    document.removeEventListener('contextmenu', this.handleHide);
    document.removeEventListener('keydown', this.handleKeyNavigation);
    window.removeEventListener('resize', this.handleHide);
  }

  handleShow = (e) => {
    if (e.detail.id !== this.props.id) return;

    const { x, y } = e.detail.position;
    const { currentObject, menuList} = e.detail;

    this.setState({ isVisible: true, x, y, currentObject, menuList });
    this.registerHandlers();
    callIfExists(this.props.onShowMenu, e);
  }

  handleHide = (e) => {
    if (this.state.isVisible && (!e.detail || !e.detail.id || e.detail.id === this.props.id)) {
      this.unregisterHandlers();
      this.setState({ isVisible: false});
      callIfExists(this.props.onHideMenu, e);
    }
  }

  handleOutsideClick = (e) => {
    if (!this.menu.contains(e.target)) hideMenu();
  }

  handleMouseLeave = (event) => {
    event.preventDefault();

    if (this.props.hideOnLeave) hideMenu();
  }

  handleContextMenu = (e) => {
    this.handleHide(e);
  }

  handleKeyNavigation = (e) => {
    if (this.state.isVisible === false) {
      return;
    }
    e.preventDefault();
    this.hideMenu(e);
  }

  hideMenu = (e) => {
    if (e.keyCode === 27 || e.keyCode === 13) { // ECS or enter
      hideMenu();
    }
  }

  getMenuPosition = (x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };

    if (!this.menu) return menuStyles;

    const { innerWidth, innerHeight } = window;
    const rect = this.menu.getBoundingClientRect();

    if (y + rect.height > innerHeight) {
      menuStyles.top -= rect.height;
    }

    if (x + rect.width > innerWidth) {
      menuStyles.left -= rect.width;
    }

    if (menuStyles.top < 0) {
      menuStyles.top = rect.height < innerHeight ? (innerHeight - rect.height) / 2 : 0;
    }

    if (menuStyles.left < 0) {
      menuStyles.left = rect.width < innerWidth ? (innerWidth - rect.width) / 2 : 0;
    }

    return menuStyles;
  }

  getRTLMenuPosition = (x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };

    if (!this.menu) return menuStyles;

    const { innerWidth, innerHeight } = window;
    const rect = this.menu.getBoundingClientRect();

    // Try to position the menu on the left side of the cursor
    menuStyles.left = x - rect.width;

    if (y + rect.height > innerHeight) {
      menuStyles.top -= rect.height;
    }

    if (menuStyles.left < 0) {
      menuStyles.left += rect.width;
    }

    if (menuStyles.top < 0) {
      menuStyles.top = rect.height < innerHeight ? (innerHeight - rect.height) / 2 : 0;
    }

    if (menuStyles.left + rect.width > innerWidth) {
      menuStyles.left = rect.width < innerWidth ? (innerWidth - rect.width) / 2 : 0;
    }

    return menuStyles;
  }


  onMenuItemClick = (event) => {
    event.stopPropagation();
    let operation = Utils.getEventData(event, 'operation');
    let currentObject = this.state.currentObject;
    this.props.onMenuItemClick(operation, currentObject, event);
  }

  onContextMenu = (event) => {
    event.stopPropagation();
  }

  render() {
    const inlineStyle = { position: 'fixed', opacity: 0, pointerEvents: 'none', display: 'block' };
    return (
      <div role="menu" className="seafile-contextmenu dropdown-menu" style={inlineStyle} ref={menu => { this.menu = menu; }}>
        {this.state.menuList.map((menuItem, index) => {
          if (menuItem === 'Divider') {
            return <div key={index} className="seafile-divider dropdown-divider"></div>;
          } else {
            return (
              <button
                key={index}
                className="seafile-contextmenu-item dropdown-item"
                data-operation={menuItem.key}
                onClick={this.onMenuItemClick}
                onContextMenu={this.onContextMenu}
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
