import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, siteRoot, repoID } from '../../utils/constants';
import Logo from '../../components/logo';
import TreeView from '../../components/tree-view/tree-view';
import NodeMenu from '../../components/tree-view/node-menu';
import Delete from '../../components/dialog/delete-dialog';
import Rename from '../../components/dialog/rename-dialog';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';
import IndexContentViewer from '../../components/index-viewer';

const propTypes = {
  changedNode: PropTypes.object,
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
  onLinkClick: PropTypes.func,
  hasIndex: PropTypes.bool.isRequired,
  indexContent: PropTypes.string,
  indexPath: PropTypes.string,
  indexPermission: PropTypes.string,
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

  componentDidMount() {
    document.addEventListener('click', this.onHideContextMenu);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({currentNode: nextProps.changedNode});
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideContextMenu);
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

  onNodeClick = (e, node) => {
    this.setState({currentNode: node});
    this.props.onNodeClick(e, node);
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

  onAddFolderToggle = () => {
    this.setState({isAddFolderDialogShow: !this.state.isAddFolderDialogShow});
    this.onHideContextMenu();
  }

  onAddFileToggle = () => {
    this.setState({isAddFileDialogShow: !this.state.isAddFileDialogShow});
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
  
  onAddFileNode = (filePath) => {
    this.setState({isAddFileDialogShow: !this.state.isAddFileDialogShow});
    this.props.onAddFileNode(filePath);
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

  onEditClick = (e) => {
    e.preventDefault();
    window.location.href= siteRoot + 'lib/' + repoID + '/file' + this.props.indexPath + '?mode=edit';
  }

  onContentRendered = () => {
    // todo
  }

  renderIndexView = () => {
    return (
      <Fragment>
        <h3 className="wiki-pages-heading">
          {gettext('Contents')}
          {this.props.indexPermission === 'rw' && 
            <button className="btn btn-secondary operation-item index-edit" title="Edit Index" onClick={this.onEditClick}>{gettext('Edit')}</button>
          }
        </h3>
        <div className="wiki-pages-container">
          <IndexContentViewer
            onLinkClick={this.props.onLinkClick}
            onContentRendered={this.onContentRendered}
            indexContent={this.props.indexContent}
          />
        </div>
      </Fragment>
    );
  }

  renderTreeView = () => {
    return (
      <Fragment>
        <h3 className="wiki-pages-heading" onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          {gettext('Pages')}
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
              currentPath={this.props.currentPath}
              treeData={this.props.treeData}
              currentNode={this.state.currentNode}
              isNodeItemFrezee={this.state.isNodeItemFrezee}
              onNodeClick={this.onNodeClick}
              onShowContextMenu={this.onShowContextMenu}
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
          {this.state.isDeleteDialogShow && (
            <Delete 
              currentNode={this.state.currentNode}
              handleSubmit={this.onDeleteNode}
              toggleCancel={this.deleteCancel}
            />
          )}
          {this.state.isAddFileDialogShow && (
            <CreateFile
              fileType={'.md'}
              parentPath={this.state.currentNode.path}
              onAddFile={this.onAddFileNode}
              addFileCancel={this.addFileCancel}
            />
          )}
          {this.state.isAddFolderDialogShow && (
            <CreateFolder 
              parentPath={this.state.currentNode.path}
              onAddFolder={this.onAddFolderNode}
              addFolderCancel={this.addFolderCancel}
            />
          )}
          {this.state.isRenameDialogShow && (
            <Rename 
              currentNode={this.state.currentNode}
              onRename={this.onRenameNode} 
              toggleCancel={this.renameCancel} 
            />
          )}
        </div>
      </Fragment>
    )
  }

  render() {
    return (
      <div className={`side-panel wiki-side-panel ${this.props.closeSideBar ? '': 'left-zero'}`}>
        <div className="side-panel-top panel-top">
          <Logo onCloseSidePanel={this.props.onCloseSide} />
        </div>
        <div id="side-nav" className="wiki-side-nav" role="navigation">
          {this.props.hasIndex ? this.renderIndexView() : this.renderTreeView()}}
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
