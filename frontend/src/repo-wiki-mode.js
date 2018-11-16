import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import cookie from 'react-cookies';
import { gettext, repoID, serviceUrl, initialPath, isDir } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import SidePanel from './pages/repo-wiki-mode/side-panel';
import MainPanel from './pages/repo-wiki-mode/main-panel';
import Node from './components/tree-view/node';
import Tree from './components/tree-view/tree';
import Toast from './components/toast';
import Dirent from './models/dirent';
import FileTag from './models/file-tag';
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
      filePath: '',
      treeData: new Tree(),
      closeSideBar: false,
      currentNode: null,
      isDirentListLoading: true,
      isViewFile: false,
      direntList: [],
      isFileLoading: true,
      content: '',
      lastModified: '',
      latestContributor: '',
      permission: '',
      pathNotExist: true,
    };
    window.onpopstate = this.onpopstate;
  }

  componentDidMount() {
    if (isDir === 'None') {
      this.setState({pathNotExist: false});
    } else if (isDir === 'True') {
      this.showDir(initialPath);
    } else if (isDir === 'False') {
      this.showFile(initialPath);
    }

    this.loadSidePanel(initialPath);
  }

  createFileItem = (filePath, isDraft) => {
    //todo validate;
    seafileAPI.createFile(repoID, filePath, isDraft).then(res => {

      let index = filePath.lastIndexOf('/');
      let name = filePath.slice(index + 1);
      let parentPath = filePath.slice(0, index) === '' ? '/' : filePath.slice(0, index);

      this.addNodeToTree(name, parentPath, 'file');
      if (parentPath === this.state.filePath && !this.state.isViewFile) {
        this.addDirent(name, 'file');
      }
    }).catch(() => {
      //todo;
    });
  }
  
  createDirItem = (dirPath) => {
    //validate task
    seafileAPI.createDir(repoID, dirPath).then(() => {
      let index = dirPath.lastIndexOf('/');
      let name = dirPath.slice(index + 1);
      let parentPath = dirPath.slice(0, index) === '' ? '/' : dirPath.slice(0, index);

      this.addNodeToTree(name, parentPath, 'dir');
      if (parentPath === this.state.filePath && !this.state.isViewFile) {
        this.addDirent(name, 'dir');
      }
    }).catch(() => {
      //return error message
    });
  }

  renameItem = (nodeOrPath, newName) => {
    //validate task
    let renameNode = nodeOrPath;
    if ((typeof nodeOrPath) !== 'object') {
      renameNode = this.state.treeData.getNodeByPath(nodeOrPath); 
    }
    if (renameNode.isDir()) {
      seafileAPI.renameDir(repoID, renameNode.path, newName).then(() => {
        let direntPath = renameNode.path;
        let oldName = renameNode.name;
        this.renameTreeNode(renameNode, newName);
        this.renameDirent(direntPath, oldName, newName);
      }).catch(() => {
        //todos;
      });
    } else {
      seafileAPI.renameFile(repoID, renameNode.path, newName).then(() => {
        let direntPath = renameNode.path;
        let oldName = renameNode.name;
        this.renameTreeNode(renameNode, newName);
        this.renameDirent(direntPath, oldName, newName);
      }).catch(() => {
        //todos;
      });
    }
  }

  deleteItem = (nodeOrPath) => {
    let deleteNode = nodeOrPath;
    if ((typeof nodeOrPath) !== 'object') {
      deleteNode = this.state.treeData.getNodeByPath(nodeOrPath); 
    }
    if (deleteNode.isDir()) {
      seafileAPI.deleteDir(repoID, deleteNode.path).then(() => {
        let direntPath = deleteNode.path;
        let name = deleteNode.name;
        this.deleteTreeNode(deleteNode);
        this.deleteDirent(direntPath, name);
      }).catch(() => {
        //todos;
      });
    } else {
      seafileAPI.deleteFile(repoID, deleteNode.path).then(() => {
        let direntPath = deleteNode.path;
        let name = deleteNode.name;
        this.deleteTreeNode(deleteNode);
        this.deleteDirent(direntPath, name);
      }).catch(() => {
        //todos;
      });
    }
  }

  onMoveItem = (repo, direntPath, moveToDirentPath) => {
    //just for view list state
    let index   = direntPath.lastIndexOf('/');
    let dirPath = direntPath.slice(0, index + 1);
    let dirName = direntPath.slice(index + 1); 
    seafileAPI.moveDir(repoID, repo.repo_id,moveToDirentPath, dirPath, dirName).then(() => {
      
      this.moveTreeNode(direntPath, moveToDirentPath, repo);
      this.moveDirent(direntPath);
      
      let message = gettext('Successfully moved %(name)s.');
      message = message.replace('%(name)s', dirName);
      Toast.success(message);
    }).catch(() => {
      let message = gettext('Failed to move %(name)s');
      message = message.replace('%(name)s', dirName);
      Toast.error(message);
    });
  }
  
  onCopyItem = (repo, direntPath, copyToDirentPath) => {
    //just for view list state
    let index   = direntPath.lastIndexOf('/');
    let dirPath = direntPath.slice(0, index + 1);
    let dirName = direntPath.slice(index + 1); 
    seafileAPI.moveDir(repoID, repo.repo_id, copyToDirentPath, dirPath, dirName).then(() => {
      this.copyTreeNode(direntPath, copyToDirentPath, repo);
      let message = gettext('Successfully copied %(name)s.');
      message = message.replace('%(name)s', dirName);
      Toast.success(message);
    }).catch(() => {
      let message = gettext('Failed to copy %(name)s');
      message = message.replace('%(name)s', dirName);
      Toast.error(message);
    });
  }

  switchViewMode = (mode) => {
    let dirPath;
    let tree = this.state.treeData;
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

  loadSidePanel = (filePath) => {
    seafileAPI.listDir(repoID, '/',{recursive: true}).then(items => {
      const files = items.data.map(item => {
        return {
          name: item.name,
          type: item.type === 'dir' ? 'dir' : 'file',
          isExpanded: item.type === 'dir' ? true : false,
          parent_path: item.parent_dir,
          last_update_time: item.mtime,
          permission: item.permission,
          size: item.size
        };
      });

      var treeData = new Tree();
      treeData.parseListToTree(files);
  
      let node = treeData.getNodeByPath(filePath);
      if (node) {
        treeData.expandNode(node);
        this.setState({treeData: treeData, currentNode: node});
      } else {
        this.setState({treeData: treeData});
      }
    }).catch(() => {
      /* eslint-disable */
      console.log('failed to load files');
      /* eslint-enable */
      this.setState({isLoadFailed: true});
    });
  }

  showFile = (filePath) => {
    this.setState({
      filePath: filePath,
      isViewFile: true
    });

    this.setState({isFileLoading: true});
    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      let { mtime, permission, last_modifier_name } = res.data;
      seafileAPI.getFileDownloadLink(repoID, filePath).then((res) => {
        seafileAPI.getFileContent(res.data).then((res) => {
          this.setState({
            content: res.data,
            permission: permission,
            latestContributor: last_modifier_name,
            lastModified: moment.unix(mtime).fromNow(),
            isFileLoading: false,
          });
        });
      });
    });

    let fileUrl = serviceUrl + '/wiki/lib/' + repoID + filePath;
    window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
  }

  showDir = (filePath) => {
    this.loadDirentList(filePath); //update direntList;
    this.setState({
      filePath: filePath,
      isViewFile: false
    });

    // update location url
    let fileUrl = serviceUrl + '/wiki/lib/' + repoID + filePath;
    window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
  }

  loadDirentList = (filePath) => {
    this.setState({isDirentListLoading: true});
    seafileAPI.listDir(repoID, filePath).then(res => {
      let direntList = [];
      res.data.forEach(item => {
        let dirent = new Dirent(item);
        direntList.push(dirent);
      });
      this.setState({
        direntList: direntList,
        isDirentListLoading: false,
      });
    });
  }

  updateDirent = (dirent, paramKey, paramValue) => {
    let newDirentList = this.state.direntList.map(item => {
      if (item.name === dirent.name) {
        item[paramKey] = paramValue;
      }
      return item;
    });
    this.setState({direnList: newDirentList});
  }

  onLinkClick = (event) => {
    const url = event.target.href;
    if (this.isInternalMarkdownLink(url)) {
      let path = this.getPathFromInternalMarkdownLink(url);
      this.showFile(path);
    } else if (this.isInternalDirLink(url)) {
      let path = this.getPathFromInternalDirLink(url);
      this.showDir(path);
    } else {
      window.location.href = url;
    }
  }

  onpopstate = (event) => {
    if (event.state && event.state.filePath) {
      let path = event.state.filePath;
      if (this.isMarkdownFile(path)) {
        this.showFile(path);
      } else {
        let currentNode = this.state.treeData.getNodeByPath(path);
        this.showDir(currentNode.path);
      }
    }
  }
  
  onSearchedClick = (item) => {
    //just for file
    let path = item.path;
    if (this.state.currentFilePath !== path) {
      let tree = this.state.treeData.clone();
      let node = tree.getNodeByPath(path);
      tree.expandNode(node);
      this.showFile(node.path);
    }
  }

  onMainNavBarClick = (nodePath) => {
    //just for dir
    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(nodePath);
    tree.expandNode(node);

    this.setState({treeData: tree, currentNode: node});
    this.showDir(node.path);
  }

  onDirentClick = (direntPath) => {
    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(direntPath);
    let parentNode = tree.findNodeParentFromTree(node);
    tree.expandNode(parentNode);

    if (node.isMarkdown()) {
      this.setState({treeData: tree}); // tree
      this.showFile(direntPath);
    } else if (node.isDir()) {
      this.setState({treeData: tree, currentNode: node}); //tree
      this.showDir(node.path);
    } else {
      const w=window.open('about:blank');
      const url = serviceUrl + '/lib/' + repoID + '/file' + node.path;
      w.location.href = url;
    }
  }

  onMainCreateDir = (dirPath) => {
    this.createDirItem(dirPath);
  }

  onMainCreateFile = (filePath, isDraft) => {
    this.createFileItem(filePath, isDraft);
  }

  onRenameDirent = (direntPath, newName) => {
    this.renameItem(direntPath, newName);
  }

  onDeleteDirent = (direntPath) => {
    this.deleteItem(direntPath);
  }

  renameDirent = (direntPath, oldName, newName) => {
    let newPath = '';
    let parentPath = direntPath.slice(0, direntPath.lastIndexOf('/') + 1);
    if (direntPath === this.state.filePath) { //self
      newPath = parentPath + newName;
    } else if (direntPath.indexOf(this.state.filePath) > -1) { //child
      newPath = parentPath;
    } else if (this.state.filePath.indexOf(direntPath) > -1) { // ancestor
      newPath = parentPath + newName + this.state.filePath.replace(direntPath, '');
    }

    if (newPath && !this.state.isViewFile) {
      if (newPath === this.state.filePath) {
        let direntList = this.state.direntList.map(item => {
          if (item.name === oldName) {
            item.name = newName;
          }
          return item;
        });
        this.setState({direntList: direntList});
      } else {
        this.showDir(newPath);
      }
    } else if (newPath && this.state.isViewFile) {
      this.showFile(newPath);
    }
  }

  deleteDirent = (direntPath, direntName) => {
    let newPath = '';
    let parentPath = direntPath.slice(0, direntPath.lastIndexOf('/') + 1);
    if (parentPath === this.state.filePath) { //self
      newPath = parentPath;
    } else if (parentPath.indexOf(this.state.filePath) > -1) { // child
      newPath = this.state.filePath;
    } else if (this.state.filePath.indexOf(parentPath) > -1) { // ancestor
      newPath = parentPath;
    }

    if (newPath) {
      if (newPath === this.state.filePath) {
        //delete is child;
        let direntList = this.state.direntList.filter(item => {
          return item.name !== direntName;
        });
        this.setState({direntList: direntList, isViewFile: false});
      } else {
        //delete self or delete farther...;
        this.showDir(newPath);
      }
    }
  }

  addDirent = (name, type) => {
    let item = this.createDirent(name, type);
    let direntList = this.state.direntList;
    if (type === 'dir') {
      direntList.unshift(item);
    } else {
      direntList.push(item);
    }
    this.setState({direntList: direntList});
  }

  moveDirent = (filePath) => {
    let name = filePath.slice(filePath.lastIndexOf('/') + 1);
    let direntList = this.state.direntList.filter(item => {
      return item.name !== name;
    });
    this.setState({direntList: direntList});
  }

  onFileTagChanged = (dirent, direntPath) => {
    seafileAPI.listFileTags(repoID, direntPath).then(res => {
      let fileTags = res.data.file_tags.map(item => {
        return new FileTag(item);
      })
      this.updateDirent(dirent, 'file_tags', fileTags);
    })
  }

  onTreeNodeClick = (node) => {
    if (!this.state.pathNotExist) {
      this.setState({pathNotExist: true});
    }
    if (node instanceof Node && node.isMarkdown()) {
      let tree = this.state.treeData.clone();
      this.setState({treeData: tree});
      if (node.path !== this.state.filePath) {
        this.showFile(node.path);
      }
    } else if (node instanceof Node && node.isDir()) {
      let tree = this.state.treeData.clone();
      if (this.state.filePath === node.path) {
        if (node.isExpanded) {
          tree.collapseNode(node);
        } else {
          tree.expandNode(node);
        }
      }
      this.setState({treeData: tree});
      if (node.path !== this.state.filePath) {
        this.showDir(node.path);
      }
    } else {
      const w = window.open('about:blank');
      const url = serviceUrl + '/lib/' + repoID + '/file' + node.path;
      w.location.href = url;
    }
  }

  onTreeDirCollapse = (node) => {
    let tree = this.state.treeData.clone();
    let findNode = tree.getNodeByPath(node.path);
    findNode.isExpanded = !findNode.isExpanded;
    this.setState({treeData: tree});
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

  onSideCreateDir = (dirPath) => {
    this.createDirItem(dirPath);
  }

  onSideCreateFile = (filePath, isDraft) => {
    this.createFileItem(filePath, isDraft);
  }

  onDeleteTreeNode = (node) => {
    this.deleteItem(node);
  }

  onRenameTreeNode = (node, newName) => {
    this.renameItem(node, newName);
  }

  addNodeToTree = (name, parentPath, type) => {
    let tree = this.state.treeData.clone();

    let node = this.createTreeNode(name, type);
    let parentNode = tree.getNodeByPath(parentPath);

    tree.addNodeToParent(node, parentNode);
    this.setState({treeData: tree});
  }

  renameTreeNode = (node, newName) => {
    let tree = this.state.treeData.clone();
    tree.updateNodeParam(node, 'name', newName);
    this.setState({treeData: tree});
  }

  deleteTreeNode = (node) => {
    let tree = this.state.treeData.clone();
    tree.deleteNode(node);
    this.setState({treeData: tree});
  }

  moveTreeNode = (nodePath, moveToPath, moveToRepo) => {
    let tree = this.state.treeData.clone();

    if (repoID === moveToRepo.repo_id) {
      tree.moveNodeByPath(nodePath, moveToPath, true);
    } else {
      tree.deleteNodeByPath(nodePath);
    }

    this.setState({treeData: tree});
  }

  copyTreeNode = (nodePath, copyToPath) => {
    let tree = this.state.treeData.clone();
    tree.moveNodeByPath(nodePath, copyToPath, false);
    this.setState({treeData: tree});
  }

  createTreeNode(name, type) {
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

  createDirent(name, type) {
    let data = new Date().getTime()/1000;
    let dirent = null;
    if (type === 'dir') {
      dirent = new Dirent({
        id: '000000000000000000',
        name: name,
        type: type,
        mtime: data,
        permission: 'rw',
      });
    } else {
      dirent = new Dirent({
        id: '000000000000000000',
        name: name,
        type: type,
        mtime: data,
        permission: 'rw',
        size: 0,
        starred: false,
        is_locked: false,
        lock_time: '',
        lock_owner: null,
        locked_by_me: false,
        modifier_name: '',
        modifier_email: '',
        modifier_contact_email: '',
        file_tags: []
      });
    }
    return dirent;
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
          onNodeClick={this.onTreeNodeClick}
          onDirCollapse={this.onTreeDirCollapse}
          closeSideBar={this.state.closeSideBar}
          onCloseSide ={this.onCloseSide}
          treeData={this.state.treeData}
          currentFilePath={this.state.filePath}
          currentNode={this.state.currentNode}
          onAddFolderNode={this.onSideCreateDir}
          onAddFileNode={this.onSideCreateFile}
          onRenameNode={this.onRenameTreeNode}
          onDeleteNode={this.onDeleteTreeNode}
        />
        <MainPanel
          filePath={this.state.filePath}
          isViewFile={this.state.isViewFile}
          pathNotExist={this.state.pathNotExist}
          isDirentListLoading={this.state.isDirentListLoading}
          isFileLoading={this.state.isFileLoading}
          permission={this.state.permission}
          content={this.state.content}
          lastModified={this.state.lastModified}
          latestContributor={this.state.latestContributor}
          direntList={this.state.direntList}
          switchViewMode={this.switchViewMode}
          updateDirent={this.updateDirent}
          onLinkClick={this.onLinkClick}
          onMenuClick={this.onMenuClick}
          onSearchedClick={this.onSearchedClick}
          onMainNavBarClick={this.onMainNavBarClick}
          onItemClick={this.onDirentClick}
          onItemDelete={this.onDeleteDirent}
          onItemRename={this.onRenameDirent}
          onItemMove={this.onMoveItem}
          onItemCopy={this.onCopyItem}
          onAddFile={this.onMainCreateDir}
          onAddFolder={this.onMainCreateFile}
          onFileTagChanged={this.onFileTagChanged}
        />
      </div>
    );
  }
}

ReactDOM.render (
  <Wiki />,
  document.getElementById('wrapper')
);
