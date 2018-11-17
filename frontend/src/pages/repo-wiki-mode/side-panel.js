import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot, logoPath, mediaUrl, siteTitle, logoWidth, logoHeight } from '../../utils/constants';
import TreeView from '../../components/tree-view/tree-view';
import NodeMenu from '../../components/tree-view/node-menu';
import MenuControl from '../../components/menu-control';
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
      showDelete: false,
      showFile: false,
      showFolder: false,
      showRename: false,
      isFile: false
    };
    this.searchedPath = null;
  }

  closeSide = () => {
    this.props.onCloseSide();
  }

  onMouseEnter = () => {
    this.setState({
      isMenuIconShow: true
    });
  }

  onMouseLeave = () => {
    this.setState({
      isMenuIconShow: false
    });
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

  onHeadingMenuClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let node = this.props.treeData.root;
    let left = e.clientX - 8*16;
    let top  = e.clientY + 10;
    let position = Object.assign({},this.state.menuPosition, {left: left, top: top});
    this.setState({
      isShowMenu: !this.state.isShowMenu,
      currentNode: node,
      menuPosition: position
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

  toggleAddFile = () => {
    this.setState({showFile: !this.state.showFile});
    this.onHideContextMenu();
  }

  toggleAddFolder = () => {
    this.setState({showFolder: !this.state.showFolder});
    this.onHideContextMenu();
  }

  toggleRename = () => {
    this.setState({showRename: !this.state.showRename});
    this.onHideContextMenu();
  }

  toggleDelete = () => {
    this.setState({showDelete: !this.state.showDelete});
    this.onHideContextMenu();
  }

  onAddFolderNode = (dirPath) => {
    this.setState({showFolder: !this.state.showFolder});
    this.props.onAddFolderNode(dirPath);
  }

  onAddFileNode = (filePath, isDraft) => {
    this.setState({showFile: !this.state.showFile});
    this.props.onAddFileNode(filePath, isDraft);
  }

  onRenameNode = (newName) => {
    this.setState({showRename: !this.state.showRename});
    let node = this.state.currentNode;
    this.props.onRenameNode(node, newName);
  }

  onDeleteNode = () => {
    this.setState({showDelete: !this.state.showDelete});
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
    this.setState({showFolder: !this.state.showFolder});
  }

  addFileCancel = () => {
    this.setState({showFile: !this.state.showFile});
  }

  deleteCancel = () => {
    this.setState({showDelete: !this.state.showDelete});
  }

  renameCancel = () => {
    this.setState({showRename: !this.state.showRename});
  }

  render() {
    return (
      <div className={`side-panel wiki-side-panel ${this.props.closeSideBar ? '': 'left-zero'}`}>
        <div className="side-panel-top panel-top">
          <a href={siteRoot} id="logo">
            <img src={mediaUrl + logoPath} title={siteTitle} alt="logo" width={logoWidth} height={logoHeight} />
          </a>
          <a title="Close" aria-label="Close" onClick={this.closeSide} className="sf2-icon-x1 sf-popover-close side-panel-close op-icon d-md-none "></a>
        </div>
        <div id="side-nav" className="wiki-side-nav" role="navigation">
          <h3
            className="wiki-pages-heading"
            onMouseEnter={this.onMouseEnter}
            onMouseLeave={this.onMouseLeave}
          >
            {gettext('Files')}
            <div className="heading-icon">
              <MenuControl
                isShow={this.state.isMenuIconShow}
                onClick={this.onHeadingMenuClick}
              />
            </div>
          </h3>
          <div className="wiki-pages-container">
            {this.props.treeData &&
            <TreeView
              currentPath={this.props.currentPath}
              treeData={this.props.treeData}
              currentNode={this.state.currentNode}
              isNodeItemFrezee={this.state.isNodeItemFrezee}
              onNodeClick={this.onNodeClick}
              onShowContextMenu={this.onShowContextMenu}
              onDirCollapse={this.props.onDirCollapse}
            />
            }
            {this.state.isShowMenu &&
            <NodeMenu
              menuPosition={this.state.menuPosition}
              currentNode={this.state.currentNode}
              toggleAddFile={this.toggleAddFile}
              toggleAddFolder={this.toggleAddFolder}
              toggleRename={this.toggleRename}
              toggleDelete={this.toggleDelete}
            />
            }
            {this.state.showDelete &&
            <Delete
              currentNode={this.state.currentNode}
              handleSubmit={this.onDeleteNode}
              toggleCancel={this.deleteCancel}
            />
            }
            {this.state.showFile &&
            <CreateFile
              fileType={'.md'}
              parentPath={this.state.currentNode.path}
              onAddFile={this.onAddFileNode}
              addFileCancel={this.addFileCancel}
            />
            }
            {this.state.showFolder &&
            <CreateFolder
              parentPath={this.state.currentNode.path}
              onAddFolder={this.onAddFolderNode}
              addFolderCancel={this.addFolderCancel}
            />
            }
            {this.state.showRename &&
            <Rename
              currentNode={this.state.currentNode}
              onRename={this.onRenameNode}
              toggleCancel={this.renameCancel}
            />
            }
          </div>
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
