import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

import '../../css/file-type.css'

const propTypes = {
  onMenuItemClick: PropTypes.func.isRequired,
  node: PropTypes.object,
  event: PropTypes.object,
  closeRightMenu: PropTypes.func,
};

class TypeFie extends React.Component {

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

  onMenuItemClick = (event) => {
    let operation = event.target.dataset.toggle;
    let node = this.props.node;
    this.props.onMenuItemClick(operation, node);
    this.props.closeRightMenu()
  }

  isCalculationDistance = () => {
    let event = this.props.event;
    let rightTreeMenu = document.querySelector('.right-tree-menu')

    if (event.clientY + rightTreeMenu.offsetHeight > document.body.clientHeight) {
      rightTreeMenu.style.top = event.clientY - rightTreeMenu.offsetHeight + 'px'
    } else {
      rightTreeMenu.style.top = event.clientY + 'px';
    }
    rightTreeMenu.style.left = event.clientX + 'px';

    document.addEventListener('click',this.listenerClick)
  }

  listenerClick = (e) => {
    let event = this.props.event;
    let rightTreeMenu = document.querySelector('.right-tree-menu');

    if ((e.clientX <= parseInt(event.clientX)) || (e.clientX >= parseInt(event.clientX) + parseInt(rightTreeMenu.offsetWidth))) {
      this.props.closeRightMenu()
    }

    if (event.clientY + rightTreeMenu.offsetHeight > document.body.clientHeight) {
        if ((e.clientY <= (parseInt(event.clientY) - parseInt(rightTreeMenu.offsetHeight))) || e.clientY >= parseInt(event.clientY)) {
          this.props.closeRightMenu()
        }
    } else {
        if ((e.clientY <= parseInt(event.clientY)) || (e.clientY >= parseInt(event.clientY) + parseInt(rightTreeMenu.offsetHeight))) {
          this.props.closeRightMenu()
        }
    }
  }

  componentDidUpdate() {
    this.isCalculationDistance()
  }

  componentWillUnmount() {
    document.removeEventListener('click',this.listenerClick)
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

TypeFie.propTypes = propTypes;

export default TypeFie;
