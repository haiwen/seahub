import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import { slug, repoID, serviceUrl, initialFilePath } from './components/constance';
import editorUtilities from './utils/editor-utilties';
import SidePanel from './pages/wiki/side-panel';
import MainPanel from './pages/wiki/main-panel';
import Node from './components/tree-view/node'
import Tree from './components/tree-view/tree'
import 'seafile-ui';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/side-panel.css';
import './css/wiki.css';
import './css/search.css';

class Wiki extends Component {
  constructor(props) {
    super(props);
    this.state = {
      content: '',
      tree_data: new Tree(),
      closeSideBar: false,
      filePath: '',
      latestContributor: '',
      lastModified: '',
      permission: '',
      isFileLoading: false,
      changedNode: null,
      isViewFileState: true
    };
    window.onpopstate = this.onpopstate;
  }

  componentDidMount() {
    this.initWikiData(initialFilePath);
  }

  initWikiData(filePath){
    this.setState({isFileLoading: true});
    editorUtilities.getFiles().then((files) => {
      // construct the tree object
      var treeData = new Tree();
      treeData.parseListToTree(files);

      let node = treeData.getNodeByPath(filePath);
      if (node.isDir()) {
        this.exitViewFileState(treeData, node);
        this.setState({isFileLoading: false});
      } else {
        editorUtilities.getWikiFileContent(slug, filePath).then(res => {
          this.setState({
            tree_data: treeData,
            content: res.data.content,
            latestContributor: res.data.latest_contributor,
            lastModified: moment.unix(res.data.last_modified).fromNow(),
            permission: res.data.permission,
            filePath: filePath,
            isFileLoading: false
          })
        });
        const hash = window.location.hash;
        let fileUrl = serviceUrl + '/wikis/' + slug + filePath + hash;
        window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
      }
    }, () => {
      console.log("failed to load files");
      this.setState({
        isLoadFailed: true
      })
    })
  }

  initMainPanelData(filePath) {
    this.setState({isFileLoading: true});
    editorUtilities.getWikiFileContent(slug, filePath)
      .then(res => {
        this.setState({
          content: res.data.content,
          latestContributor: res.data.latest_contributor,
          lastModified: moment.unix(res.data.last_modified).fromNow(),
          permission: res.data.permission,
          filePath: filePath,
          isFileLoading: false
        })
      })

     const hash = window.location.hash;
     let fileUrl = serviceUrl + '/wikis/' + slug + filePath + hash;
     window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
  }

  onLinkClick = (event) => {
    const url = event.target.href;
    if (this.isInternalMarkdownLink(url)) {
      let path = this.getPathFromInternalMarkdownLink(url);
      this.initMainPanelData(path);
    } else {
      window.location.href = url;
    }
  }

  onpopstate = (event) => {
    if (event.state && event.state.filePath) {
      this.initMainPanelData(event.state.filePath);
    }
  }
  
  onSearchedClick = (path) => {
    if (this.state.currentFilePath !== path) {
      this.initMainPanelData(path); 

      let tree = this.state.tree_data.clone();
      let node = tree.getNodeByPath(path);
      tree.setNodeToActivated(node);

      let path = node.path; //node is file
      this.enterViewFileState(tree, node, path);
    }
  }

  onMainNavBarClick = (nodePath) => {
    let tree = this.state.tree_data.clone();
    let node = tree.getNodeByPath(nodePath);
    tree.setNodeToActivated(node);

    this.exitViewFileState(tree, node);

    // update location url
    let fileUrl = serviceUrl + '/wikis/' + slug + node.path;
    window.history.pushState({urlPath: fileUrl, filePath: node.path},node.path, fileUrl);
  }

  onMainNodeClick = (node) => {
    let tree = this.state.tree_data.clone();
    tree.setNodeToActivated(node);
    if (node.isMarkdown()) {
      this.initMainPanelData(node.path);
      this.enterViewFileState(tree, node, node.path);
    } else if (node.isDir()){
      this.exitViewFileState(tree, node);
    } else {
      const w=window.open('about:blank');
      const url = serviceUrl + '/lib/' + repoID + '/file' + node.path;
      w.location.href = url;
    }
  }

