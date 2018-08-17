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
    this.props.onDeleteNode();
    this.setState({showDelete: !this.state.showDelete});
  }

  deleteCancel = () => {
    this.setState({showDelete: !this.state.showDelete});
  }

  onAddFile = (filePath) => {
    this.props.onAddFileNode(filePath);
    this.setState({showAddFile: !this.state.showAddFile});
  }

  addFileCancel = () => {
    this.setState({showAddFile: !this.state.showAddFile});
  }

  onAddFolder = (dirPath) => {
    this.props.onAddFolderNode(dirPath);
    this.setState({showAddFolder: !this.state.showAddFolder});
  }

  addFolderCancel = () => {
    this.setState({showAddFolder: !this.state.showAddFolder});
  }

  onRename = (newName) => {
    this.props.onRenameNode(newName);
    this.setState({showRename: !this.state.showRename});
  }

  renameCancel = () => {
    this.setState({showRename: !this.state.showRename});
  }

  render() {
    let left = this.props.left;
    let top = this.props.top;
    let style = {position: "fixed",left: left, top: top};
    return (
      <div className={`node-menu-module ${this.props.isShowMenu ? "" : "hide"}`} style={style}>
        <ul className="sf-dropdown-menu">
          <li className="op" onClick={this.toggleDelete}><a>Delete</a></li>
          <li className="op" onClick={this.toggleAddFile}><a>New File</a></li>
          <li className="op" onClick={this.toggleAddFolder}><a>New Folder</a></li>
          <li className="op" onClick={this.toggleRename}><a>Rename</a></li>
        </ul>
        <Delete 
          isOpen={this.state.showDelete} 
          handleSubmit={this.onDelete}
          toggleCancel={this.deleteCancel} 
        />

        <AddFile 
          isOpen={this.state.showAddFile}
          onSetFilePath={this.onAddFile}
          toggleCancel={this.addFileCancel}  
        />

        <AddFolder 
          isOpen={this.state.showAddFolder}
          onSetFolderPath={this.onAddFolder}
          toggleCancel={this.addFolderCancel} 
        />

        <Rename 
          isOpen={this.state.showRename}
          type={this.props.type}
          preName={this.props.fileName}
          onRename={this.onRename} 
          toggleCancel={this.renameCancel} 
        />
      </div>
    )
  }
}

export default NodeMenu;