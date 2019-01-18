import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import TreeView from '../../components/tree-view/tree-view';
import NodeMenu from '../../components/tree-view/node-menu';
import Logo from '../../components/logo';
import ModalPortal from '../../components/modal-portal';
import Delete from '../../components/dialog/delete-dialog';
import Rename from '../../components/dialog/rename-dialog';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';

const propTypes = {
  currentNode: PropTypes.object,
  treeData: PropTypes.object.isRequired,
  currentPath: PropTypes.string.isRequired,
  closeSideBar: PropTypes.bool.isRequired,
  onCloseSide: PropTypes.func.isRequired,
  onDirCollapse: PropTypes.func.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onDeleteNode: PropTypes.func.isRequired,
  onAddFileNode: PropTypes.func.isRequired,
  onAddFolderNode: PropTypes.func.isRequired,
};

class SidePanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      currentNode: null,
      isNodeItemFrezee: false,
      isShowMenu: false,
      menuPosition: {
        left: 0,
        top: 0
      },
      isLoadFailed: false,
      isMenuIconShow: false,
      isHeaderMenuShow: false,
      isDeleteDialogShow: false,
      isAddFileDialogShow: false,
      isAddFolderDialogShow: false,
      isRenameDialogShow: false,
    };
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
    this.setState({currentNode: node});
    this.props.onNodeClick(node);
  }

  onShowContextMenu = (e, node) => {
    let left = e.clientX - 8*16;
    let top  = e.clientY + 10;
    let position = Object.assign({},this.state.menuPosition, {left: left, top: top});
    this.setState({
      isShowMenu: !this.state.isShowMenu,
      currentNode: node,
      menuPosition: position,
      isNodeItemFrezee: true
    });
  }

  onHideContextMenu = () => {
    if (!this.state.isShowMenu) {
      return;
    }
    this.setState({
      isShowMenu: false,
      isNodeItemFrezee: false
    });
  }

  onAddFileToggle = () => {
    this.setState({
      isMenuIconShow: false,
      isAddFileDialogShow: !this.state.isAddFileDialogShow
    });
    this.onHideContextMenu();
  }

  onAddFolderToggle = () => {
    this.setState({
      isMenuIconShow: false,
      isAddFolderDialogShow: !this.state.isAddFolderDialogShow
    });
    this.onHideContextMenu();
  }

  onRenameToggle = () => {
    this.setState({isRenameDialogShow: !this.state.isRenameDialogShow});
    this.onHideContextMenu();
  }

  onDeleteToggle = () => {
    this.setState({isDeleteDialogShow: !this.state.isDeleteDialogShow});
    this.onHideContextMenu();
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
    let node = this.state.currentNode;
    this.props.onRenameNode(node, newName);
  }

  onDeleteNode = () => {
    this.setState({isDeleteDialogShow: !this.state.isDeleteDialogShow});
    let node = this.state.currentNode;
    this.props.onDeleteNode(node);
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideContextMenu);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({currentNode: nextProps.currentNode});
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideContextMenu);
  }

  addFolderCancel = () => {
    this.setState({isAddFolderDialogShow: !this.state.isAddFolderDialogShow});
  }

  addFileCancel = () => {
    this.setState({isAddFileDialogShow: !this.state.isAddFileDialogShow});
  }

  deleteCancel = () => {
    this.setState({isDeleteDialogShow: !this.state.isDeleteDialogShow});
  }

  renameCancel = () => {
    this.setState({isRenameDialogShow: !this.state.isRenameDialogShow});
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
              {this.state.isMenuIconShow && (
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
                    <DropdownItem onClick={this.onAddFolderToggle}>{gettext('New Folder')}</DropdownItem>
                    <DropdownItem onClick={this.onAddFileToggle}>{gettext('New File')}</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              )}
            </div>
          </h3>
          <div className="wiki-pages-container">
            {this.props.treeData && (
              <TreeView
                treeData={this.props.treeData}
                currentPath={this.props.currentPath}
                isNodeItemFrezee={this.state.isNodeItemFrezee}
                onShowContextMenu={this.onShowContextMenu}
                onNodeClick={this.onNodeClick}
                onDirCollapse={this.props.onDirCollapse}
              />
            )}
            {this.state.isShowMenu && (
              <NodeMenu
                menuPosition={this.state.menuPosition}
                currentNode={this.state.currentNode}
                toggleAddFile={this.onAddFileToggle}
                toggleAddFolder={this.onAddFolderToggle}
                toggleRename={this.onRenameToggle}
                toggleDelete={this.onDeleteToggle}
              />
            )}
          </div>
        </div>
        {this.state.isDeleteDialogShow && (
          <ModalPortal>
            <Delete
              currentNode={this.state.currentNode}
              handleSubmit={this.onDeleteNode}
              toggleCancel={this.deleteCancel}
            />
          </ModalPortal>
        )}
        {this.state.isAddFileDialogShow && (
          <ModalPortal>
            <CreateFile
              fileType={'.md'}
              parentPath={this.state.currentNode.path}
              onAddFile={this.onAddFileNode}
              addFileCancel={this.addFileCancel}
            />
          </ModalPortal>
        )}
        {this.state.isAddFolderDialogShow && (
          <ModalPortal>
            <CreateFolder
              parentPath={this.state.currentNode.path}
              onAddFolder={this.onAddFolderNode}
              addFolderCancel={this.addFolderCancel}
            />
          </ModalPortal>
        )}
        {this.state.isRenameDialogShow && (
          <ModalPortal>
            <Rename
              currentNode={this.state.currentNode}
              onRename={this.onRenameNode}
              toggleCancel={this.renameCancel}
            />
          </ModalPortal>
        )}
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
