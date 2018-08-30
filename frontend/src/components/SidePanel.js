import React, { Component } from 'react';
import TreeView from './tree-view/tree-view';
import { siteRoot, logoPath, mediaUrl, siteTitle, logoWidth, logoHeight } from './constance';
import Tree from './tree-view/tree';
import { Node } from './tree-view/node'
import NodeMenu from './menu-component/node-menu';
import MenuControl from './menu-component/node-menu-control';
const gettext = window.gettext;

class SidePanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      tree_data: new Tree(),
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
    this.setState({
      currentNode: node
    })
    this.props.onFileClick(e, node)
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
    let node = this.state.tree_data.root;
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
    this.setState({
      isShowMenu: false,
      isNodeItemFrezee: false
    })
  }

  onAddFolderNode = (dirPath) => {
    this.props.editorUtilities.createDir(dirPath).then(res => {
      let tree = this.state.tree_data.copy();
      let index = dirPath.lastIndexOf("/");
      let name = dirPath.substring(index+1);
      let parentPath = dirPath.substring(0, index);
      if (!parentPath) {
        parentPath = "/";
      }
      let node = new Node({name : name, type: "dir", isExpanded: false, children: []});
      let parentNode = tree.getNodeByPath(parentPath);
      tree.addChildToNode(parentNode, node);
      tree.setOneNodeToActived({node});
      this.setState({
        tree_data: tree
      })

    })
  }

  onAddFileNode = (filePath) => {
    this.props.editorUtilities.createFile(filePath).then(res => {
      let tree = this.state.tree_data.copy();
      let index = filePath.lastIndexOf("/");
      let name = filePath.substring(index+1);
      let parentPath = filePath.substring(0, index);
      if (!parentPath) {
        parentPath = "/";
      }
      let node = new Node({name : name, type: "file", isExpanded: false, children: []});
      let parentNode = tree.getNodeByPath(parentPath);
      tree.addChildToNode(parentNode, node);
      tree.setOneNodeToActived({node});
      this.setState({
        tree_data: tree
      })
    })
  }

  onRenameNode = (newName) => {
    let tree = this.state.tree_data.copy();
    let node = this.state.currentNode;
    let type = node.type;
    let filePath = node.path;
    if (type === 'file') {
      this.props.editorUtilities.renameFile(filePath, newName).then(res => {
        if (this.isModifyCurrentFile()) {
          node.name = newName;  //repair current node
          tree.updateNodeParamValue(node, "name", newName);
          this.props.onFileClick(null, node);
          tree.setOneNodeToActived(node);
          this.setState({tree_data: tree});
        } else {
          tree.updateNodeParamValue(node, "name", newName);
          this.setState({tree_data: tree});
        }
      })
    }

    if (type === 'dir') {
      this.props.editorUtilities.renameDir(filePath, newName).then(res => {
        let tree = this.state.tree_data.copy();
        let node = this.state.currentNode;
        if (this.isModifyContainsCurrentFile()) {
          let nodePath = encodeURI(node.path);
          let pathname = window.location.pathname;
          let start =  pathname.indexOf(nodePath);
          let findNode = node.getNodeByPath(decodeURI(pathname.slice(start)));
          if(findNode){
            tree.updateNodeParamValue(node, "name", newName);

            this.props.onFileClick(null, findNode);
            tree.setOneNodeToActived(findNode);
            this.setState({tree_data: tree});
          }
        } else {
          tree.updateNodeParamValue(node, "name", newName);
          this.setState({tree_data: tree});
        }
      })
    }
  }

  onDeleteNode = () => {
    var currentNode = this.state.currentNode;
    let filePath = currentNode.path;
    let type = currentNode.type;
    if (type === 'file') {
      this.props.editorUtilities.deleteFile(filePath);
    } 

    if (type === 'dir') {
      this.props.editorUtilities.deleteDir(filePath);
    }

    let isCurrentFile = false;
    if (this.state.currentNode.type === "dir") {
      isCurrentFile = this.isModifyContainsCurrentFile(); 
    } else {
      isCurrentFile = this.isModifyCurrentFile();
    }

    let tree = this.state.tree_data.copy();
    tree.removeNodeFromTree(currentNode);

    if (isCurrentFile) {
      let homeNode = this.getHomeNode();
      this.props.onFileClick(null, homeNode);
      tree.setNoneNodeActived();
      this.setState({tree_data: tree})
    } else {
      this.setState({tree_data: tree})
    }
  }

  changeActivedNode(node) {
    let tree = this.state.tree_data.copy();
    tree.setOneNodeToActived(node);
    this.setState({
      tree_data: tree
    })
  }

  isModifyCurrentFile() {
    let name = this.state.currentNode.name;
    let pathname = window.location.pathname;
    let currentName = pathname.slice(pathname.lastIndexOf("/") + 1);
    return encodeURI(name) === currentName;
  }

  isModifyContainsCurrentFile() {
    let pathname = window.location.pathname;
    let nodePath = this.state.currentNode.path;
    
    if (pathname.indexOf(encodeURI(nodePath)) > -1) {
      return true;
    }
    return false;
  }

  initializeTreeData() {
    this.props.editorUtilities.getFiles().then((files) => {
      // construct the tree object
      var rootObj = {
        name: '/',
        type: 'dir',
        isExpanded: true
      }
      var treeData = new Tree();
      treeData.parseFromList(rootObj, files);
      let homeNode = this.getHomeNode(treeData);
      this.setState({
        tree_data: treeData,
        currentNode: homeNode
      })
    }, () => {
      console.log("failed to load files");
      this.setState({
        isLoadFailed: true
      })
    })
  }

  getHomeNode(treeData) {
    let root = null;
    if (treeData) {
      root = treeData.root;
    } else {
      root = this.state.tree_data.root;
    }
    let homeNode = root.getNodeByPath(decodeURI("/home.md"));
    return homeNode;
  }

  componentDidMount() {
    //init treeview data
    this.initializeTreeData();

    document.addEventListener('click', this.onHideContextMenu);
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
            {this.state.tree_data && 
            <TreeView
              permission={this.props.permission}
              treeData={this.state.tree_data}
              currentNode={this.state.currentNode}
              isNodeItemFrezee={this.state.isNodeItemFrezee}
              onNodeClick={this.onNodeClick}
              onShowContextMenu={this.onShowContextMenu}
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
