import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import SidePanel from './pages/wiki/side-panel';
import MainPanel from './pages/wiki/main-panel';
import moment from 'moment';
import { slug, repoID, siteRoot, initialPath } from './utils/constants';
import editorUtilities from './utils/editor-utilties';
import { Utils } from './utils/utils';
import Node from './components/tree-view/node';
import Tree from './components/tree-view/tree';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/layout.css';
import './css/side-panel.css';
import './css/wiki.css';
import './css/toolbar.css';
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
      isViewFileState: true,
      hasIndex: false,
      indexContent: '',
    };
    window.onpopstate = this.onpopstate;
  }

  componentDidMount() {
    this.initWikiData(initialPath);
  }

  getIndexContent = (files) => {
    files.some(file => {
      if (file.type === 'file' && file.name === 'index.md') {
        let filePath = Utils.joinPath(file.parent_path, file.name);
        editorUtilities.getWikiFileContent(slug, filePath).then((res) => {
          this.setState({
            hasIndex: true,
            indexContent: res.data.content,
          });
          return;
        });
      }
    });
  }

  initWikiData(filePath){
    this.setState({isFileLoading: true});
    editorUtilities.getFiles().then((files) => {
      // construct the tree object
      var treeData = new Tree();
      treeData.parseListToTree(files);

      let node = treeData.getNodeByPath(filePath);
      treeData.expandNode(node);
      if (node.isDir()) {
        this.exitViewFileState(treeData, node);
        this.setState({isFileLoading: false});
      } else {
        treeData.expandNode(node);
        editorUtilities.getWikiFileContent(slug, filePath).then(res => {
          this.setState({
            tree_data: treeData,
            content: res.data.content,
            latestContributor: res.data.latest_contributor,
            lastModified: moment.unix(res.data.last_modified).fromNow(),
            permission: res.data.permission,
            filePath: filePath,
            isFileLoading: false
          });
        });
        const hash = window.location.hash;
        let fileUrl = siteRoot + 'wikis/' + slug + filePath + hash;
        window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
      }
      this.getIndexContent(files);
    }, () => {
      this.setState({
        isLoadFailed: true
      });
    });
  }

  initMainPanelData(filePath){
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
        });
      });

    const hash = window.location.hash;
    let fileUrl = siteRoot + 'wikis/' + slug + filePath + hash;
    window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
  }

  onLinkClick = (event) => {
    const url = event.target.href;
    if (this.isInternalMarkdownLink(url)) {
      let path = this.getPathFromInternalMarkdownLink(url);
      this.initMainPanelData(path);
    } else if (this.isInternalDirLink(url)) {
      let path = this.getPathFromInternalDirLink(url);
      this.initWikiData(path);
    } else {
      window.location.href = url;
    }
  }

  onpopstate = (event) => {
    if (event.state && event.state.filePath) {
      this.initMainPanelData(event.state.filePath);
    }
  }
  
  onSearchedClick = (item) => {
    if (item.is_dir) {
      let path = item.path.slice(0, item.path.length - 1);
      if (this.state.filePath !== path) {
        let tree = this.state.tree_data.clone();
        let node = tree.getNodeByPath(path);
        tree.expandNode(node);
        this.exitViewFileState(tree, node);
      }
    } else if (Utils.isMarkdownFile(item.path)) {
      let path = item.path;
      if (this.state.filePath !== path) {
        this.initMainPanelData(path); 
  
        let tree = this.state.tree_data.clone();
        let node = tree.getNodeByPath(path);
        tree.expandNode(node);
        this.enterViewFileState(tree, node, node.path);
      }
    } else {
      let url = siteRoot + 'lib/' + item.repo_id + '/file' + Utils.encodePath(item.path);
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  }

  onMainNavBarClick = (nodePath) => {
    let tree = this.state.tree_data.clone();
    let node = tree.getNodeByPath(nodePath);
    tree.expandNode(node);

    this.exitViewFileState(tree, node);

    // update location url
    let fileUrl = siteRoot + 'wikis/' + slug + node.path;
    window.history.pushState({urlPath: fileUrl, filePath: node.path},node.path, fileUrl);
  }

  onMainNodeClick = (node) => {
    let tree = this.state.tree_data.clone();
    tree.expandNode(node);
    if (node.isMarkdown()) {
      this.initMainPanelData(node.path);
      this.enterViewFileState(tree, node, node.path);
    } else if (node.isDir()){
      this.exitViewFileState(tree, node);
    } else {
      const w=window.open('about:blank');
      const url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(node.path);
      w.location.href = url;
    }
  }

  onNodeClick = (node) => {
    if (node instanceof Node && node.isMarkdown()){
      let tree = this.state.tree_data.clone();
      this.initMainPanelData(node.path);
      this.enterViewFileState(tree, node, node.path);
    } else if(node instanceof Node && node.isDir()){
      let tree = this.state.tree_data.clone();
      if (this.state.filePath === node.path) {
        if (node.isExpanded) {
          tree.collapseNode(node);
        } else {
          tree.expandNode(node);
        }
      }
      this.exitViewFileState(tree, node);
    } else {
      const w=window.open('about:blank');
      const url = siteRoot + 'lib/' + repoID + '/file' + node.path;
      w.location.href = url;
    }
  }

  onDirCollapse = (node) => {
    let tree = this.state.tree_data.clone();
    let findNode = tree.getNodeByPath(node.path);
    findNode.isExpanded = !findNode.isExpanded;
    this.setState({tree_data: tree});
  }

  onMenuClick = () => {
    this.setState({
      closeSideBar: !this.state.closeSideBar,
    });
  }

  onCloseSide = () => {
    this.setState({
      closeSideBar: !this.state.closeSideBar,
    });
  }

  onAddFolderNode = (dirPath) => {
    editorUtilities.createDir(dirPath).then(res => {
      let tree = this.state.tree_data.clone();
      let name = this.getFileNameByPath(dirPath);
      let index = dirPath.lastIndexOf('/');
      let parentPath = dirPath.substring(0, index);
      if (!parentPath) {
        parentPath = '/';
      }
      let node = this.buildNewNode(name, 'dir');
      let parentNode = tree.getNodeByPath(parentPath);
      tree.addNodeToParent(node, parentNode);
      if (this.state.isViewFileState) {
        tree.expandNode(node);
        this.setState({
          tree_data: tree,
          changedNode: node
        });
      } else {
        this.exitViewFileState(tree, parentNode);
      }
    });
  }

  onAddFileNode = (filePath) => {
    editorUtilities.createFile(filePath).then(res => {
      let tree = this.state.tree_data.clone();
      let name = this.getFileNameByPath(filePath);
      let index = filePath.lastIndexOf('/');
      let parentPath = filePath.substring(0, index);
      if (!parentPath) {
        parentPath = '/';
      }
      let node = this.buildNewNode(name, 'file');
      let parentNode = tree.getNodeByPath(parentPath);
      tree.addNodeToParent(node, parentNode);
      if (this.state.isViewFileState) {
        tree.expandNode(node);
        this.setState({
          tree_data: tree,
          changedNode: node
        });
      } else {
        this.exitViewFileState(tree, parentNode);
      }
    });
  }

  onRenameNode = (node, newName) => {
    let tree = this.state.tree_data.clone();
    let filePath = node.path;
    if (node.isMarkdown()) {
      editorUtilities.renameFile(filePath, newName).then(res => {
        let cloneNode = node.clone();

        tree.updateNodeParam(node, 'name', newName);
        node.name = newName;
        let date = new Date().getTime()/1000;
        tree.updateNodeParam(node, 'last_update_time', moment.unix(date).fromNow());
        node.last_update_time = moment.unix(date).fromNow();

        if (this.state.isViewFileState) {
          if (this.isModifyCurrentFile(cloneNode)) {
            tree.expandNode(node);
            this.setState({
              tree_data: tree,
              changedNode: node
            });
            this.initMainPanelData(node.path);
          } else {
            this.setState({tree_data: tree});
          }
        } else {
          let parentNode = tree.findNodeParentFromTree(node);
          this.setState({
            tree_data: tree,
            changedNode: parentNode
          });
        }
      });
    } else if (node.isDir()) {
      editorUtilities.renameDir(filePath, newName).then(res => {

        let currentFilePath = this.state.filePath;
        let currentFileNode = tree.getNodeByPath(currentFilePath);
        let nodePath = node.path;

        tree.updateNodeParam(node, 'name', newName);
        node.name = newName;
        let date = new Date().getTime()/1000;
        tree.updateNodeParam(node, 'last_update_time', moment.unix(date).fromNow());
        node.last_update_time = moment.unix(date).fromNow();

        if (this.state.isViewFileState) {
          if (currentFilePath.indexOf(nodePath) > -1) {
            tree.expandNode(currentFileNode);
            this.setState({
              tree_data: tree,
              changedNode: currentFileNode
            });
            this.initMainPanelData(currentFileNode.path);
          } else {
            this.setState({tree_data: tree});
          }
        } else {
          if (nodePath === currentFilePath) { // old node
            tree.expandNode(node);
            this.exitViewFileState(tree, node);
          } else if (node.path.indexOf(currentFilePath) > -1) { // new node
            tree.expandNode(currentFileNode);
            this.exitViewFileState(tree, currentFileNode);
          } else {
            this.setState({tree_data: tree});
          }
        }
      });
    }
  }

  onDeleteNode = (node) => {
    let filePath = node.path;
    if (node.isDir()) {
      editorUtilities.deleteDir(filePath);
    } else {
      editorUtilities.deleteFile(filePath);
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
        tree.expandNode(homeNode);
        this.setState({
          tree_data: tree,
          changedNode: homeNode
        });
        this.initMainPanelData(homeNode.path);
      } else {
        this.setState({tree_data: tree});
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
    let fileUrl = siteRoot + 'wikis/' + slug + newNode.path;
    window.history.pushState({urlPath: fileUrl, filePath: newNode.path}, newNode.path, fileUrl);
  }

  getFileNameByPath(path) {
    let index = path.lastIndexOf('/');
    if (index === -1) {
      return '';
    }
    return path.slice(index+1);
  }

  getHomeNode(treeData) {
    return treeData.getNodeByPath('/home.md');
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
    let index = filePath.lastIndexOf('.');
    if (index === -1) {
      return false;
    } else {
      let type = filePath.substring(index).toLowerCase();
      if (type === '.md' || type === '.markdown') {
        return true;
      } else {
        return false;
      }
    }
  }

  isInternalMarkdownLink(url) {
    var re = new RegExp(siteRoot + 'lib/' + repoID + '/file' + '.*\.md$');
    return re.test(url);
  }

  isInternalDirLink(url) {
    var re = new RegExp(siteRoot + '#[a-z\-]*?/lib/' + repoID + '/.*');
    return re.test(url);
  }

  getPathFromInternalMarkdownLink(url) {
    var re = new RegExp(siteRoot + 'lib/' + repoID + '/file' + '(.*\.md)');
    var array = re.exec(url);
    var path = decodeURIComponent(array[1]);
    return path;
  }

  getPathFromInternalDirLink(url) {
    var re = new RegExp(siteRoot + '#[a-z\-]*?/lib/' + repoID + '(/.*)');
    var array = re.exec(url);
    var path = decodeURIComponent(array[1]);

    var dirPath = path.substring(1);
    re = new RegExp('(^/.*)');
    if (re.test(dirPath)) {
      path = dirPath;
    } else {
      path = '/' + dirPath;
    }

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
          currentPath={this.state.filePath}
          changedNode={this.state.changedNode}
          onAddFolderNode={this.onAddFolderNode}
          onAddFileNode={this.onAddFileNode}
          onRenameNode={this.onRenameNode}
          onDeleteNode={this.onDeleteNode}
          onDirCollapse={this.onDirCollapse}
          onLinkClick={this.onLinkClick}
          hasIndex={this.state.hasIndex}
          indexContent={this.state.indexContent}
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
          onDeleteNode={this.onDeleteNode}
          onRenameNode={this.onRenameNode}
        />
      </div>
    );
  }
}

ReactDOM.render (
  <Wiki />,
  document.getElementById('wrapper')
);
