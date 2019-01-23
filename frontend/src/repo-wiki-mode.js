import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import { gettext, repoID, siteRoot, initialPath, isDir, slug } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import collabServer from './utils/collab-server';
import SidePanel from './pages/repo-wiki-mode/side-panel';
import MainPanel from './pages/repo-wiki-mode/main-panel';
import TreeNode from './components/tree-view-2/tree-node';
import treeHelper from './components/tree-view-2/tree-helper';
import toaster from './components/toast';
import LibDecryptDialog from './components/dialog/lib-decrypt-dialog';
import ModalPortal from './components/modal-portal';
import Dirent from './models/dirent';
import FileTag from './models/file-tag';
import RepoTag from './models/repo-tag';
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
      repoEncrypted: false,
      path: '',
      pathExist: true,
      treeData: treeHelper.buildTree(),
      closeSideBar: false,
      currentNode: null,
      isTreeDataLoading: true,
      isDirentListLoading: true,
      isViewFile: false,
      sortBy: 'name', // 'name' or 'time'
      sortOrder: 'asc', // 'asc' or 'desc'
      direntList: [],
      isFileLoading: true,
      content: '',
      lastModified: '',
      latestContributor: '',
      permission: '',
      isDirentSelected: false,
      isAllDirentSelected: false,
      selectedDirentList: [],
      libNeedDecrypt: false,
      isDraft: false,
      hasDraft: false,
      reviewStatus: '',
      reviewID: '',
      draftFilePath: '',
      dirID: '',
      usedRepoTags: [],
      readmeMarkdown: null,
      draftCounts: 0,
      reviewCounts: 0,
    };
    window.onpopstate = this.onpopstate;
    this.hash = '';
    this.lastModifyTime = new Date();
  }

  componentWillMount() {
    const hash = window.location.hash;
    if (hash.slice(0, 1) === '#') {
      this.hash = hash;
    }
  }

  componentDidMount() {
    seafileAPI.getRepoInfo(repoID).then(res => {
      this.setState({
        libNeedDecrypt: res.data.lib_need_decrypt, 
        repoEncrypted: res.data.encrypted
      });

      if (!res.data.lib_need_decrypt) {
        this.loadWikiData();
      }
    });
  }

  componentWillUnmount() {
    collabServer.unwatchRepo(repoID, this.onRepoUpdateEvent);
  }

  componentDidUpdate() {
    this.lastModifyTime = new Date();
  }

  onRepoUpdateEvent = () => {
    let currentTime = new Date();
    if ((parseFloat(currentTime - this.lastModifyTime)/1000) <= 5) {
      return;
    }
    let { path, dirID } = this.state;
    seafileAPI.dirMetaData(repoID, path).then((res) => {
      if (res.data.id !== dirID) {
        toaster.notify(
          <span>
            {gettext('This folder has been updated. ')}
            <a href='' >{gettext('Refresh')}</a>
          </span>,
          {id: 'repo_updated', duration: 3600}
        );
      }
    })
  }

  loadWikiData = () => {
    // listen current repo
    collabServer.watchRepo(repoID, this.onRepoUpdateEvent);

    // list used FileTags
    seafileAPI.listRepoTags(repoID).then(res => {
      let usedRepoTags = [];
      res.data.repo_tags.forEach(item => {
        let usedRepoTag = new RepoTag(item);
        if (usedRepoTag.fileCount > 0) {
          usedRepoTags.push(usedRepoTag);
        }
      });
      this.setState({usedRepoTags: usedRepoTags});
    });

    // list draft counts and revierw counts
    seafileAPI.getRepoDraftReviewCounts(repoID).then(res => {
      this.setState({
        draftCounts: res.data.draft_counts,
        reviewCounts: res.data.review_counts
      });
    });

    // load side-panel data
    this.loadSidePanel(initialPath);

    // load main-panel data
    if (isDir === 'None') {
      this.setState({pathExist: false});
    } else if (isDir === 'True') {
      this.showDir(initialPath);
    } else if (isDir === 'False') {
      this.showFile(initialPath);
    }
    
  }

  loadSidePanel = (initialPath) => {
    if (initialPath === '/' || isDir === 'None') {
      seafileAPI.listDir(repoID, '/').then(res => {
        let tree = this.state.treeData;
        this.addResponseListToNode(res.data.dirent_list, tree.root);
        this.setState({
          isTreeDataLoading: false,
          treeData: tree
        });
      }).catch(() => {
        this.setState({isLoadFailed: true});
      });
    } else {
      this.loadNodeAndParentsByPath(initialPath);
    }
  }

  showDir = (path) => {
    this.loadDirentList(path);
    this.setState({
      path: path,
      isViewFile: false
    });

    // update location url
    let url = siteRoot + 'wiki/lib/' + repoID + path;
    window.history.pushState({ url: url, path: path}, path, url);
  }

  showFile = (filePath) => {
    this.setState({
      path: filePath,
      isViewFile: true
    });

    this.setState({isFileLoading: true});
    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      let { mtime, permission, last_modifier_name, is_draft, has_draft,
            review_status, review_id, draft_file_path } = res.data;
      seafileAPI.getFileDownloadLink(repoID, filePath).then((res) => {
        seafileAPI.getFileContent(res.data).then((res) => {
          this.setState({
            content: res.data,
            permission: permission,
            latestContributor: last_modifier_name,
            lastModified: moment.unix(mtime).fromNow(),
            isFileLoading: false,
            isDraft: is_draft,
            hasDraft: has_draft,
            reviewStatus: review_status,
            reviewID: review_id,
            draftFilePath: draft_file_path
          });
        });
      });
    });

    let fileUrl = siteRoot + 'wiki/lib/' + repoID + filePath;
    window.history.pushState({url: fileUrl, path: filePath}, filePath, fileUrl);
  }

  updateReadmeMarkdown = (direntList) => {
    this.setState({readmeMarkdown: null});
    direntList.some(item => {
      let fileName = item.name.toLowerCase();
      if (fileName === 'readme.md' || fileName === 'readme.markdown') {
        this.setState({readmeMarkdown: item});
        return true;
      }
    });
  }

  loadDirentList = (path) => {
    this.setState({isDirentListLoading: true});
    seafileAPI.listDir(repoID, path, {'with_thumbnail': true}).then(res => {
      let direntList = [];
      res.data.dirent_list.forEach(item => {
        let fileName = item.name.toLowerCase();
        if (fileName === 'readme.md' || fileName === 'readme.markdown') {
          this.setState({readmeMarkdown: item});
        }
        let dirent = new Dirent(item);
        direntList.push(dirent);
      });

      this.setState({
        direntList: Utils.sortDirents(direntList, this.state.sortBy, this.state.sortOrder),
        isDirentListLoading: false,
        dirID: res.headers.oid,
      });

      if (!this.state.repoEncrypted && direntList.length) {
        this.getThumbnails(repoID, path, this.state.direntList);
      }
    });
  }

  getThumbnails = (repoID, path, direntList) => {
    let items = direntList.filter((item) => {
      return Utils.imageCheck(item.name) && !item.encoded_thumbnail_src;
    });
    if (items.length == 0) {
      return ;
    }

    const _this = this;
    const len = items.length;
    const thumbnailSize = 48;
    let getThumbnail = (i) => {
      const curItem = items[i];
      const curItemPath = [path, curItem.name].join('/');
      seafileAPI.createThumbnail(repoID, curItemPath, thumbnailSize).then((res) => {
        curItem.encoded_thumbnail_src = res.data.encoded_thumbnail_src;
      }).catch((error) => {
        // do nothing
      }).then(() => {
        if (i < len - 1) {
          getThumbnail(++i);
        } else {
          _this.setState({
            direntList: direntList 
          });
        }
      });
    };
    getThumbnail(0);
  }

  onLinkClick = (link) => {
    const url = link;
    if (Utils.isInternalMarkdownLink(url, repoID)) {
      let path = Utils.getPathFromInternalMarkdownLink(url, repoID);
      this.showFile(path);
    } else if (Utils.isInternalDirLink(url, repoID)) {
      let path = Utils.getPathFromInternalDirLink(url, repoID, slug);
      this.showDir(path);
    } else {
      window.open(url);
    }
  }

  updateUsedRepoTags = (newUsedRepoTags) => {
    this.setState({usedRepoTags: newUsedRepoTags});
  }

  updateDirent = (dirent, paramKey, paramValue) => {
    let newDirentList = this.state.direntList.map(item => {
      if (item.name === dirent.name) {
        item[paramKey] = paramValue;
      }
      return item;
    });
    this.setState({direntList: newDirentList});
  }

  onpopstate = (event) => {
    if (event.state && event.state.path) {
      let path = event.state.path;
      if (Utils.isMarkdownFile(path)) {
        this.showFile(path);
      } else {
        this.loadDirentList(path);
        this.setState({
          path: path,
          isViewFile: false
        });
      }
    }
  }

  onSearchedClick = (item) => {
    let path = item.is_dir ? item.path.slice(0, item.path.length - 1) : item.path; 
    if (this.state.currentFilePath === path) {
      return;
    }

    // load sidePanel
    let index = -1;
    let paths = Utils.getPaths(path);
    for (let i = 0; i < paths.length; i++) {
      let node = this.state.treeData.getNodeByPath(node);
      if (!node) {
        index = i;
        break;
      } 
    }
    if (index === -1) { // all the data has been loaded already.
      let node = this.state.treeData.getNodeByPath(path);
      this.setState({currentNode: node});
    } else {
      this.loadNodeAndParentsByPath(path);
    }

    // load mainPanel
    if (item.is_dir) {
      this.showDir(path);
    } else {
      if (Utils.isMarkdownFile(path)) {
        this.showFile(path);
      } else {
        let url = siteRoot + 'lib/' + item.repo_id + '/file' + Utils.encodePath(path);
        let newWindow = window.open('about:blank');
        newWindow.location.href = url;
      }
    }
  }

  onMainNavBarClick = (nodePath) => {
    //just for dir
    this.resetSelected();
    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(nodePath);
    tree.expandNode(node);

    this.setState({treeData: tree, currentNode: node});
    this.showDir(node.path);
  }

  onAddFolder = (dirPath) => {
    // todo Double name check
    seafileAPI.createDir(repoID, dirPath).then(() => {
      let name = Utils.getFileName(dirPath);
      let parentPath = Utils.getDirName(dirPath);

      this.addNodeToTree(name, parentPath, 'dir');
      if (parentPath === this.state.path && !this.state.isViewFile) {
        this.addDirent(name, 'dir');
      }
    }).catch(() => {
      // return error message
    });
  }

  onAddFile = (filePath, isDraft) => {
    // Double name check
    seafileAPI.createFile(repoID, filePath, isDraft).then(res => {
      let name = Utils.getFileName(filePath);
      let parentPath = Utils.getDirName(filePath);

      this.addNodeToTree(name, parentPath, 'file');
      if (parentPath === this.state.path && !this.state.isViewFile) {
        this.addDirent(name, 'file', res.data.size);
      }
    }).catch(() => {
      // todo
    });
  }

  onRenameTreeNode = (node, newName) => {
    this.renameItem(node.path, node.object.isDir(), newName);
  }

  onDeleteTreeNode = (node) => {
    this.deleteItem(node.path, node.object.isDir());
  }

  onMainPanelItemRename = (dirent, newName) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    this.renameItem(path, dirent.isDir(), newName);
  }

  onMainPanelItemDelete = (dirent) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    this.deleteItem(path, dirent.isDir());
  }

  renameItem = (path, isDir, newName) => {
    //validate task
    if (isDir) {
      seafileAPI.renameDir(repoID, path, newName).then(() => {
        this.renameItemAjaxCallback(path, newName);
      }).catch(() => {
        //todos;
      });
    } else {
      seafileAPI.renameFile(repoID, path, newName).then(() => {
        this.renameItemAjaxCallback(path, newName);
      }).catch(() => {
        //todos;
      });
    }
  }

  renameItemAjaxCallback(path, newName) {
    this.renameTreeNode(path, newName);
    this.renameDirent(path, newName);
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

  deleteItemAjaxCallback(path) {
    this.deleteTreeNode(path);
    this.deleteDirent(path);
  }

  onMoveItem = (destRepo, dirent, moveToDirentPath) => {
    //just for view list state
    let dirName = dirent.name
    let direntPath = Utils.joinPath(this.state.path, dirName);
    seafileAPI.moveDir(repoID, destRepo.repo_id,moveToDirentPath, this.state.path, dirName).then(() => {

      this.moveTreeNode(direntPath, moveToDirentPath, destRepo);
      this.moveDirent(direntPath);

      let message = gettext('Successfully moved %(name)s.');
      message = message.replace('%(name)s', dirName);
      toaster.success(message);
    }).catch(() => {
      let message = gettext('Failed to move %(name)s');
      message = message.replace('%(name)s', dirName);
      toaster.danger(message);
    });
  }

  onCopyItem = (destRepo, dirent, copyToDirentPath) => {
    //just for view list state
    let dirName = dirent.name;
    let direntPath = Utils.joinPath(this.state.path, dirName);
    seafileAPI.copyDir(repoID, destRepo.repo_id, copyToDirentPath, this.state.path, dirName).then(() => {
      this.copyTreeNode(direntPath, copyToDirentPath, destRepo);
      let message = gettext('Successfully copied %(name)s.');
      message = message.replace('%(name)s', dirName);
      toaster.success(message);
    }).catch(() => {
      let message = gettext('Failed to copy %(name)s');
      message = message.replace('%(name)s', dirName);
      toaster.danger(message);
    });
  }

  onMoveItems = (destRepo, destDirentPath) => {
    let direntPaths = this.getSelectedDirentPaths();
    let dirNames = this.getSelectedDirentNames();

    seafileAPI.moveDir(repoID, destRepo.repo_id, destDirentPath, this.state.path, dirNames).then(() => {
      direntPaths.forEach(direntPath => {
        this.moveTreeNode(direntPath, destDirentPath, destRepo);
        this.moveDirent(direntPath);
      });
      let message = gettext('Successfully moved %(name)s.');
      message = message.replace('%(name)s', dirNames);
      toaster.success(message);
    }).catch(() => {
      let message = gettext('Failed to move %(name)s');
      message = message.replace('%(name)s', dirNames);
      toaster.danger(message);
    });
  }

  onCopyItems = (destRepo, destDirentPath) => {
    let direntPaths = this.getSelectedDirentPaths();
    let dirNames = this.getSelectedDirentNames();

    seafileAPI.copyDir(repoID, destRepo.repo_id, destDirentPath, this.state.path, dirNames).then(() => {
      direntPaths.forEach(direntPath => {
        this.copyTreeNode(direntPath, destDirentPath, destRepo);
      });
      let message = gettext('Successfully copied %(name)s.');
      message = message.replace('%(name)s', dirNames);
      toaster.success(message);
    }).catch(() => {
      let message = gettext('Failed to copy %(name)s');
      message = message.replace('%(name)s', dirNames);
      toaster.danger(message);
    });
  }

  onDeleteItems = () => {
    let direntPaths = this.getSelectedDirentPaths();
    let dirNames = this.getSelectedDirentNames();

    seafileAPI.deleteMutipleDirents(repoID, this.state.path, dirNames).then(res => {
      direntPaths.forEach(direntPath => {
        this.deleteTreeNode(direntPath);
        this.deleteDirent(direntPath);
      });
    });
  }

  onDirentClick = (dirent) => {
    this.resetSelected();
    let direntPath = Utils.joinPath(this.state.path, dirent.name);
    if (dirent.isDir()) {  // is dir
      this.loadTreeNodeByPath(direntPath);
      this.showDir(direntPath);
    } else {  // is file
      if (Utils.isMarkdownFile(direntPath)) {
        this.showFile(direntPath);
      } else {
        const w=window.open('about:blank');
        const url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(direntPath);
        w.location.href = url;
      }
    }
  }

  onDirentSelected = (dirent) => {
    let direntList = this.state.direntList.map(item => {
      if (item.name === dirent.name) {
        item.isSelected = !item.isSelected;
      }
      return item;
    });
    let selectedDirentList = direntList.filter(item => {
      return item.isSelected;
    });

    if (selectedDirentList.length) {
      this.setState({isDirentSelected: true});
      if (selectedDirentList.length === direntList.length) {
        this.setState({
          isAllDirentSelected: true,
          direntList: direntList,
          selectedDirentList: selectedDirentList,
        });
      } else {
        this.setState({
          isAllDirentSelected: false,
          direntList: direntList,
          selectedDirentList: selectedDirentList
        });
      }
    } else {
      this.setState({
        isDirentSelected: false,
        isAllDirentSelected: false,
        direntList: direntList,
        selectedDirentList: []
      });
    }
  }

  onAllDirentSelected = () => {
    if (this.state.isAllDirentSelected) {
      let direntList = this.state.direntList.map(item => {
        item.isSelected = false;
        return item;
      });
      this.setState({
        isDirentSelected: false,
        isAllDirentSelected: false,
        direntList: direntList,
        selectedDirentList: [],
      });
    } else {
      let direntList = this.state.direntList.map(item => {
        item.isSelected = true;
        return item;
      });
      this.setState({
        isDirentSelected: true,
        isAllDirentSelected: true,
        direntList: direntList,
        selectedDirentList: direntList,
      });
    }
  }

  onFileTagChanged = (dirent, direntPath) => {
    seafileAPI.listFileTags(repoID, direntPath).then(res => {
      let fileTags = res.data.file_tags.map(item => {
        return new FileTag(item);
      });
      this.updateDirent(dirent, 'file_tags', fileTags);
    });

    seafileAPI.listRepoTags(repoID).then(res => {
      let usedRepoTags = [];
      res.data.repo_tags.forEach(item => {
        let usedRepoTag = new RepoTag(item);
        if (usedRepoTag.fileCount > 0) {
          usedRepoTags.push(usedRepoTag);
        }
      });
      this.updateUsedRepoTags(usedRepoTags);
    });
  }

  onFileUploadSuccess = (direntObject) => {
    let isExist = this.state.direntList.some(item => { 
      return item.name === direntObject.name && item.type === direntObject.type;
    });
    if (isExist) {
      let direntList = this.state.direntList;
      for (let i = 0; i < direntList.length; i++) {
        let dirent = direntList[i];
        if (dirent.name === direntObject.name && dirent.type === direntObject.type) {
          let mtime = moment.unix(direntObject.mtime).fromNow();
          this.updateDirent(dirent, 'mtime', mtime);  // todo file size is need update too, api is not return;
          break;
        }
      }
    } else {
      direntObject.permission = 'rw';
      let dirent = new Dirent(direntObject);
      this.addNodeToTree(dirent.name, this.state.path, dirent.type);
      if (direntObject.type === 'dir') {
        this.setState({direntList: [dirent, ...this.state.direntList]});
      } else {
        this.setState({direntList: [...this.state.direntList, dirent]});
        this.updateReadmeMarkdown(this.state.direntList);
      }
    }
  }

  addDirent = (name, type, size) => {
    let item = this.createDirent(name, type, size);
    let direntList = this.state.direntList;
    if (type === 'dir') {
      direntList.unshift(item);
    } else {
      // there will be there conditions;
      // first: direntList.length === 0;
      // second: all the direntList's items are dir;
      // third: direntList has dir and file;
      let length = direntList.length
      if (length === 0 || direntList[length - 1].type === 'dir') {
        direntList.push(item);
      } else {
        let index = 0;
        for (let i = 0; i <= length; i++) {
          if (direntList[i].type === 'file') {
            index = i;
            break;
          }
        }
        direntList.splice(index, 0, item);
      }
    }
    this.setState({direntList: direntList});
    this.updateReadmeMarkdown(direntList);
  }

  renameDirent = (direntPath, newName) => {
    let parentPath = Utils.getDirName(direntPath);
    let newDirentPath = Utils.joinPath(parentPath, newName);
    if (direntPath === this.state.path) {
      // the renamed item is current viewed item
      // example: direntPath = /A/B/C, state.path = /A/B/C

      this.setState({ path: newDirentPath });
      let url = siteRoot + 'wiki/lib/' + repoID + newDirentPath;
      window.history.replaceState({ url: url, path: newDirentPath}, newDirentPath, url);
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
      this.updateReadmeMarkdown(direntList);
    } else if (Utils.isAncestorPath(direntPath, this.state.path)) {
      // example: direntPath = /A/B, state.path = /A/B/C
      let newPath = Utils.renameAncestorPath(this.state.path, direntPath, newDirentPath);
      this.setState({ path: newPath });
    }
  }

  deleteDirent(direntPath) {
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
      this.updateReadmeMarkdown(direntList);
    } else if (Utils.isAncestorPath(direntPath, this.state.path)) {
      // the deleted item is ancester of the current item
      let parentPath = Utils.getDirName(direntPath);
      this.showDir(parentPath);
    }
    // else do nothing
  }

  moveDirent = (direntPath) => {
    let name = direntPath.slice(direntPath.lastIndexOf('/') + 1);
    let direntList = this.state.direntList.filter(item => {
      return item.name !== name;
    });
    this.setState({direntList: direntList});
    this.updateReadmeMarkdown(direntList);
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

  loadTreeNodeByPath = (path) => {
    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(path);
    if (!node.isLoaded) {
      seafileAPI.listDir(repoID, node.path).then(res => {
        this.addResponseListToNode(res.data.dirent_list, node);
        let parentNode = tree.getNodeByPath(node.parentNode.path);
        parentNode.isExpanded = true;
        this.setState({
          treeData: tree,
          currentNode: node
        });
      })
    } else {
      let parentNode = tree.getNodeByPath(node.parentNode.path);
      parentNode.isExpanded = true;
      this.setState({treeData: tree, currentNode: node}); //tree
    }
  }

  loadNodeAndParentsByPath = (path) => {
    let tree = this.state.treeData.clone();
    if (Utils.isMarkdownFile(path)) {
      path = Utils.getDirName(path);
    }
    seafileAPI.listDir(repoID, path, {with_parents: true}).then(res => {
      let direntList = res.data.dirent_list;
      let results = {};
      for (let i = 0; i < direntList.length; i++) {
        let object = direntList[i];
        let key = object.parent_dir;
        if (!results[key]) {
          results[key] = [];
        }
        results[key].push(object);
      }
      for (let key in results) {
        let node = tree.getNodeByPath(key);
        if (!node.isLoaded) {
          this.addResponseListToNode(results[key], node);
        }
      }
      this.setState({
        isTreeDataLoading: false,
        treeData: tree
      });
    }).catch(() => {
      this.setState({isLoadFailed: true});
    });
  }

  onTreeNodeClick = (node) => {
    this.resetSelected();
    if (!this.state.pathExist) {
      this.setState({pathExist: true});
    }

    if (node.object.isDir()) {
      if (!node.isLoaded) {
        let tree = this.state.treeData.clone();
        node = tree.getNodeByPath(node.path);
        seafileAPI.listDir(repoID, node.path).then(res => {
          this.addResponseListToNode(res.data.dirent_list, node);
          tree.collapseNode(node);
          this.setState({treeData: tree});
        });
      }
      if (node.path === this.state.path) {
        if (node.isExpanded) {
          let tree = treeHelper.collapseNode(this.state.treeData, node);
          this.setState({treeData: tree});
        } else {
          let tree = this.state.treeData.clone();
          node = tree.getNodeByPath(node.path);
          tree.expandNode(node);
          this.setState({treeData: tree});
        }
      }
    }

    if (node.path === this.state.path ) {
      return;
    }

    if (node.object.isDir()) {  // isDir
      this.showDir(node.path);
    } else {
      if (Utils.isMarkdownFile(node.path)) {
        if (node.path !== this.state.path) {
          this.showFile(node.path);
        }
      } else {
        const w = window.open('about:blank');
        const url = siteRoot + 'lib/' + repoID + '/file' + node.path;
        w.location.href = url;
      }
    }
  }

  onTreeNodeCollapse = (node) => {
    let tree = treeHelper.collapseNode(this.state.treeData, node);
    this.setState({treeData: tree});
  }

  onTreeNodeExpanded = (node) => {
    let tree = this.state.treeData.clone();
    node = tree.getNodeByPath(node.path);
    if (!node.isLoaded) {
      seafileAPI.listDir(repoID, node.path).then(res => {
        this.addResponseListToNode(res.data.dirent_list, node);
        this.setState({treeData: tree});
      });
    } else {
      tree.expandNode(node);
      this.setState({treeData: tree});
    }
  }

  addNodeToTree = (name, parentPath, type) => {
    let node = this.createTreeNode(name, type);
    let tree = treeHelper.addNodeToParentByPath(this.state.treeData, node, parentPath);
    this.setState({treeData: tree});
  }

  renameTreeNode = (path, newName) => {
    let tree = treeHelper.renameNodeByPath(this.state.treeData, path, newName);
    this.setState({treeData: tree});
  }

  deleteTreeNode = (path) => {
    let tree = treeHelper.deleteNodeByPath(this.state.treeData, path);
    this.setState({treeData: tree});
  }

  moveTreeNode = (nodePath, moveToPath, moveToRepo) => {
    if (repoID !== moveToRepo.repo_id) {
      let tree = treeHelper.deleteNodeByPath(this.state.treeData, nodePath);
      this.setState({treeData: tree});
      return
    }
    let tree = treeHelper.moveNodeByPath(this.state.treeData, nodePath, moveToPath);
    this.setState({treeData: tree});
  }

  copyTreeNode = (nodePath, copyToPath, destRepo) => {
    if (repoID !== destRepo.repo_id) {
      return;
    }
    let tree = treeHelper.copyNodeByPath(this.state.treeData, nodePath, copyToPath);
    this.setState({treeData: tree});
  }

  createTreeNode(name, type) {
    let object = this.createDirent(name, type);
    return new TreeNode({object});
  }

  createDirent(name, type, size) {
    let mtime = new Date().getTime()/1000;
    let dirent = new Dirent({name, type, mtime, size});
    return dirent;
  }

  addResponseListToNode = (list, node) => {
    node.isLoaded = true;
    node.isExpanded = true;
    let direntList = list.map(item => {
      return new Dirent(item);
    });
    direntList = Utils.sortDirents(direntList, 'name', 'asc');

    let nodeList = direntList.map(object => {
      return new TreeNode({object});
    });
    node.addChildren(nodeList);
  }

  getSelectedDirentPaths = () => {
    let paths = [];
    this.state.selectedDirentList.forEach(selectedDirent => {
      paths.push(Utils.joinPath(this.state.path, selectedDirent.name));
    });
    return paths;
  }

  getSelectedDirentNames = () => {
    let names = [];
    this.state.selectedDirentList.forEach(selectedDirent => {
      names.push(selectedDirent.name);
    });
    return names;
  }

  resetSelected = () => {
    this.setState({
      isDirentSelected: false,
      isAllDirentSelected: false,
    });
  }

  onLibDecryptDialog = () => {
    this.setState({libNeedDecrypt: false});
    this.loadWikiData();
  }

  goReviewPage = () => {
    window.location.href = siteRoot + 'drafts/review/' + this.state.reviewID;
  }

  goDraftPage = () => {
    window.location.href = siteRoot + 'lib/' + repoID + '/file' + this.state.draftFilePath + '?mode=edit';
  }

  sortItems = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortDirents(this.state.direntList, sortBy, sortOrder)
    })
  }

  render() {
    let { libNeedDecrypt } = this.state;
    if (libNeedDecrypt) {
      return (
        <ModalPortal>
          <LibDecryptDialog 
            repoID={repoID}
            onLibDecryptDialog={this.onLibDecryptDialog}
          />
        </ModalPortal>
      )
    }

    return (
      <div id="main" className="wiki-main">
        <SidePanel
          isTreeDataLoading={this.state.isTreeDataLoading}
          onNodeClick={this.onTreeNodeClick}
          onNodeCollapse={this.onTreeNodeCollapse}
          onNodeExpanded={this.onTreeNodeExpanded}
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
          repoEncrypted={this.state.repoEncrypted}
          isViewFile={this.state.isViewFile}
          pathExist={this.state.pathExist}
          isDirentListLoading={this.state.isDirentListLoading}
          isFileLoading={this.state.isFileLoading}
          permission={this.state.permission}
          content={this.state.content}
          lastModified={this.state.lastModified}
          latestContributor={this.state.latestContributor}
          direntList={this.state.direntList}
          sortBy={this.state.sortBy}
          sortOrder={this.state.sortOrder}
          sortItems={this.sortItems}
          selectedDirentList={this.state.selectedDirentList}
          updateDirent={this.updateDirent}
          onSideNavMenuClick={this.onSideNavMenuClick}
          onSearchedClick={this.onSearchedClick}
          onMainNavBarClick={this.onMainNavBarClick}
          onItemClick={this.onDirentClick}
          onItemSelected={this.onDirentSelected}
          onItemDelete={this.onMainPanelItemDelete}
          onItemRename={this.onMainPanelItemRename}
          onLinkClick={this.onLinkClick}
          onItemMove={this.onMoveItem}
          onItemCopy={this.onCopyItem}
          onAddFile={this.onAddFile}
          onAddFolder={this.onAddFolder}
          onFileTagChanged={this.onFileTagChanged}
          isDirentSelected={this.state.isDirentSelected}
          isAllDirentSelected={this.state.isAllDirentSelected}
          onAllDirentSelected={this.onAllDirentSelected}
          onItemsMove={this.onMoveItems}
          onItemsCopy={this.onCopyItems}
          onItemsDelete={this.onDeleteItems}
          onFileUploadSuccess={this.onFileUploadSuccess}
          hash={this.hash}
          isDraft={this.state.isDraft}
          hasDraft={this.state.hasDraft}
          reviewStatus={this.state.reviewStatus}
          reviewID={this.state.reviewID}
          goDraftPage={this.goDraftPage}
          goReviewPage={this.goReviewPage}
          usedRepoTags={this.state.usedRepoTags}
          readmeMarkdown={this.state.readmeMarkdown}
          draftCounts={this.state.draftCounts}
          reviewCounts={this.state.reviewCounts}
        />
      </div>
    );
  }
}

ReactDOM.render (
  <Wiki />,
  document.getElementById('wrapper')
);