  onNodeClick = (e, node) => {
    if (node instanceof Node && node.isMarkdown()){
      let tree = this.state.tree_data.clone();
      this.initMainPanelData(node.path);
      this.enterViewFileState(tree, node, node.path);
    } else if(node instanceof Node && node.isDir()){
      let tree = this.state.tree_data.clone();
      this.exitViewFileState(tree, node);
    } else {
      const w=window.open('about:blank');
      const url = serviceUrl + '/lib/' + repoID + '/file' + node.path;
      w.location.href = url;
    }
  }

  onDirCollapse = (e, node) => {
    let tree = this.state.tree_data.clone();
    let findNode = tree.getNodeByPath(node.path);
    findNode.isExpanded = !findNode.isExpanded;
    this.setState({tree_data: tree});
  }

  onMenuClick = () => {
    this.setState({
      closeSideBar: !this.state.closeSideBar,
    })
  }

  onCloseSide = () => {
    this.setState({
      closeSideBar: !this.state.closeSideBar,
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
      if (this.state.isViewFileState) {
        tree.setNodeToActivated(node);
        this.setState({
          tree_data: tree,
          changedNode: node
        })
      } else {
        this.exitViewFileState(tree, parentNode);
      }
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
      if (this.state.isViewFileState) {
        tree.setNodeToActivated(node);
        this.setState({
          tree_data: tree,
          changedNode: node
        })
      } else {
        this.exitViewFileState(tree, parentNode);
      }
    })
  }

  onRenameNode = (node, newName) => {
    let tree = this.state.tree_data.clone();
    let filePath = node.path;
    if (node.isMarkdown()) {
      editorUtilities.renameFile(filePath, newName).then(res => {
        let date = new Date().getTime()/1000;
        tree.updateNodeParam(node, "name", newName);
        node.name = newName;
        tree.updateNodeParam(node, "last_update_time", moment.unix(date).fromNow());

        node.last_update_time = moment.unix(date).fromNow();
        if (this.state.isViewFileState) {
          if (this.isModifyCurrentFile(node)) {
            tree.setNodeToActivated(node);
            this.setState({
              tree_data: tree,
              changedNode: node
            });
            this.initMainPanelData(node.path);
          } else {
            this.setState({tree_data: tree});
          }
        } else {
          this.setState({tree_data: tree});
        }
      })
    } else if (node.isDir()) {
      editorUtilities.renameDir(filePath, newName).then(res => {

        let currentFilePath = this.state.filePath;// the sequence is must right
        let currentFileNode = tree.getNodeByPath(currentFilePath);
        let isPathEqual = (node.path === currentFilePath);
        let date = new Date().getTime()/1000;
        tree.updateNodeParam(node, "name", newName);
        node.name = newName;  // just synchronization node data && tree data;
        tree.updateNodeParam(node, "last_update_time", moment.unix(date).fromNow());
        node.last_update_time = moment.unix(date).fromNow();

        if (this.state.isViewFileState) {
          if (this.isModifyContainsCurrentFile(node)) {
            tree.setNodeToActivated(currentFileNode);
            this.setState({
              tree_data: tree,
              changedNode: currentFileNode
            });
            this.initMainPanelData(currentFileNode.path);
          } else {
            this.setState({tree_data: tree});
          }
        } else {
          if (isPathEqual || node.path.indexOf(currentFilePath) > -1) {
            tree.setNodeToActivated(currentFileNode);
            this.exitViewFileState(tree, currentFileNode);
          } else {
            this.setState({tree_data: tree});
          }
        }
      })
    }
  }

