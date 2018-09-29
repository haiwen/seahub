import React from 'react';
import { gettext } from '../constants';

class NodeMenu extends React.Component {
  
  toggleAddFileFolder = (ev, flag) => {
    this.props.toggleAddFileFolder(flag);
  }
  
  toggleRename = () => {
    this.props.toggleRename();
  }
  
  toggleDelete = () => {
    this.props.toggleDelete();
  }

  renderNodeMenu() {
    let position = this.props.menuPosition;
    let style = {position: 'fixed',left: position.left, top: position.top, display: 'block'};

    if (this.props.currentNode.type === 'dir') {
      if (this.props.currentNode.name === '/') {
        return (
          <ul className="dropdown-menu" style={style}>
            <li className="dropdown-item" onClick={this.toggleAddFileFolder}>{gettext('New Folder')}</li>
            <li className="dropdown-item" onClick={(ev,flag) => this.toggleAddFileFolder(ev,true)}>{gettext('New File')}</li>
          </ul>
        );
      }
      
      return (
        <ul className="dropdown-menu" style={style}>
          <li className="dropdown-item" onClick={this.toggleAddFileFolder}>{gettext('New Folder')}</li>
          <li className="dropdown-item" onClick={(ev,flag) => this.toggleAddFileFolder(ev,true)}>{gettext('New File')}</li>
          <li className="dropdown-item" onClick={this.toggleRename}>{gettext('Rename')}</li>
          <li className="dropdown-item" onClick={this.toggleDelete}>{gettext('Delete')}</li>
        </ul>
      );
    }

    return (
      <ul className="dropdown-menu" style={style}>
        <li className="dropdown-item" onClick={this.toggleRename}>{gettext('Rename')}</li>
        <li className="dropdown-item" onClick={this.toggleDelete}>{gettext('Delete')}</li>
      </ul>
    );
    
  }

  render() {
    if (!this.props.currentNode) {
      return (<div className="node-menu-module"></div>);
    }
    return (
      <div className="node-menu-module">
        {this.renderNodeMenu()}
      </div>
    );
  }
}

export default NodeMenu;
