import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import cookie from 'react-cookies';
import { gettext, repoID, serviceUrl, initialFilePath } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import editorUtilities from './utils/editor-utilties';
import SidePanel from './pages/repo-wiki-mode/side-panel';
import MainPanel from './pages/repo-wiki-mode/main-panel';
import Node from './components/tree-view/node';
import Tree from './components/tree-view/tree';
import Toast from './components/toast';
import 'seafile-ui';
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
      isViewFileState: true
    };
    window.onpopstate = this.onpopstate;
  }

  componentDidMount() {
    this.initWikiData(initialFilePath);
  }

  initWikiData(filePath){
    this.setState({isFileLoading: true});
    editorUtilities.listRepoDir().then((files) => {
      // construct the tree object
      var treeData = new Tree();
      treeData.parseListToTree(files);

      let node = treeData.getNodeByPath(filePath);
      treeData.expandNode(node);
      if (node.isDir()) {
        this.exitViewFileState(treeData, node);
        this.setState({isFileLoading: false});
      } else {
        this.setState({tree_data: treeData});
        this.initMainPanelData(filePath);
      }
    }, () => {
      /* eslint-disable */
      console.log('failed to load files');
      /* eslint-enable */
      this.setState({
        isLoadFailed: true
      });
    });
  }

  initMainPanelData(filePath) {
    this.setState({isFileLoading: true});

    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      let { mtime, permission, last_modifier_name } = res.data;

      this.setState({
        latestContributor: last_modifier_name,
        lastModified: moment.unix(mtime).fromNow(),
        permission: permission,
        filePath: filePath,
      });

      seafileAPI.getFileDownloadLink(repoID, filePath).then((res) => {
        const downLoadUrl = res.data;
        seafileAPI.getFileContent(downLoadUrl).then((res) => {
          this.setState({
            content: res.data,
            isFileLoading: false
          });
        });
      });
    });

    let fileUrl = serviceUrl + '/wiki/lib/' + repoID + filePath;
    window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
  }

  switchViewMode = (mode) => {
    let dirPath;
    let tree = this.state.tree_data;
    let node = tree.getNodeByPath(this.state.filePath);
    if (node.isDir()) {
      dirPath = this.state.filePath;
    } else {
      const index = this.state.filePath.lastIndexOf('/');
      dirPath = this.state.filePath.substring(0, index);
    }

    cookie.save('view_mode', mode, { path: '/' });

    window.location.href = serviceUrl + '/#common/lib/' + repoID + dirPath;
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
      let path = event.state.filePath;
      if (this.isMarkdownFile(path)) {
        this.initMainPanelData(path);
      } else {
        let changedNode = this.state.tree_data.getNodeByPath(path);
        this.exitViewFileState(this.state.tree_data, changedNode);
      }

    }
  }
  
  onSearchedClick = (item) => {
    let path = item.path;
    if (this.state.currentFilePath !== path) {
      this.initMainPanelData(path); 

      let tree = this.state.tree_data.clone();
      let node = tree.getNodeByPath(path);
      tree.expandNode(node);
      this.enterViewFileState(tree, node, node.path);
    }
  }

  onMainNavBarClick = (nodePath) => {
    let tree = this.state.tree_data.clone();
    let node = tree.getNodeByPath(nodePath);
    tree.expandNode(node);

    this.exitViewFileState(tree, node);

    // update location url
    let fileUrl = serviceUrl + '/wiki/lib/' + repoID + node.path;
    window.history.pushState({urlPath: fileUrl, filePath: node.path},node.path, fileUrl);
  }

  onMainItemClick = (direntPath) => {
    let tree = this.state.tree_data.clone();
    let node = tree.getNodeByPath(direntPath);
    let parentNode = tree.findNodeParentFromTree(node);
    tree.expandNode(parentNode);
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

  onMainItemDelete = (direntPath) => {
    let node = this.state.tree_data.getNodeByPath(direntPath);
    this.onDeleteNode(node);
  }
  
  onMainItemRename = (direntPath, newName) => {
    let node = this.state.tree_data.getNodeByPath(direntPath);
    this.onRenameNode(node, newName);
  }

  onMainItemMove = (repo, direntPath, moveToDirentPath) => {
    let index   = direntPath.lastIndexOf('/');
    let dirPath = direntPath.slice(0, index + 1);
    let dirName = direntPath.slice(index + 1); 
    seafileAPI.moveDir(repoID, repo.repo_id, moveToDirentPath, dirPath, dirName).then(() => {
      let tree = this.state.tree_data.clone();
      let moveNode = tree.getNodeByPath(direntPath);
      let moveNodeParent = tree.findNodeParentFromTree(moveNode);
      if (repoID === repo.repo_id) {
        let moveToNode = tree.getNodeByPath(moveToDirentPath);
        tree.addNodeToParent(moveNode, moveToNode);
      }
      tree.removeNodeFromParent(moveNode, moveNodeParent);

      this.exitViewFileState(tree, moveNodeParent);
      Toast.success(gettext('Move file succeeded./Move folder succeeded.'));
    }).catch(() => {
      Toast.error(gettext('Move file failed./Move folder failed.'));
    });
  }

  onMainItemCopy = (repo, direntPath, copyToDirentPath) => {
    let index   = direntPath.lastIndexOf('/');
    let dirPath = direntPath.slice(0, index + 1);
    let dirName = direntPath.slice(index + 1); 
    seafileAPI.copyDir(repoID, repo.repo_id, copyToDirentPath, dirPath, dirName).then(() => {
      if (repoID === repo.repo_id) {
        let tree = this.state.tree_data.clone();
        let copyNode = tree.getNodeByPath(direntPath);
        let copyToNode = tree.getNodeByPath(copyToDirentPath);
        tree.addNodeToParent(copyNode, copyToNode);
        this.exitViewFileState(tree, this.state.changedNode);
      }
      
      Toast.success(gettext('Copy file succeeded./Copy folder succeeded.'));
    }).catch(() => {
      Toast.error(gettext('Copy file failed./Copy folder failed.'));
    });
  }

  onNodeClick = (e, node) => {
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

  onAddFileNode = (filePath, isDraft) => {
    editorUtilities.createFile(filePath, isDraft).then(res => {
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
      editorUtilities.deleteDir(filePath).then(() => {
        this.deleteNode(node);
      });
    } else {
      editorUtilities.deleteFile(filePath).then(() => {
        this.deleteNode(node);
      });
    }
  }

  deleteNode = (node) => {
    let tree = this.state.tree_data.clone();

    let isCurrentFile = false;
    if (node.isDir()) {
      isCurrentFile = this.isModifyContainsCurrentFile(node); 
    } else {
      isCurrentFile = this.isModifyCurrentFile(node);
    }

    if (this.state.isViewFileState) {
      tree.deleteNode(node);

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

      tree.deleteNode(node);
      if (isChild) {
        this.exitViewFileState(tree, parentNode);
      } else {
        this.setState({tree_data: tree});
      }
    }
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
    let fileUrl = serviceUrl + '/wiki/lib/' + repoID + newNode.path;
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
    var re = new RegExp(serviceUrl + '/lib/' + repoID + '/file' + '.*\.md$');
    return re.test(url);
  }

  isInternalDirLink(url) {
    var re = new RegExp(serviceUrl + '/#[a-z\-]*?/lib/' + repoID + '/.*');
    return re.test(url);
  }

  getPathFromInternalMarkdownLink(url) {
    var re = new RegExp(serviceUrl + '/lib/' + repoID + '/file' + '(.*\.md)');
    var array = re.exec(url);
    var path = decodeURIComponent(array[1]);
    return path;
  }

  getPathFromInternalDirLink(url) {
    var re = new RegExp(serviceUrl + '/#[a-z\-]*?/lib/' + repoID + '(/.*)');
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
          switchViewMode={this.switchViewMode}
          onLinkClick={this.onLinkClick}
          onMenuClick={this.onMenuClick}
          onSearchedClick={this.onSearchedClick}
          onMainNavBarClick={this.onMainNavBarClick}
          onMainItemClick={this.onMainItemClick}
          onMainItemDelete={this.onMainItemDelete}
          onMainItemRename={this.onMainItemRename}
          onMainItemMove={this.onMainItemMove}
          onMainItemCopy={this.onMainItemCopy}
          onMainAddFile={this.onAddFileNode}
          onMainAddFolder={this.onAddFolderNode}
        />
      </div>
    );
  }
}

ReactDOM.render (
  <Wiki />,
  document.getElementById('wrapper')
);
