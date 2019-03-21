import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

import '../../css/tree-view-contextmenu.css'

const propTypes = {
  onMenuItemClick: PropTypes.func.isRequired,
  node: PropTypes.object,
  event: PropTypes.object,
  closeRightMenu: PropTypes.func,
};

class TreeViewContexMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
      menuList: [],
    };
  }

  componentDidMount() {
    let menuList = this.caculateMenuList();
    this.setState({menuList: menuList});
  }

  componentDidUpdate() {
    this.calculateMenuDistance()
  }

  componentWillUnmount() {
    document.removeEventListener('click',this.listenClick)
    document.removeEventListener('mousemove',this.handleContextMenu)
  }

  caculateMenuList() {
    let { node } = this.props;
    let menuList = [];
    if (!node) {
        menuList = ['New Folder', 'New File', ]
    } else {
      if (node.object.type === 'dir') {
        menuList = ['New Folder', 'New File', 'Copy', 'Move', 'Rename', 'Delete'];
      } else {
        menuList = ['Rename', 'Delete', 'Copy', 'Move', 'Open in New Tab'];
      } 
    }
    return menuList;
  }

  calculateMenuDistance = () => {
    let event = this.props.event;
    let rightTreeMenu = document.querySelector('.right-tree-menu')
    let rightTreeMenuHeight = rightTreeMenu.offsetHeight;

    if (event.clientY + rightTreeMenuHeight > document.body.clientHeight) {
      rightTreeMenu.style.top = event.clientY - rightTreeMenuHeight + 'px'
    } else {
      rightTreeMenu.style.top = event.clientY + 'px';
    }
    rightTreeMenu.style.left = event.clientX + 'px';

    document.addEventListener('click',this.listenClick)
    document.addEventListener('mousemove',this.handleContextMenu)
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
      case 'Copy':
        translateResult = gettext('Copy');
        break;
      case 'Move':
        translateResult = gettext('Move');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Open in New Tab':
        translateResult = gettext('Open in New Tab');
        break;
      default:
        break;
    }
    return translateResult;
  }

  handleContextMenu = (e) => {
    let event = this.props.event;
    let rightTreeMenu = document.querySelector('.right-tree-menu');
    let rightTreeMenuHeight = rightTreeMenu.offsetHeight;
    let rightTreeMenuWidth = rightTreeMenu.offsetWidth;

    if (event.clientY + rightTreeMenuHeight > document.body.clientHeight) {
      if ((e.clientX >= event.clientX) && (e.clientX <= (event.clientX + rightTreeMenuWidth)) && (e.clientY <= event.clientY) && (e.clientY >= (event.clientY - rightTreeMenuHeight))) {
        this.props.hideContextMenu()
      } else {
        this.props.showContextMenu()
      }
    } else {
      if ((e.clientX >= event.clientX) && (e.clientX <= (event.clientX + rightTreeMenuWidth)) && (e.clientY >= event.clientY) && (e.clientY <= (event.clientY + rightTreeMenuHeight))) {
        this.props.hideContextMenu()
      } else {
        this.props.showContextMenu()
      }
    }
  }

  listenClick = (e) => {
    let event = this.props.event;
    let rightTreeMenu = document.querySelector('.right-tree-menu');
    let rightTreeMenuHeight = rightTreeMenu.offsetHeight;
    let rightTreeMenuWidth = rightTreeMenu.offsetWidth;

    if ((e.clientX <= event.clientX) || (e.clientX >= (event.clientX + rightTreeMenuWidth))) {
      this.props.closeRightMenu()
    }

    if (event.clientY + rightTreeMenuHeight > document.body.clientHeight) {
      if ((e.clientY <= (event.clientY - rightTreeMenuHeight)) || e.clientY >= event.clientY) {
        this.props.closeRightMenu()
      }
    } else {
      if ((e.clientY <= event.clientY) || (e.clientY >= (event.clientY + rightTreeMenuHeight))) {
        this.props.closeRightMenu()
      }
    }
  }

  onMenuItemClick = (event) => {
    let operation = event.target.dataset.toggle;
    let node = this.props.node;
    this.props.onMenuItemClick(operation, node);
    this.props.closeRightMenu()
  }

  render() {
    return (
      <div className='right-tree-menu'>
        {this.state.menuList.map((menuItem, index) => {
          return (
            <button className='right-tree-item' key={index} data-toggle={menuItem} onClick={this.onMenuItemClick}>{this.translateMenuItem(menuItem)}</button>
          );
        })}
      </div>
    );
  }
}

TreeViewContexMenu.propTypes = propTypes;

export default TreeViewContexMenu;
