import React from 'react'
import Delete from '../delete-dialog';
import AddFile from '../add-file-dialog';
import AddFolder from '../add-dir-dialog';
import Rename from '../rename-dialog';

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
    var style = null;
    if (this.props.isShowMenu) {
      style = {position: "fixed",left: this.props.left, top: this.props.top, display: 'block'};
    }
    if (this.props.currentNode.type === "dir") {
      return (
        <ul className="dropdown-menu" style={style}>
          <li className="dropdown-item" onClick={this.toggleAddFileFolder}>New Folder</li>
          <li className="dropdown-item" onClick={(ev,flag) => this.toggleAddFileFolder(ev,true)}>New File</li>
          <li className="dropdown-item" onClick={this.toggleRename}>Rename</li>
          <li className="dropdown-item" onClick={this.toggleDelete}>Delete</li>
        </ul>
      )
    }

    return (
      <ul className="dropdown-menu" style={style}>
          <li className="dropdown-item" onClick={this.toggleRename}>Rename</li>
          <li className="dropdown-item" onClick={this.toggleDelete}>Delete</li>
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
        <Delete 
          isOpen={this.state.showDelete}
          currentNode={this.props.currentNode}
          isCurrentFile={this.props.isCurrentFile}
          handleSubmit={this.onDelete}
          toggleCancel={this.deleteCancel}
        />

        <CreateFlieFolder 
          isOpen={this.state.showAddFileFolder}
          isFile={this.state.isFile}
          currentNode={this.props.currentNode}
          onSetFolderPath={this.onAddFolder}
          toggleCancel={this.addFolderCancel} 
        />

        <Rename 
          isOpen={this.state.showRename}
          currentNode={this.props.currentNode}
          onRename={this.onRename} 
          toggleCancel={this.renameCancel} 
        />
      </div>
    )
  }
}

export default NodeMenu;