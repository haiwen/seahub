import React, { Component } from 'react';
import TreeView from './tree-view/tree-view';
import { siteRoot, logoPath, mediaUrl, siteTitle, logoWidth, logoHeight } from './constance';
import editorUtilities from '../utils/editor-utilties';
import Tree from './tree-view/tree';
import Node from './tree-view/node'
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
    editorUtilities.createDir(dirPath).then(res => {
      let tree = this.state.tree_data.clone();
      let name = this.getFileNameByPath(dirPath);
      let index = dirPath.lastIndexOf("/");
      let parentPath = dirPath.substring(0, index);
      if (!parentPath) {
        parentPath = "/";
      }
      let node = this.buildNewNode(name, "dir");
      let parentNode = tree.getNodeByPath(parentPath);
      tree.addNodeToParent(node, parentNode);
      tree.setNodeToActivated(node);
      this.setState({
        tree_data: tree,
        currentNode: node
      })

    })
  }

  onAddFileNode = (filePath) => {
    editorUtilities.createFile(filePath).then(res => {
      let tree = this.state.tree_data.clone();
      let name = this.getFileNameByPath(filePath);
      let index = filePath.lastIndexOf("/");
      let parentPath = filePath.substring(0, index);
      if (!parentPath) {
        parentPath = "/";
      }
      let node = this.buildNewNode(name, "file");
      let parentNode = tree.getNodeByPath(parentPath);
      tree.addNodeToParent(node, parentNode);
      tree.setNodeToActivated(node);
      this.setState({
        tree_data: tree,
        currentNode: node
      })
    })
  }

  onRenameNode = (newName) => {
    let tree = this.state.tree_data.clone();
    let node = this.state.currentNode;
    let filePath = node.path;
    if (node.isMarkdown()) {
      editorUtilities.renameFile(filePath, newName).then(res => {
        if (this.isModifyCurrentFile()) {
          tree.updateNodeParam(node, "name", newName);
          tree.setNodeToActivated(node);
          this.setState({
            tree_data: tree,
            currentNode: node
          });
          node.name = newName;
          this.props.onFileClick(null, node);
        } else {
          tree.updateNodeParam(node, "name", newName);
          this.setState({tree_data: tree});
        }
      })
    } else if (node.isDir()) {
      editorUtilities.renameDir(filePath, newName).then(res => {
        let currentNode = this.state.currentNode;
        if (this.isModifyContainsCurrentFile()) {
          let filePath = this.props.currentFilePath;
          let currentFileNode = tree.getNodeByPath(filePath);
          tree.updateNodeParam(node, "name", newName);
          tree.setNodeToActivated(currentFileNode);
          this.setState({
            tree_data: tree,
            currentNode: currentFileNode
          });
          this.props.onFileClick(null, currentFileNode);
        } else {
          tree.updateNodeParam(currentNode, "name", newName);
          this.setState({tree_data: tree});
        }
      })
    }
  }

  onDeleteNode = () => {
    var currentNode = this.state.currentNode;
    let filePath = currentNode.path;
    if (currentNode.isMarkdown()) {
      editorUtilities.deleteFile(filePath);
    } else if (currentNode.isDir()) {
      editorUtilities.deleteDir(filePath);
    } else {
      return false;
    }

    let isCurrentFile = false;
    if (currentNode.isDir()) {
      isCurrentFile = this.isModifyContainsCurrentFile(); 
    } else {
      isCurrentFile = this.isModifyCurrentFile();
    }

    let tree = this.state.tree_data.clone();
    tree.deleteNode(currentNode);

    if (isCurrentFile) {
      this.props.onFileClick(null, homeNode);
      let homeNode = this.getHomeNode(tree);
      tree.setNodeToActivated(homeNode);
      this.setState({
        tree_data: tree,
        currentNode: homeNode
      })
    } else {
      this.setState({tree_data: tree})
    }
  }

  isModifyCurrentFile() {
    let nodeName = this.state.currentNode.name;
    let filePath = this.props.currentFilePath;
    let fileName = this.getFileNameByPath(filePath);
    return nodeName === fileName;
  }

  isModifyContainsCurrentFile() {
    let filePath = this.props.currentFilePath;
    let nodePath = this.state.currentNode.path;
    
    if (filePath.indexOf(nodePath) > -1) {
      return true;
    }
    return false;
  }

  initializeTreeData() {
    editorUtilities.getFiles().then((files) => {
      // construct the tree object
      var treeData = new Tree();
      treeData.parseListToTree(files);
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

  getFileNameByPath(path) {
    let index = path.lastIndexOf("/");
    return path.slice(index+1);
  }

  getHomeNode(treeData) {
    return treeData.getNodeByPath("/home.md");
  }

  buildNewNode(name, type) {
    let node = new Node({
      id: '',
        name : name,
        username: '',
        slug: '',
        permission: '',
        created_at: '',
        updated_at: '',
        type: type, 
        isExpanded: false, 
        children: []
    });
    return node;
  }

  componentDidMount() {
    //init treeview data
    this.initializeTreeData();
    document.addEventListener('click', this.onHideContextMenu);
  }

  componentWillReceiveProps(nextProps) {
    let path = nextProps.searchedPath; //handle search module
    if (path !== this.searchedPath) {
      let node = this.state.tree_data.getNodeByPath(path);
      this.searchedPath = path;
      this.props.onFileClick(null, node);
      let tree = this.state.tree_data.clone();
      tree.setNodeToActivated(node);
      this.setState({
        tree_data: tree
      })
    }
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
              currentFilePath={this.props.currentFilePath}
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
