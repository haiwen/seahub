import React, { Component } from 'react';
import TreeView from '../../components/tree-view/tree-view';
import { siteRoot, logoPath, mediaUrl, siteTitle, logoWidth, logoHeight } from '../../components/constance';
import NodeMenu from '../../components/menu-component/node-menu';
import MenuControl from '../../components/menu-component/node-menu-control';

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
      isMenuIconShow: false
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

  onAddFolderNode = (dirPath) => {
    this.props.onAddFolderNode(dirPath);
  }

  onAddFileNode = (filePath) => {
    this.props.onAddFileNode(filePath);
  }
  
  onRenameNode = (newName) => {
    let node = this.state.currentNode;
    this.props.onRenameNode(node, newName)
  }
  
  onDeleteNode = () => {
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
            <NodeMenu 
              isShowMenu={this.state.isShowMenu}
              menuPosition={this.state.menuPosition}
              currentNode={this.state.currentNode}
              onHideContextMenu={this.onHideContextMenu}
              onDeleteNode={this.onDeleteNode}
              onAddFileNode={this.onAddFileNode}
              onAddFolderNode={this.onAddFolderNode}
              onRenameNode={this.onRenameNode}
            />
          </div>
        </div>
      </div>
    )
  }
}
export default SidePanel;
