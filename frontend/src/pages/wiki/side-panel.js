import React, { Component } from 'react';
import TreeView from '../../components/tree-view/tree-view';
import { siteRoot, logoPath, mediaUrl, siteTitle, logoWidth, logoHeight } from '../../components/constance';
import NodeMenu from '../../components/menu-component/node-menu';
import MenuControl from '../../components/menu-component/node-menu-control';
import Delete from '../../components/menu-component/menu-dialog/delete-dialog';
import Rename from '../../components/menu-component/menu-dialog/rename-dialog';
import CreateFlieFolder from '../../components/menu-component/menu-dialog/create-fileforder-dialog';

const gettext = window.gettext;

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
      showAddFileFolder: false,
      showRename: false,
      isFile: false
    }
    this.searchedPath = null;
  }

  closeSide = () => {
    this.props.onCloseSide();
  }

  onMouseEnter = () => {
    this.setState({
      isMenuIconShow: true
    })
  }

  onMouseLeave = () => {
    this.setState({
      isMenuIconShow: false
    })
  }

  onNodeClick = (e, node) => {
    this.setState({currentNode: node})
    this.props.onNodeClick(e, node)
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
    })
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
    })
  }

  onHideContextMenu = () => {
    if (!this.state.isShowMenu) {
      return;
    }
    this.setState({
      isShowMenu: false,
      isNodeItemFrezee: false
    })
  }

  toggleAddFileFolder = (flag) => {
    let isFile = flag === true ? true : false;
    this.setState({
      showAddFileFolder: !this.state.showAddFileFolder,
      isFile: isFile
    });
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
    this.setState({showAddFileFolder: !this.state.showAddFileFolder});
    this.props.onAddFolderNode(dirPath);
  }
  
  onAddFileNode = (filePath) => {
    this.setState({showAddFileFolder: !this.state.showAddFileFolder});
    this.props.onAddFileNode(filePath);
  }
  
  onRenameNode = (newName) => {
    this.setState({showRename: !this.state.showRename})
    let node = this.state.currentNode;
    this.props.onRenameNode(node, newName)
  }
  
  onDeleteNode = () => {
    this.setState({showDelete: !this.state.showDelete})
    let node = this.state.currentNode;
    this.props.onDeleteNode(node);
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideContextMenu);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      currentNode: nextProps.changedNode
    })
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideContextMenu);
  }

  addFolderCancel = () => {
    this.setState({showAddFileFolder: !this.state.showAddFileFolder});
  }

  addFileCancel = () => {
    this.setState({showAddFileFolder: !this.state.showAddFileFolder});
  }

  deleteCancel = () => {
    this.setState({showDelete: !this.state.showDelete})
  }

  renameCancel = () => {
    this.setState({showRename: !this.state.showRename})
  }

  render() {
    return (
      <div className={`wiki-side-panel ${this.props.closeSideBar ? "": "left-zero"}`}>
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
            {gettext("Pages")}
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
              currentFilePath={this.props.currentFilePath}
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
              toggleAddFileFolder={this.toggleAddFileFolder}
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
            {this.state.showAddFileFolder && 
            <CreateFlieFolder 
              isFile={this.state.isFile}
              currentNode={this.state.currentNode}
              onAddFolder={this.onAddFolderNode}
              addFolderCancel={this.addFolderCancel}
              onAddFile={this.onAddFileNode}
              addFileCancel={this.addFileCancel}
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
    )
  }
}
export default SidePanel;