  onDeleteNode = (node) => {
    let filePath = node.path;
    if (node.isMarkdown()) {
      editorUtilities.deleteFile(filePath);
    } else if (node.isDir()) {
      editorUtilities.deleteDir(filePath);
    } else {
      return false;
    }

    let isCurrentFile = false;
    if (node.isDir()) {
      isCurrentFile = this.isModifyContainsCurrentFile(node); 
    } else {
      isCurrentFile = this.isModifyCurrentFile(node);
    }

    let tree = this.state.tree_data.clone();
    
    if (this.state.isViewFileState) {
      if (isCurrentFile) {
        let homeNode = this.getHomeNode(tree);
        tree.setNodeToActivated(homeNode);
        this.setState({
          tree_data: tree,
          changedNode: homeNode
        })
        this.initMainPanelData(homeNode.path);
      } else {
        this.setState({tree_data: tree})
      }
    } else {
      let parentNode = tree.getNodeByPath(this.state.filePath);
      let isChild = tree.isNodeChild(parentNode, node);
      if (isChild) {
        this.exitViewFileState(tree, parentNode);
      } else {
        this.setState({tree_data: tree});
      }
    }
    tree.deleteNode(node);
  }

  
  enterViewFileState(newTree, newNode, newPath) {
    this.setState({
      tree_data: newTree,
      changedNode: newNode,
      filePath: newPath,
      isViewFileState: true
    });
  }
  
  exitViewFileState(newTree, newNode) {
    this.setState({
      tree_data: newTree,
      changedNode: newNode,
      filePath: newNode.path,
      isViewFileState: false
    });
    let fileUrl = serviceUrl + '/wikis/' + slug + newNode.path;
    window.history.pushState({urlPath: fileUrl, filePath: newNode.path}, newNode.path, fileUrl);
  }

  getFileNameByPath(path) {
    let index = path.lastIndexOf("/");
    if (index === -1) {
      return "";
    }
    return path.slice(index+1);
  }

  getHomeNode(treeData) {
    return treeData.getNodeByPath("/home.md");
  }

  buildNewNode(name, type) {
    let date = new Date().getTime()/1000;
    let node = new Node({
        name : name,
        type: type, 
        size: '0',
        last_update_time: moment.unix(date).fromNow(),
        isExpanded: false, 
        children: []
    });
    return node;
  }

  isModifyCurrentFile(node) {
    let nodeName = node.name;
    let fileName = this.getFileNameByPath(this.state.filePath);
    return nodeName === fileName;
  }

  isModifyContainsCurrentFile(node) {
    let filePath = this.state.filePath;
    let nodePath = node.path;
    
    if (filePath.indexOf(nodePath) > -1) {
      return true;
    }
    return false;
  }

  isMarkdownFile(filePath) {
    let index = filePath.lastIndexOf(".");
    if (index === -1) {
      return false;
    } else {
      let type = filePath.substring(index).toLowerCase();
      if (type === ".md" || type === ".markdown") {
        return true;
      } else {
        return false;
      }
    }
  }

  isInternalMarkdownLink(url) {
    var re = new RegExp(serviceUrl + '/lib/' + repoID + '/file' + '.*\.md$');
    return re.test(url);
  }

  getPathFromInternalMarkdownLink(url) {
    var re = new RegExp(serviceUrl + '/lib/' + repoID + '/file' + "(.*\.md)");
    var array = re.exec(url);
    var path = decodeURIComponent(array[1]);
    return path;
  }

  render() {
    return (
      <div id="main" className="wiki-main">
        <SidePanel
          onNodeClick={this.onNodeClick}
          closeSideBar={this.state.closeSideBar}
          onCloseSide ={this.onCloseSide}
          treeData={this.state.tree_data}
          permission={this.state.permission}
          currentFilePath={this.state.filePath}
          changedNode={this.state.changedNode}
          onAddFolderNode={this.onAddFolderNode}
          onAddFileNode={this.onAddFileNode}
          onRenameNode={this.onRenameNode}
          onDeleteNode={this.onDeleteNode}
          onDirCollapse={this.onDirCollapse}
        />
        <MainPanel
          content={this.state.content}
          filePath={this.state.filePath}
          latestContributor={this.state.latestContributor}
          lastModified={this.state.lastModified}
          permission={this.state.permission}
          isViewFileState={this.state.isViewFileState}
          changedNode={this.state.changedNode}
          isFileLoading={this.state.isFileLoading}
          onLinkClick={this.onLinkClick}
          onMenuClick={this.onMenuClick}
          onSearchedClick={this.onSearchedClick}
          onMainNavBarClick={this.onMainNavBarClick}
          onMainNodeClick={this.onMainNodeClick}
        />
      </div>
    )
  }
}

ReactDOM.render (
  <Wiki />,
  document.getElementById('wrapper')
)
