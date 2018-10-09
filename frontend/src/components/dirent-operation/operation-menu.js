import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

const propTypes = {
  currentItem: PropTypes.object.isRequired,
  menuPosition: PropTypes.object.isRequired, 
};

class OperationMenu extends React.Component {

  getItemType() {
    return this.props.currentItem.type;
  }

  renderDirentDirMenu() {
    let position = this.props.menuPosition;
    let style = {position: 'fixed', left: position.left, top: position.top, display: 'block'};
    if (this.props.currentItem.permission === 'rw') {
      return (
        <ul className="dropdown-menu operation-menu" style={style}>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Rename')} aria-label={gettext('Rename')}>{gettext('Rename')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Move')} aria-label={gettext('Move')}>{gettext('Move')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Copy')} aria-label={gettext('Copy')}>{gettext('Copy')}</span>
          </li>
          <li className="dropdown-item menu-inner-divider"></li>

          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Permission')} aria-label={gettext('Permission')}>{gettext('Permission')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Details')} aria-label={gettext('Details')}>{gettext('Details')}</span>
          </li>
          <li className="dropdown-item menu-inner-divider"></li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Open via Client')} aria-label={gettext('Open via Client')}>{gettext('Open via Client')}</span>
          </li>
        </ul>
      );
    }

    if (this.props.currentItem.permission === 'r') {
      return (
        <ul className="dropdown-menu operation-menu" style={style}>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Copy')} aria-label={gettext('Copy')}>{gettext('Copy')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Details')} aria-label={gettext('Details')}>{gettext('Details')}</span>
          </li>
        </ul>
      );
    }

  }

  renderDirentFileMenu() {
    let position = this.props.menuPosition;
    let style = {position: 'fixed', left: position.left, top: position.top, display: 'block'};
    if (this.props.currentItem.permission === 'rw') {
      return (
        <ul className="dropdown-menu operation-menu" style={style}>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Rename')} aria-label={gettext('Rename')}>{gettext('Rename')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Move')} aria-label={gettext('Move')}>{gettext('Move')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Copy')} aria-label={gettext('Copy')}>{gettext('Copy')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Lock')} aria-label={gettext('Lock')}>{gettext('Lock')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Unlock')} aria-label={gettext('Unlock')}>{gettext('Unlock')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('New Draft')} aria-label={gettext('New Draft')}>{gettext('New Draft')}</span>
          </li>
          <li className="dropdown-item menu-inner-divider"></li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Comment')} aria-label={gettext('Comment')}>{gettext('Comment')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="" title={gettext('History')} aria-label={gettext('History')}>{gettext('History')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Access Log')} aria-label={gettext('Access Log')}>{gettext('Access Log')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Details')} aria-label={gettext('Details')}>{gettext('Details')}</span>
          </li>
          <li className="dropdown-item menu-inner-divider"></li>

          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Open via Client')} aria-label={gettext('Open via Client')}>{gettext('Open via Client')}</span>
          </li>
        </ul>
      );
    }

    if (this.props.currentItem.permission === "r") {
      return (
        <ul className="dropdown-menu operation-menu" style={style}>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Copy')} aria-label={gettext('Copy')}>{gettext('Copy')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Comment')} aria-label={gettext('Comment')}>{gettext('Comment')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('History')} aria-label={gettext('History')}>{gettext('History')}</span>
          </li>
          <li className="dropdown-item operation-menu-item">
            <span className="user-select-none" title={gettext('Details')} aria-label={gettext('Details')}>{gettext('Details')}</span>
          </li>
        </ul>
      );
    }

  }

  render() {
    let type = this.getItemType();
    let menu = null;
    switch(type) {
      case 'file':
        menu = this.renderDirentFileMenu();
        break;
      case 'dir':
        menu = this.renderDirentDirMenu();
        break;
      default:
        break;
    }
    return menu;
  }
}

OperationMenu.propTypes = propTypes;

export default OperationMenu;
