import React from 'react'
import Delete from './menu-dialog/delete-dialog';
import CreateFlieFolder from './menu-dialog/create-fileforder-dialog';
import Rename from './menu-dialog/rename-dialog';

const gettext = window.gettext;

class NodeMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showDelete: false,
      showAddFileFolder: false,
      showRename: false,
      isFile: false
    };
  }

  toggleDelete = () => {
    this.setState({showDelete: !this.state.showDelete});
    this.props.onHideContextMenu();
  }

  toggleAddFileFolder = (ev, flag) => {
    if(flag){
      this.setState({
        showAddFileFolder: !this.state.showAddFileFolder,
        isFile: true
      });
    } else {
      this.setState({
        showAddFileFolder: !this.state.showAddFileFolder,
        isFile: false
      })
    }
    this.props.onHideContextMenu();
  }

  toggleRename = () => {
    this.setState({showRename: !this.state.showRename});
    this.props.onHideContextMenu();
  }

  onDelete = () => {
    this.setState({showDelete: !this.state.showDelete});
    this.props.onDeleteNode();
  }

  deleteCancel = () => {
    this.setState({showDelete: !this.state.showDelete});
  }

  onAddFile = (filePath) => {
    this.setState({
      showAddFileFolder: !this.state.showAddFileFolder,
      isFile: false
    });
    this.props.onAddFileNode(filePath);
  }

  addFileCancel = () => {
    this.setState({
      showAddFileFolder: !this.state.showAddFileFolder,
      isFile: false
    });
  }

  onAddFolder = (dirPath) => {
    this.setState({
      showAddFileFolder: !this.state.showAddFileFolder,
      isFile: false
    });
    this.props.onAddFolderNode(dirPath);
  }

  addFolderCancel = () => {
    this.setState({
      showAddFileFolder: !this.state.showAddFileFolder,
      isFile: false
    });
  }

  onRename = (newName) => {
    this.setState({showRename: !this.state.showRename});
    this.props.onRenameNode(newName);
  }

  renameCancel = () => {
    this.setState({showRename: !this.state.showRename});
  }

  renderNodeMenu() {
    let style = null;
    let position = this.props.menuPosition;
    if (this.props.isShowMenu) {
      style = {position: "fixed",left: position.left, top: position.top, display: 'block'};
    }

    if (this.props.currentNode.type === "dir") {

      if (this.props.currentNode.name === "/") {
        return (
          <ul className="dropdown-menu" style={style}>
            <li className="dropdown-item" onClick={this.toggleAddFileFolder}>{gettext("New Folder")}</li>
            <li className="dropdown-item" onClick={(ev,flag) => this.toggleAddFileFolder(ev,true)}>{gettext("New File")}</li>
          </ul>
        )
      }
      
      return (
        <ul className="dropdown-menu" style={style}>
          <li className="dropdown-item" onClick={this.toggleAddFileFolder}>{gettext("New Folder")}</li>
          <li className="dropdown-item" onClick={(ev,flag) => this.toggleAddFileFolder(ev,true)}>{gettext("New File")}</li>
          <li className="dropdown-item" onClick={this.toggleRename}>{gettext("Rename")}</li>
          <li className="dropdown-item" onClick={this.toggleDelete}>{gettext("Delete")}</li>
        </ul>
      )
    }

    return (
      <ul className="dropdown-menu" style={style}>
          <li className="dropdown-item" onClick={this.toggleRename}>{gettext("Rename")}</li>
          <li className="dropdown-item" onClick={this.toggleDelete}>{gettext("Delete")}</li>
      </ul>
    )
    
  }

  render() {
    if (!this.props.currentNode) {
      return (<div className="node-menu-module"></div>)
    }
    return (
      <div className="node-menu-module">
        {this.renderNodeMenu()}
        {this.state.showDelete &&
        <Delete 
          currentNode={this.props.currentNode}
          handleSubmit={this.onDelete}
          toggleCancel={this.deleteCancel}
        />
        }
        {this.state.showAddFileFolder && 
        <CreateFlieFolder 
          isFile={this.state.isFile}
          currentNode={this.props.currentNode}
          onAddFolder={this.onAddFolder}
          addFolderCancel={this.addFolderCancel}
          onAddFile={this.onAddFile}
          addFileCancel={this.addFileCancel}
        />
        }
        {this.state.showRename &&
        <Rename 
          currentNode={this.props.currentNode}
          onRename={this.onRename} 
          toggleCancel={this.renameCancel} 
        />
        }
      </div>
    )
  }
}

export default NodeMenu;
