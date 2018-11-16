import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import cookie from 'react-cookies';
import { gettext, repoID, serviceUrl, initialPath, isDir } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import editorUtilities from './utils/editor-utilties';
import SidePanel from './pages/repo-wiki-mode/side-panel';
import MainPanel from './pages/repo-wiki-mode/main-panel';
import Node from './components/tree-view/node';
import Tree from './components/tree-view/tree';
import Toast from './components/toast';
import Dirent from './models/dirent';
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
      tree_data: new Tree(),
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
      isInitalPathExist: true,
    };
    window.onpopstate = this.onpopstate;
  }

  componentDidMount() {
    if (isDir === 'None') {
      this.setState({isInitalPathExist: false});
    } else if (isDir === 'True') {
      this.showDir(initialPath);
    } else if (isDir === 'False') {
      this.showFile(initialPath);
    }

    this.loadSidePanel(initialPath);
  }

  onNewFile = (filePath, isDraft) => {
    //todos validate;
    seafileAPI.createFile(repoID, filePath, isDraft).then(res => {
      //todos; get create name; is repetition;
      let isCurrentPath = this.onAddTreeNode(filePath, 'file'); // is add to currentNode;
      if (isCurrentPath && !this.state.isViewFile) {
        this.onDirentAdd(filePath, 'file');
        // this.showDir(this.state.filePath);
      }
    }).catch(() => {
      //todos message
    });
  }
  
  onNewDir = (dirPath) => {
    //validate task
    seafileAPI.createDir(repoID, dirPath).then(() => {
      let isCurrentPath = this.onAddTreeNode(dirPath, 'dir');
      if (isCurrentPath && !this.state.isViewFile) {
        this.onDirentAdd(dirPath, 'dir');
        // this.showDir(this.state.filePath);
      }
    }).catch(() => {
      //return error message
    });
  }

  onRename = (nodeOrPath, newName) => {
    //validate task
    let renameNode = nodeOrPath;
    if ((typeof nodeOrPath) !== 'object') {
      renameNode = this.state.tree_data.getNodeByPath(nodeOrPath); 
    }
    if (renameNode.isDir()) {
      seafileAPI.renameDir(repoID, renameNode.path, newName).then(() => {
        let newPath = this.onRenameTreeNode(renameNode, newName);
        this.onDirentRename(newPath, renameNode, newName)

      }).catch(() => {
        //todos;
      });
    } else {
      seafileAPI.renameFile(repoID, renameNode.path, newName).then(() => {
        let newPath = this.onRenameTreeNode(renameNode, newName);
        this.onDirentRename(newPath, renameNode, newName)
      }).catch(() => {
        //todos;
      });
    }
  }

  onDelete = (nodeOrPath) => {
    let deleteNode = nodeOrPath;
    if ((typeof nodeOrPath) !== 'object') {
      deleteNode = this.state.tree_data.getNodeByPath(nodeOrPath); 
    }
    if (deleteNode.isDir()) {
      seafileAPI.deleteDir(repoID, deleteNode.path).then(() => {
        let newPath = this.onDeleteTreeNode(deleteNode); //update tree data;
        this.onDirentDelete(newPath, deleteNode);
      }).catch(() => {
        //todos;
      });
    } else {
      seafileAPI.deleteFile(repoID, deleteNode.path).then(() => {
        let newPath = this.onDeleteTreeNode(deleteNode);
        this.onDirentDelete(newPath, deleteNode);
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
      
      this.onMoveNode(direntPath, moveToDirentPath, repo);
      this.onDirentMove(direntPath);
      
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
      this.onCopyNode(direntPath, copyToDirentPath, repo);
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

  loadSidePanel = (filePath) => {
    editorUtilities.listRepoDir().then((files) => {
      var treeData = new Tree();
      treeData.parseListToTree(files);

      let node = treeData.getNodeByPath(filePath);
      if (node) {
        treeData.expandNode(node);
        this.setState({tree_data: treeData, currentNode: node});
      } else {
        this.setState({tree_data: treeData});
      }

    }, () => {
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
    this.updateMainPanelDirentList(filePath); //update direntList;
    this.setState({
      filePath: filePath,
      isViewFile: false
    });

    // update location url
    let fileUrl = serviceUrl + '/wiki/lib/' + repoID + filePath;
    window.history.pushState({urlPath: fileUrl, filePath: filePath}, filePath, fileUrl);
  }

  updateMainPanelDirentList = (filePath) => {
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
        let currentNode = this.state.tree_data.getNodeByPath(path);
        this.showDir(currentNode.path);
      }
    }
  }
  
  onSearchedClick = (item) => {
    //just for file
    let path = item.path;
    if (this.state.currentFilePath !== path) {
      let tree = this.state.tree_data.clone();
      let node = tree.getNodeByPath(path);
      tree.expandNode(node);
      this.showFile(node.path);
    }
  }

  onMainNavBarClick = (nodePath) => {
    //just for dir
    let tree = this.state.tree_data.clone();
    let node = tree.getNodeByPath(nodePath);
    tree.expandNode(node);

    this.setState({tree_data: tree, currentNode: node});
    this.showDir(node.path);
  }

  onDirentClick = (direntPath) => {
    let tree = this.state.tree_data.clone();
    let node = tree.getNodeByPath(direntPath);
    let parentNode = tree.findNodeParentFromTree(node);
    tree.expandNode(parentNode);

    if (node.isMarkdown()) {
      this.setState({tree_data: tree}); // tree
      this.showFile(direntPath);
    } else if (node.isDir()){
      this.setState({tree_data: tree, currentNode: node}); //tree
      this.showDir(node.path);
    } else {
      const w=window.open('about:blank');
      const url = serviceUrl + '/lib/' + repoID + '/file' + node.path;
      w.location.href = url;
    }
  }

  onDirentRename = (newPath, renameNode, newName) => {
    if (newPath && !this.state.isViewFile) {
      if (newPath === this.state.filePath) {
        let direntList = this.state.direntList.map(item => {
          if (item.name === renameNode.name) {
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

  onDirentDelete = (newPath, deleteNode) => {
    if (newPath) {
      if (newPath === this.state.filePath) {
        //delete is child;
        let direntList = this.state.direntList.filter(item => {
          return item.name !== deleteNode.name;
        });
        this.setState({direntList: direntList, isViewFile: false});
      } else {
        //delete self or delete farther...;
        this.showDir(newPath);
      }
    }
  }

  onDirentAdd = (filePath, type) => {
    let name = filePath.slice(filePath.lastIndexOf('/') + 1);
    let item = this.buildNewDirent(name, type);
    let direntList = this.state.direntList;
    if (type === 'dir') {
      direntList.unshift(item);
    } else {
      direntList.push(item);
    }
    this.setState({direntList: direntList});
  }

  onDirentMove = (filePath) => {
    let name = filePath.slice(filePath.lastIndexOf('/') + 1);
    let direntList = this.state.direntList.filter(item => {
      return item.name !== name;
    });
    this.setState({direntList: direntList});
  }

  onFileTagChanged = (dirent, direntPath) => {
    seafileAPI.listFileTags(repoID, direntPath).then(res => {
      this.updateDirent(dirent, 'file_tags', res.data.file_tags);
    })
  }

  onTreeNodeClick = (node) => {
    if (!this.state.isInitalPathExist) {
      this.setState({isInitalPathExist: true});
    }
    if (node instanceof Node && node.isMarkdown()){
      let tree = this.state.tree_data.clone();
      this.setState({tree_data: tree});
      if (node.path !== this.state.filePath) {
        this.showFile(node.path);
      }
    } else if(node instanceof Node && node.isDir()){
      let tree = this.state.tree_data.clone();
      if (this.state.filePath === node.path) {
        if (node.isExpanded) {
          tree.collapseNode(node);
        } else {
          tree.expandNode(node);
        }
      }
      this.setState({tree_data: tree});
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

  onAddTreeNode = (path, type) => {
    let tree = this.state.tree_data.clone();
    let name = this.getFileNameByPath(path);

    let parentPath = path.slice(0, path.lastIndexOf('/'));
    parentPath = parentPath === '' ? '/' : parentPath;  //root menu
    let node = this.buildNewTreeNode(name, type);
    let parentNode = tree.getNodeByPath(parentPath);
    tree.addNodeToParent(node, parentNode);
    this.setState({tree_data: tree});
    return parentNode.path === this.state.filePath;
  }

  onRenameTreeNode = (node, newName) => {
    let tree = this.state.tree_data.clone();
    let path = node.path;
    //is ancestor, child, currentNode, otherNode?
    let isCurrentNode = path === this.state.filePath;
    let isChildNode = !isCurrentNode && path.indexOf(this.state.filePath) > -1;
    let isAncestorNode= !isCurrentNode && this.state.filePath.indexOf(path) > -1;

    let treeNode = tree.getNodeByPath(node.path);
    let ancestor_cild_path = isAncestorNode ? this.state.filePath.replace(node.path, '') : '';

    tree.updateNodeParam(treeNode, 'name', newName);
    this.setState({tree_data: tree});
    // return {flag, path};
    // flag is true; update ui;
    // flag is false, path is not null, update list 
    if (isChildNode) {
      return this.state.filePath;
    }
    if (isCurrentNode) {
      return treeNode.path;
    }
    if (isAncestorNode) {
      return treeNode.path + ancestor_cild_path;
    }

    //need not update main panel
    return false;
  }

  onDeleteTreeNode = (node) => {
    let tree = this.state.tree_data.clone();
    // is ancestor, child, currentNode, otherNode? 
    let path = node.path;
    let isCurrentNode = path === this.state.filePath;
    let isChildNode = !isCurrentNode && path.indexOf(this.state.filePath) > -1;
    let isAncestorNode= !isCurrentNode && this.state.filePath.indexOf(path) > -1;
    let parentNode = tree.findNodeParentFromTree(node);
    tree.deleteNode(node);

    this.setState({tree_data: tree});
    if (isChildNode) {
      return this.state.filePath;
    }
    if (isCurrentNode || isAncestorNode) {
      return parentNode.path;
    }
    //need not update main panel;
    return false;
  }

  onMoveNode = (nodePath, moveToPath, moveToRepo) => {
    let tree = this.state.tree_data.clone();

    let moveNode = tree.getNodeByPath(nodePath);
    let moveNodeParent = tree.findNodeParentFromTree(moveNode);

    if (repoID === moveToRepo.repo_id) {
      let moveToNode = tree.getNodeByPath(moveToPath);
      tree.addNodeToParent(moveNode, moveToNode);
    }

    tree.removeNodeFromParent(moveNode, moveNodeParent);
    this.setState({tree_data: tree});
  }

  onCopyNode = (nodePath, copyToPath) => {
    let tree = this.state.tree_data.clone();
    let copyNode = tree.getNodeByPath(nodePath);
    let copyToNode = tree.getNodeByPath(copyToPath);
    tree.addNodeToParent(copyNode, copyToNode);
    this.setState({tree_data: tree});
  }

  getFileNameByPath(path) {
    let index = path.lastIndexOf('/');
    if (index === -1) {
      return '';
    }
    return path.slice(index+1);
  }

  buildNewTreeNode(name, type) {
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

  buildNewDirent(name, type) {
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
          treeData={this.state.tree_data}
          currentFilePath={this.state.filePath}
          currentNode={this.state.currentNode}
          onAddFolderNode={this.onNewDir}
          onAddFileNode={this.onNewFile}
          onRenameNode={this.onRename}
          onDeleteNode={this.onDelete}
        />
        <MainPanel
          filePath={this.state.filePath}
          isViewFile={this.state.isViewFile}
          isInitalPathExist={this.state.isInitalPathExist}
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
          onItemDelete={this.onDelete}
          onItemRename={this.onRename}
          onItemMove={this.onMoveItem}
          onItemCopy={this.onCopyItem}
          onAddFile={this.onNewFile}
          onAddFolder={this.onNewDir}
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
