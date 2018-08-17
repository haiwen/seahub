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
      showAddFile: false,
      showAddFolder: false,
      showRename: false
    };
  }

  toggleDelete = () => {
    this.setState({showDelete: !this.state.showDelete});
    this.props.onHideContextMenu();
  }

  toggleAddFile = () => {
    this.setState({showAddFile: !this.state.showAddFile});
    this.props.onHideContextMenu();
  }

  toggleAddFolder = () => {
    this.setState({showAddFolder: !this.state.showAddFolder});
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
    this.setState({showAddFile: !this.state.showAddFile});
    this.props.onAddFileNode(filePath);
  }

  addFileCancel = () => {
    this.setState({showAddFile: !this.state.showAddFile});
  }

  onAddFolder = (dirPath) => {
    this.setState({showAddFolder: !this.state.showAddFolder});
    this.props.onAddFolderNode(dirPath);
  }

  addFolderCancel = () => {
    this.setState({showAddFolder: !this.state.showAddFolder});
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
          <li className="dropdown-item" onClick={this.toggleAddFolder}>New Folder</li>
          <li className="dropdown-item" onClick={this.toggleAddFile}>New File</li>
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

        <AddFile 
          isOpen={this.state.showAddFile}
          currentNode={this.props.currentNode}
          onSetFilePath={this.onAddFile}
          toggleCancel={this.addFileCancel}  
        />

        <AddFolder 
          isOpen={this.state.showAddFolder}
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