import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import TreeView from '../../components/tree-view/tree-view';
import Loading from '../../components/loading';
import ModalPortal from '../../components/modal-portal';
import Delete from '../../components/dialog/delete-dialog';
import Rename from '../../components/dialog/rename-dialog';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';
import { siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  currentPath: PropTypes.string.isRequired,
  repoPermission: PropTypes.bool.isRequired,
  isTreeDataLoading: PropTypes.bool.isRequired,
  treeData: PropTypes.object.isRequired,
  currentNode: PropTypes.object,
  onNodeClick: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onDeleteNode: PropTypes.func.isRequired,
  onAddFileNode: PropTypes.func.isRequired,
  onAddFolderNode: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  navRate: PropTypes.number,
  inResizing: PropTypes.bool.isRequired,
};

class DirColumnNav extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      opNode: null,
      isDeleteDialogShow: false,
      isAddFileDialogShow: false,
      isAddFolderDialogShow: false,
      isRenameDialogShow: false,
    };
    this.isNodeMenuShow = true;
  }

  componentWillReceiveProps(nextProps) {
    this.setState({opNode: nextProps.currentNode});
  }

  onNodeClick = (node) => {
    this.setState({opNode: node});
    this.props.onNodeClick(node);
  }

  onMenuItemClick = (operation, node) => {
    this.setState({opNode: node});
    switch (operation) {
      case 'New Folder':
        this.onAddFolderToggle();
        break;
      case 'New File':
        this.onAddFileToggle();
        break;
      case 'Rename':
        this.onRenameToggle();
        break;
      case 'Delete':
        this.onDeleteToggle();
        break;
      case 'Open in New Tab':
        this.onOpenFile(node);
        break;
    }
  }

  onAddFileToggle = (type) => {
    if (type === 'root') {
      let root = this.props.treeData.root;
      this.setState({
        isAddFileDialogShow: !this.state.isAddFileDialogShow,
        opNode: root,
      });
    } else {
      this.setState({isAddFileDialogShow: !this.state.isAddFileDialogShow});
    }
  }
  
  onAddFolderToggle = (type) => {
    if (type === 'root') {
      let root = this.props.treeData.root;
      this.setState({
        isAddFolderDialogShow: !this.state.isAddFolderDialogShow,
        opNode: root,
      });
    } else {
      this.setState({isAddFolderDialogShow: !this.state.isAddFolderDialogShow});
    }
  }

  onRenameToggle = () => {
    this.setState({isRenameDialogShow: !this.state.isRenameDialogShow});
  }

  onDeleteToggle = () => {
    this.setState({isDeleteDialogShow: !this.state.isDeleteDialogShow});
  }

  onAddFolderNode = (dirPath) => {
    this.setState({isAddFolderDialogShow: !this.state.isAddFolderDialogShow});
    this.props.onAddFolderNode(dirPath);
  }

  onAddFileNode = (filePath, isDraft) => {
    this.setState({isAddFileDialogShow: !this.state.isAddFileDialogShow});
    this.props.onAddFileNode(filePath, isDraft);
  }

  onRenameNode = (newName) => {
    this.setState({isRenameDialogShow: !this.state.isRenameDialogShow});
    let node = this.state.opNode;
    this.props.onRenameNode(node, newName);
  }

  onDeleteNode = () => {
    this.setState({isDeleteDialogShow: !this.state.isDeleteDialogShow});
    let node = this.state.opNode;
    this.props.onDeleteNode(node);
  }

  onOpenFile = (node) => {
    let newUrl = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(node.path);
    window.open(newUrl, '_blank');
  }

  checkDuplicatedName = (newName) => {
    let node = this.state.opNode;
    // root node to new node conditions: parentNode is null, 
    let parentNode = node.parentNode ? node.parentNode : node;
    let childrenObject = parentNode.children.map(item => {
      return item.object;
    });
    let isDuplicated = childrenObject.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  }

  render() {
    let flex = this.props.navRate ? '0 0 ' + this.props.navRate * 100 + '%' : '0 0 25%';
    const select = this.props.inResizing ? 'none' : '';
    return (
      <Fragment>
        <div className="dir-content-nav" role="navigation" style={{flex: (flex), userSelect: select}}>
          {this.props.isTreeDataLoading ? 
            (<Loading/>) :
            (<TreeView
              repoPermission={this.props.repoPermission}
              isNodeMenuShow={this.isNodeMenuShow}
              treeData={this.props.treeData}
              currentPath={this.props.currentPath}
              onNodeClick={this.onNodeClick}
              onNodeExpanded={this.props.onNodeExpanded}
              onNodeCollapse={this.props.onNodeCollapse}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.onFreezedItem}
              onUnFreezedItem={this.onUnFreezedItem}
            />)
          }
        </div>
        {this.state.isAddFolderDialogShow && (
          <ModalPortal>
            <CreateFolder
              parentPath={this.state.opNode.path}
              onAddFolder={this.onAddFolderNode}
              checkDuplicatedName={this.checkDuplicatedName}
              addFolderCancel={this.onAddFolderToggle}
            />
          </ModalPortal>
        )}
        {this.state.isAddFileDialogShow && (
          <ModalPortal>
            <CreateFile
              parentPath={this.state.opNode.path}
              onAddFile={this.onAddFileNode}
              checkDuplicatedName={this.checkDuplicatedName}
              addFileCancel={this.onAddFileToggle}
            />
          </ModalPortal>
        )}
        {this.state.isRenameDialogShow && (
          <ModalPortal>
            <Rename
              currentNode={this.state.opNode}
              onRename={this.onRenameNode}
              checkDuplicatedName={this.checkDuplicatedName}
              toggleCancel={this.onRenameToggle}
            />
          </ModalPortal>
        )}
        {this.state.isDeleteDialogShow && (
          <ModalPortal>
            <Delete
              currentNode={this.state.opNode}
              handleSubmit={this.onDeleteNode}
              toggleCancel={this.onDeleteToggle}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

DirColumnNav.defaultProps={
  navRate: 0.25
};

DirColumnNav.propTypes = propTypes;

export default DirColumnNav;
