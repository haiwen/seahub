import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import cookie from 'react-cookies';
import { gettext, repoID, serviceUrl, initialPath, isDir } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
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
      path: '',
      pathExist: true,
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
    };
    window.onpopstate = this.onpopstate;
  }

  componentDidMount() {
    if (isDir === 'None') {
      this.setState({pathExist: false});
    } else if (isDir === 'True') {
      this.showDir(initialPath);
    } else if (isDir === 'False') {
      this.showFile(initialPath);
    }

    this.loadSidePanel(initialPath);
  }


  deleteItemAjaxCallback(path, isDir) {
    let node = this.state.treeData.getNodeByPath(path);
    this.deleteTreeNode(node);
    this.deleteDirent(path);
  }

  deleteItem(path, isDir) {
    if (isDir) {
      seafileAPI.deleteDir(repoID, path).then(() => {
        this.deleteItemAjaxCallback(path, isDir);
      }).catch(() => {
        //todos;
      });
    } else {
      seafileAPI.deleteFile(repoID, path).then(() => {
        this.deleteItemAjaxCallback(path, isDir);
      }).catch(() => {
        //todos;
      });
    }
  }

  renameItemAjaxCallback(path, isDir, newName) {
    let node = this.state.treeData.getNodeByPath(path);
    this.renameTreeNode(node, newName);
    this.renameDirent(path, newName);
  }

  renameItem = (path, isDir, newName) => {
    //validate task
    if (isDir) {
      seafileAPI.renameDir(repoID, path, newName).then(() => {
        this.renameItemAjaxCallback(path, isDir, newName);
      }).catch(() => {
        //todos;
      });
    } else {
      seafileAPI.renameFile(repoID, path, newName).then(() => {
        this.renameItemAjaxCallback(path, isDir, newName);
      }).catch(() => {
        //todos;
      });
    }
  }

  onAddFile = (filePath, isDraft) => {
    //todo validate;
    seafileAPI.createFile(repoID, filePath, isDraft).then(res => {
      let name = Utils.getFileName(filePath);
      let parentPath = Utils.getDirName(filePath);

      this.addNodeToTree(name, parentPath, 'file');
      if (parentPath === this.state.path && !this.state.isViewFile) {
        this.addDirent(name, 'file');
      }
    }).catch(() => {
      //todo;
    });
  }

  onAddFolder = (dirPath) => {
    //validate task
    seafileAPI.createDir(repoID, dirPath).then(() => {
      let name = Utils.getFileName(dirPath);
      let parentPath = Utils.getDirName(dirPath);

      this.addNodeToTree(name, parentPath, 'dir');
      if (parentPath === this.state.path && !this.state.isViewFile) {
        this.addDirent(name, 'dir');
      }
    }).catch(() => {
      //return error message
    });
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
      path: filePath,
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
    window.history.pushState({url: fileUrl, path: filePath}, filePath, fileUrl);
  }

  showDir = (path) => {
    this.loadDirentList(path);
    this.setState({
      path: path,
      isViewFile: false
    });

    // update location url
    let url = serviceUrl + '/wiki/lib/' + repoID + path;
    window.history.pushState({ url: url, path: path}, path, url);
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
    if (event.state && event.state.path) {
      let path = event.state.path;
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

  onMainPanelItemRename = (dirent, newName) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    this.renameItem(path, dirent.isDir(), newName);
  }

  onMainPanelItemDelete = (dirent) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    this.deleteItem(path, dirent.isDir());
  }

  renameDirent = (direntPath, newName) => {
    let parentPath = Utils.getDirName(direntPath);
    let newDirentPath = Utils.joinPath(parentPath, newName);
    if (direntPath === this.state.path) {
      // the renamed item is current viewed item
      // example: direntPath = /A/B/C, state.path = /A/B/C
      this.setState({ path: newDirentPath });
    } else if (Utils.isChildPath(direntPath, this.state.path)) {
      // example: direntPath = /A/B/C/D, state.path = /A/B/C
      let oldName = Utils.getFileName(direntPath);
      let direntList = this.state.direntList.map(item => {
        if (item.name === oldName) {
          item.name = newName;
        }
        return item;
      });
      this.setState({ direntList: direntList });
    } else if (Utils.isAncestorPath(direntPath, this.state.path)) {
      // example: direntPath = /A/B, state.path = /A/B/C
      let newPath = Utils.renameAncestorPath(this.state.path, direntPath, newDirentPath);
      this.setState({ path: newPath });
    }
  }

  deleteDirent(direntPath) {
    let newPath = '';
    if (direntPath === this.state.path) {
      // The deleted item is current item
      let parentPath = Utils.getDirName(direntPath);
      this.showDir(parentPath);
    } else if (Utils.isChildPath(direntPath, this.state.path)) {
      // The deleted item is inside current path
      let name = Utils.getFileName(direntPath);
      let direntList = this.state.direntList.filter(item => {
        return item.name !== name;
      });
      this.setState({ direntList: direntList });
    } else if (Utils.isAncestorPath(direntPath, this.state.path)) {
      // the deleted item is ancester of the current item
      let parentPath = Utils.getDirName(direntPath);
      this.showDir(parentPath);
    }
    // else do nothing
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
    if (!this.state.pathExist) {
      this.setState({pathExist: true});
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

  onSideNavMenuClick = () => {
    this.setState({
      closeSideBar: !this.state.closeSideBar,
    });
  }

  onCloseSide = () => {
    this.setState({
      closeSideBar: !this.state.closeSideBar,
    });
  }

  onDeleteTreeNode = (node) => {
    this.deleteItem(node.path, node.isDir());
  }

  onRenameTreeNode = (node, newName) => {
    this.renameItem(node.path, node.isDir(), newName);
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
          currentPath={this.state.path}
          currentNode={this.state.currentNode}
          onAddFolderNode={this.onAddFolder}
          onAddFileNode={this.onAddFile}
          onRenameNode={this.onRenameTreeNode}
          onDeleteNode={this.onDeleteTreeNode}
        />
        <MainPanel
          path={this.state.path}
          isViewFile={this.state.isViewFile}
          pathExist={this.state.pathExist}
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
          onSideNavMenuClick={this.onSideNavMenuClick}
          onSearchedClick={this.onSearchedClick}
          onMainNavBarClick={this.onMainNavBarClick}
          onItemClick={this.onDirentClick}
          onItemDelete={this.onMainPanelItemDelete}
          onItemRename={this.onMainPanelItemRename}
          onItemMove={this.onMoveItem}
          onItemCopy={this.onCopyItem}
          onAddFile={this.onAddFile}
          onAddFolder={this.onAddFolder}
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
