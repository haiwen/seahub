import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, permission } from '../../utils/constants';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import TreeView from '../../components/tree-view/tree-view';
import Logo from '../../components/logo';
import Loading from '../../components/loading';
import ModalPortal from '../../components/modal-portal';
import Delete from '../../components/dialog/delete-dialog';
import Rename from '../../components/dialog/rename-dialog';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';

const propTypes = {
  currentNode: PropTypes.object,
  isTreeDataLoading: PropTypes.bool.isRequired,
  treeData: PropTypes.object.isRequired,
  currentPath: PropTypes.string.isRequired,
  closeSideBar: PropTypes.bool.isRequired,
  onCloseSide: PropTypes.func.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onDeleteNode: PropTypes.func.isRequired,
  onAddFileNode: PropTypes.func.isRequired,
  onAddFolderNode: PropTypes.func.isRequired,
};

class SidePanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      opNode: null,
      isLoadFailed: false,
      isMenuIconShow: false,
      isHeaderMenuShow: false,
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

  onMouseEnter = () => {
    this.setState({isMenuIconShow: true});
  }

  onMouseLeave = () => {
    this.setState({isMenuIconShow: false});
  }

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    this.toggleOperationMenu();
  }

  toggleOperationMenu = () => {
    this.setState({isHeaderMenuShow: !this.state.isHeaderMenuShow});
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
    return (
      <div className={`side-panel wiki-side-panel ${this.props.closeSideBar ? '': 'left-zero'}`}>
        <div className="side-panel-top panel-top">
          <Logo onCloseSidePanel={this.props.onCloseSide} />
        </div>
        <div id="side-nav" className="wiki-side-nav" role="navigation">
          <h3 className="wiki-pages-heading" onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
            {gettext('Files')}
            <div className="heading-icon">
              {(permission && this.state.isMenuIconShow) && (
                <Dropdown isOpen={this.state.isHeaderMenuShow} toggle={this.toggleOperationMenu}>
                  <DropdownToggle
                    tag="i"
                    className="fas fa-ellipsis-v"
                    title={gettext('More Operations')}
                    data-toggle="dropdown"
                    aria-expanded={this.state.isHeaderMenuShow}
                    onClick={this.onDropdownToggleClick}
                  />
                  <DropdownMenu right>
                    <DropdownItem onClick={this.onAddFolderToggle.bind(this, 'root')}>{gettext('New Folder')}</DropdownItem>
                    <DropdownItem onClick={this.onAddFileToggle.bind(this, 'root')}>{gettext('New File')}</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              )}
            </div>
          </h3>
          <div className="wiki-pages-container">
            {this.props.isTreeDataLoading ?
              (<Loading/>) :
              (<TreeView
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
              fileType={'.md'}
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
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
