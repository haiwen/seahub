import React from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import moment from 'moment';
import { gettext, siteRoot, username, isDocs } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import collabServer from '../../utils/collab-server';
import Dirent from '../../models/dirent';
import FileTag from '../../models/file-tag';
import RepoTag from '../../models/repo-tag';
import RepoInfo from '../../models/repo-info';
import TreeNode from '../../components/tree-view/tree-node';
import treeHelper from '../../components/tree-view/tree-helper';
import toaster from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
import LibDecryptDialog from '../../components/dialog/lib-decrypt-dialog';
import LibContentToolbar from './lib-content-toolbar';
import LibContentContainer from './lib-content-container';
import FileUploader from '../../components/file-uploader/file-uploader';
import SessionExpiredTip from '../../components/session-expired-tip';

const propTypes = {
  pathPrefix: PropTypes.array.isRequired,
  onTabNavClick: PropTypes.func.isRequired,
  onMenuClick: PropTypes.func.isRequired,
  repoID: PropTypes.string,
};

class LibContentView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentMode: cookie.load('seafile_view_mode') || 'list',
      path: '',
      pathExist: true,
      isViewFile: false,
      hash: '',
      currentRepoInfo: null,
      repoName: '',
      repoPermission: true,
      repoEncrypted: false,
      libNeedDecrypt: false,
      isGroupOwnedRepo: false,
      userPerm: '',
      selectedDirentList: [],
      isDraft: false,
      hasDraft: false,
      fileTags: [],
      relatedFiles: [],
      draftID: '',
      draftCounts: 0,
      usedRepoTags: [],
      readmeMarkdown: null,
      isTreeDataLoading: true,
      treeData: treeHelper.buildTree(),
      currentNode: null,
      isFileLoading: true,
      isFileLoadedErr: false,
      filePermission: '',
      content: '',
      lastModified: '',
      latestContributor: '',
      isDirentListLoading: true,
      direntList: [],
      isDirentSelected: false,
      sortBy: cookie.load('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: cookie.load('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
      isAllDirentSelected: false,
      dirID: '',  // for update dir list
      errorMsg: '',
      isDirentDetailShow: false,
      direntDetailPanelTab: '',
      updateDetail: false,
      itemsShowLength: 100,
      isSessionExpired: false,
    };

    this.oldonpopstate = window.onpopstate;
    window.onpopstate = this.onpopstate;
    this.lastModifyTime = new Date();
    this.isNeedUpdateHistoryState = true; // Load, refresh page, switch mode for the first time, no need to set historyState
  }

  showDirentDetail = (direntDetailPanelTab) => {
    if (direntDetailPanelTab) {
      this.setState({ direntDetailPanelTab: direntDetailPanelTab }, () => {
        this.setState({ isDirentDetailShow: true });
      });
    } else {
      this.setState({
        direntDetailPanelTab: '',
        isDirentDetailShow: true
      });
    }
  }

  toggleDirentDetail = () => {
    this.setState({
      direntDetailPanelTab: '',
      isDirentDetailShow: !this.state.isDirentDetailShow
    });
  }

  closeDirentDetail = () => {
    this.setState({
      isDirentDetailShow: false,
      direntDetailPanelTab: '',
    });
  }

  componentWillMount() {
    const hash = window.location.hash;
    if (hash.slice(0, 1) === '#') {
      this.setState({hash: hash});
    }
  }

  componentDidMount() {
    // eg: http://127.0.0.1:8000/library/repo_id/repo_name/**/**/\
    let repoID = this.props.repoID;
    let location = window.location.href.split('#')[0];
    location = decodeURIComponent(location);
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repoInfo = new RepoInfo(res.data);
      let isGroupOwnedRepo = repoInfo.owner_email.indexOf('@seafile_group') > -1;
      this.setState({
        currentRepoInfo: repoInfo,
        repoName: repoInfo.repo_name,
        libNeedDecrypt: repoInfo.lib_need_decrypt, 
        repoEncrypted: repoInfo.encrypted,
        repoPermission: repoInfo.permission === 'rw',
        isGroupOwnedRepo: isGroupOwnedRepo,
      });

      let repoID = repoInfo.repo_id;
      let path = location.slice(location.indexOf(repoID) + repoID.length + 1); // get the string after repoID
      path = path.slice(path.indexOf('/')); // get current path

      this.isNeedUpdateHistoryState = false;

      this.setState({path: path});

      if (!repoInfo.lib_need_decrypt) {
        this.loadDirData(path);
      }
    }).catch(error => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            isDirentListLoading: false,
            errorMsg: gettext('Permission denied')
          });
          
          let errorMsg = gettext('Permission denied');
          toaster.danger(errorMsg);
        } else {
          this.setState({
            isDirentListLoading: false,
            errorMsg: gettext('Error')
          });
        }
      } else {
        this.setState({
          isDirentListLoading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  componentWillUnmount() {
    window.onpopstate = this.oldonpopstate;
    collabServer.unwatchRepo(this.props.repoID, this.onRepoUpdateEvent);
  }

  componentDidUpdate() {
    this.lastModifyTime = new Date();
  }

  onpopstate = (event) => {
    if (event.state && event.state.key) { // root path
      if (this.state.path === '/') {
        return;
      } else {
        let path = '/';
        this.loadDirentList(path);
        this.setState({
          path: path,
          isViewFile: false
        });
      }
    } else if (event.state && event.state.path) { // file path
      let path = event.state.path;
      if (this.state.currentMode === 'column') {
        if (Utils.isMarkdownFile(path)) { // Judging not strict
          this.showFile(path);
          return;
        }
      }
      this.loadDirentList(path);
      this.setState({
        path: path,
        isViewFile: false
      });
    }
  }

  onRepoUpdateEvent = () => {
    let currentTime = new Date();
    if ((parseFloat(currentTime - this.lastModifyTime)/1000) <= 5) {
      return;
    }
    let repoID = this.props.repoID;
    let { path, dirID } = this.state;

    if (this.state.currentMode === 'column') {
      if (this.state.isViewFile) {
        this.updataColumnMarkdownData(path);
      } else {
        seafileAPI.dirMetaData(repoID, path).then((res) => {
          if (res.data.id !== dirID) {
            this.loadDirentList(path);
          }
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    } else {
      seafileAPI.dirMetaData(repoID, path).then((res) => {
        if (res.data.id !== dirID) {
          this.loadDirentList(path);
        }
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  updateUsedRepoTags = () => {
    let repoID = this.props.repoID;
    seafileAPI.listRepoTags(repoID).then(res => {
      let usedRepoTags = [];
      res.data.repo_tags.forEach(item => {
        let usedRepoTag = new RepoTag(item);
        if (usedRepoTag.fileCount > 0) {
          usedRepoTags.push(usedRepoTag);
        }
      });
      this.setState({usedRepoTags: usedRepoTags});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
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

  updataColumnMarkdownData = (filePath) => {
    let repoID = this.props.repoID;
    // update state
    this.setState({
      path: filePath,
      isViewFile: true
    });

    // update data
    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      let { mtime, permission, last_modifier_name, is_draft, has_draft, draft_id } = res.data;
      seafileAPI.getFileDownloadLink(repoID, filePath).then((res) => {
        seafileAPI.getFileContent(res.data).then((res) => {
          if (this.state.content !== res.data) {
            this.setState({isFileLoading: true});
          }
          this.setState({
            content: res.data,
            filePermission: permission,
            latestContributor: last_modifier_name,
            lastModified: moment.unix(mtime).fromNow(),
            isFileLoading: false,
            isFileLoadedErr: false,
            isDraft: is_draft,
            hasDraft: has_draft,
            draftID: draft_id
          });
        });
      });
    }).catch(() => {
      this.setState({
        isFileLoading: false,
        isFileLoadedErr: true,
      });
    });
  }

  // load data
  loadDirData = (path) => {
    let repoID = this.props.repoID;

    // listen current repo
    collabServer.watchRepo(repoID, this.onRepoUpdateEvent);

    // list used FileTags
    this.updateUsedRepoTags();

    // list draft counts and revierw counts
    if (isDocs) {
      seafileAPI.getRepoDraftCounts(repoID).then(res => {
        this.setState({
          draftCounts: res.data.draft_counts,
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
    
    if (Utils.isMarkdownFile(path)) {
      seafileAPI.getFileInfo(this.props.repoID, path).then(() => {
        if (this.state.currentMode !== 'column') {
          cookie.save('seafile_view_mode', 'column');
          this.setState({currentMode: 'column'});
        }
        this.loadSidePanel(path);
        this.showFile(path);
      }).catch(() => {
        if (this.state.currentMode === 'column') { // After an error occurs, follow dir
          this.loadSidePanel(path);
          this.showDir(path);
        } else {
          this.showDir(path);
        }
      });
    } else {
      if (this.state.currentMode === 'column') {
        this.loadSidePanel(path);
        this.showDir(path);
      } else {
        this.showDir(path);
      }
    }
  }

  loadSidePanel = (path) => {
    let repoID = this.props.repoID;
    if (path === '/') {
      seafileAPI.listDir(repoID, '/').then(res => {
        let tree = this.state.treeData;
        this.addResponseListToNode(res.data.dirent_list, tree.root);
        this.setState({
          isTreeDataLoading: false,
          treeData: tree
        });
      }).catch(() => {
        this.setState({isTreeDataLoading: false});
      });
    } else {
      this.loadNodeAndParentsByPath(path);
    }
  }

  showDir = (path) => {
    let repoID = this.props.repoID;

    if (!this.state.isSessionExpired) {
      // update stste
      this.setState({
        isDirentListLoading: true,
        isViewFile: false,
        selectedDirentList: [],
      });
    }

    // update data
    this.loadDirentList(path);
    this.resetShowLength();

    if (!this.isNeedUpdateHistoryState) {
      this.isNeedUpdateHistoryState = true;
      return;
    }
    // update location
    let repoInfo = this.state.currentRepoInfo;
    let url = siteRoot + 'library/' + repoID + '/' + encodeURIComponent(repoInfo.repo_name) + Utils.encodePath(path);
    window.history.pushState({url: url, path: path}, path, url);
  }

  showFile = (filePath) => {
    let repoID = this.props.repoID;

    if (this.state.currentMode === 'column') {
      seafileAPI.listFileTags(repoID, filePath).then(res => {
        let fileTags = res.data.file_tags.map(item => {
          return new FileTag(item);
        });
        this.setState({fileTags: fileTags});
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
      
      seafileAPI.listRelatedFiles(repoID, filePath).then(res => {
        let relatedFiles = res.data.related_files.map((relatedFile) => {
          return relatedFile;
        });
        this.setState({relatedFiles: relatedFiles});
      }).catch((error) => {
        if (error.response.status === 500) {
          this.setState({relatedFiles: []});
        }
      });
    }

    // update state
    this.setState({
      isFileLoading: true,
      path: filePath,
      isViewFile: true
    });

    // update data
    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      let { mtime, permission, last_modifier_name, is_draft, has_draft, draft_id } = res.data;
      seafileAPI.getFileDownloadLink(repoID, filePath).then((res) => {
        seafileAPI.getFileContent(res.data).then((res) => {
          this.setState({
            content: res.data,
            filePermission: permission,
            latestContributor: last_modifier_name,
            lastModified: moment.unix(mtime).fromNow(),
            isFileLoading: false,
            isFileLoadedErr: false,
            isDraft: is_draft,
            hasDraft: has_draft,
            draftID: draft_id
          });
        });
      });
    }).catch((err) => {
      if (err.response.status === 403) {
        toaster.danger(
          <SessionExpiredTip />,
          {id: 'session_expired', duration: 3600}
        );
      }
      this.setState({
        isFileLoading: false,
        isFileLoadedErr: true,
      });
    });

    // update location
    let repoInfo = this.state.currentRepoInfo;
    let url = siteRoot + 'library/' + repoID + '/' + encodeURIComponent(repoInfo.repo_name) + Utils.encodePath(filePath);
    window.history.pushState({url: url, path: filePath}, filePath, url);
  } 

  loadDirentList = (path) => {
    let repoID = this.props.repoID;
    seafileAPI.listDir(repoID, path, {'with_thumbnail': true}).then(res => {
      let direntList = [];
      let markdownItem = null;
      res.data.dirent_list.forEach(item => {
        let fileName = item.name.toLowerCase();
        if (fileName === 'readme.md' || fileName === 'readme.markdown') {
          markdownItem = item;
        }
        let dirent = new Dirent(item);
        direntList.push(dirent);
      });

      this.setState({
        pathExist: true,
        userPerm: res.data.user_perm,
        isDirentListLoading: false,
        direntList: Utils.sortDirents(direntList, this.state.sortBy, this.state.sortOrder),
        dirID: res.data.dir_id,
        readmeMarkdown: markdownItem,
        path: path,
        isSessionExpired: false,
      });

      if (!this.state.repoEncrypted && direntList.length) {
        this.getThumbnails(repoID, path, this.state.direntList);
      }
    }).catch((err) => {
      if (err.response.status === 403) {
        toaster.danger(
          <SessionExpiredTip />,
          {id: 'session_expired', duration: 3600}
        );
        this.setState({isDirentListLoading: false});
        return;
      }
      this.setState({
        isDirentListLoading: false,
        pathExist: false,
      });
    });
  }

  onListContainerScroll = () => {
    let itemsShowLength = this.state.itemsShowLength + 100;
    this.setState({itemsShowLength: itemsShowLength});
  }

  resetShowLength = () => {
    this.setState({itemsShowLength: 100});
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

  updateMoveCopyTreeNode = (path) => {
    let repoID = this.props.repoID;

    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(path);

    let nodeChildren = node.children.map(item => item.object);
    let nodeChildrenNames = nodeChildren.map(item => item.name);

    seafileAPI.listDir(repoID, path).then(res => {
      let newDirentList = res.data.dirent_list;
      let newAddedDirents = newDirentList.filter(item => {
        return !nodeChildrenNames.includes(item.name);
      });
      newAddedDirents.map(item => {
        this.addNodeToTree(item.name, path, item.type);
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  // toolbar operations
  onMoveItems = (destRepo, destDirentPath) => {
    let repoID = this.props.repoID;
    let direntPaths = this.getSelectedDirentPaths();
    let dirNames = this.getSelectedDirentNames();

    seafileAPI.moveDir(repoID, destRepo.repo_id, destDirentPath, this.state.path, dirNames).then(res => {
      if (repoID !== destRepo.repo_id) {
        let taskId = res.data.task_id;
        seafileAPI.queryAsyncOperationProgress(taskId).then(res => {
          if (res.data.failed) {
            let errMessage = Utils.getMoveFailedMessage(dirNames);
            toaster.danger(errMessage);
            return;
          }
          direntPaths.forEach((direntPath, index) => {
            if (this.state.currentMode === 'column') {
              this.deleteTreeNode(direntPath);
            }
            this.moveDirent(direntPath);
          });
          let message =  Utils.getMoveSuccessMessage(dirNames);
          toaster.success(message);
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      } else {
        direntPaths.forEach((direntPath, index) => {
          if (this.state.currentMode === 'column') {
            this.deleteTreeNode(direntPath);
          }
          this.moveDirent(direntPath);
        });
        if (this.state.currentMode === 'column') {
          this.updateMoveCopyTreeNode(destDirentPath);
        }
        let message =  Utils.getMoveSuccessMessage(dirNames);
        toaster.success(message);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = Utils.getMoveFailedMessage(dirNames);
      }
      toaster.danger(errMessage);
    });
  }

  onCopyItems = (destRepo, destDirentPath) => {
    let repoID = this.props.repoID;
    let direntPaths = this.getSelectedDirentPaths();
    let dirNames = this.getSelectedDirentNames();

    seafileAPI.copyDir(repoID, destRepo.repo_id, destDirentPath, this.state.path, dirNames).then(res => {
      if (repoID !== destRepo.repo_id) {
        let taskId = res.data.task_id;
        seafileAPI.queryAsyncOperationProgress(taskId).then(res => {
          if (res.data.failed) {
            let errMessage = Utils.getCopyFailedMessage(dirNames);
            toaster.danger(errMessage);
            return;
          }
          if (destDirentPath === this.state.path) {
            this.loadDirentList(this.state.path);
          }
          let message =  Utils.getCopySuccessfulMessage(dirNames);
          toaster.success(message);
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      } else {
        if (this.state.currentMode === 'column') {
          this.updateMoveCopyTreeNode(destDirentPath);
        }
        if (destDirentPath === this.state.path) {
          this.loadDirentList(this.state.path);
        }
        let message =  Utils.getCopySuccessfulMessage(dirNames);
        toaster.success(message);
      }
      
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = Utils.getCopyFailedMessage(dirNames);
      }
      toaster.danger(errMessage);
    });
  }

  onDeleteItems = () => {
    let repoID = this.props.repoID;
    let direntPaths = this.getSelectedDirentPaths();
    let dirNames = this.getSelectedDirentNames();

    this.setState({updateDetail: !this.state.updateDetail});
    seafileAPI.deleteMutipleDirents(repoID, this.state.path, dirNames).then(res => {
      direntPaths.forEach(direntPath => {
        if (this.state.currentMode === 'column') {
          this.deleteTreeNode(direntPath);
        }
        this.deleteDirent(direntPath);
      });
      let msg = '';
      if (direntPaths.length > 1) {
        msg = gettext('Successfully deleted {name} and other {n} items.');
        msg = msg.replace('{name}', dirNames[0]);
        msg = msg.replace('{n}', dirNames.length - 1);
      } else {
        msg = gettext('Successfully deleted {name}.');
        msg = msg.replace('{name}', dirNames[0]);
      }
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = gettext('Failed to delete {name} and other {n} items.');
        errMessage = errMessage.replace('{name}', dirNames[0]);
        errMessage = errMessage.replace('{n}', dirNames.length - 1);
      }
      toaster.danger(errMessage);
    });
  }

  onAddFolder = (dirPath) => {
    let repoID = this.props.repoID;
    seafileAPI.createDir(repoID, dirPath).then(() => {
      let name = Utils.getFileName(dirPath);
      let parentPath = Utils.getDirName(dirPath);

      if (this.state.currentMode === 'column') {
        this.addNodeToTree(name, parentPath, 'dir');
      }

      if (parentPath === this.state.path && !this.state.isViewFile) {
        this.addDirent(name, 'dir');
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onAddFile = (filePath, isDraft) => {
    let repoID = this.props.repoID;
    seafileAPI.createFile(repoID, filePath, isDraft).then(res => {
      let name = Utils.getFileName(filePath);
      let parentPath = Utils.getDirName(filePath);
      if (this.state.currentMode === 'column') {
        this.addNodeToTree(name, parentPath, 'file');
      }
      if (parentPath === this.state.path && !this.state.isViewFile) {
        this.addDirent(name, 'file', res.data.size);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  switchViewMode = (mode) => {
    if (mode === this.state.currentMode) {
      return;
    }
    if (mode === 'detail') {
      this.toggleDirentDetail();
      return;
    }
    cookie.save('seafile_view_mode', mode);
    let path = this.state.path;
    if (this.state.currentMode === 'column' && this.state.isViewFile) {
      path = Utils.getDirName(path);
      this.setState({
        path: path,
        isViewFile: false,
      });
      let repoInfo = this.state.currentRepoInfo;

      let url = siteRoot + 'library/' + repoInfo.repo_id + '/' + encodeURIComponent(repoInfo.repo_name) + Utils.encodePath(path);
      window.history.pushState({url: url, path: path}, path, url);
    }

    if (mode === 'column') {
      this.loadSidePanel(this.state.path);
    }
    this.isNeedUpdateHistoryState = false;
    this.setState({currentMode: mode});
    this.showDir(path);
  }

  onSearchedClick = (item) => {
    let path = item.is_dir ? item.path.slice(0, item.path.length - 1) : item.path; 
    if (this.state.currentPath === path) {
      return;
    }
    if (this.state.currentMode === 'column') {
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
    } else {
      if (item.is_dir) {
        this.showDir(path);
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
    if (this.state.currentMode === 'column') {
      let tree = this.state.treeData.clone();
      let node = tree.getNodeByPath(nodePath);
      tree.expandNode(node);
      this.setState({treeData: tree, currentNode: node});
    }

    this.showDir(nodePath);
  }

  onLinkClick = (link) => {
    const url = link;
    let repoID = this.props.repoID;
    if (Utils.isInternalMarkdownLink(url, repoID)) {
      let path = Utils.getPathFromInternalMarkdownLink(url, repoID);
      this.showFile(path);
    } else if (Utils.isInternalDirLink(url, repoID)) {
      let path = Utils.getPathFromInternalDirLink(url, repoID);
      this.showDir(path);
    } else {
      window.open(url);
    }
  }

  // list&tree operations
  onMainPanelItemRename = (dirent, newName) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    this.renameItem(path, dirent.isDir(), newName);
  }

  onMainPanelItemDelete = (dirent) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    this.deleteItem(path, dirent.isDir());
  }

  onRenameTreeNode = (node, newName) => {
    this.renameItem(node.path, node.object.isDir(), newName);
  }

  onDeleteTreeNode = (node) => {
    this.deleteItem(node.path, node.object.isDir());
  }

  renameItem = (path, isDir, newName) => {
    let repoID = this.props.repoID;
    if (isDir) {
      seafileAPI.renameDir(repoID, path, newName).then(() => {
        this.renameItemAjaxCallback(path, newName);
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        if (errMessage === gettext('Error')) {
          let name = Utils.getFileName(path);
          errMessage = gettext('Renaming {name} failed').replace('{name}', name);
        }
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.renameFile(repoID, path, newName).then(() => {
        this.renameItemAjaxCallback(path, newName);
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        if (errMessage === gettext('Error')) {
          let name = Utils.getFileName(path);
          errMessage = gettext('Renaming {name} failed').replace('{name}', name);
        }
        toaster.danger(errMessage);
      });
    }
  }

  renameItemAjaxCallback(path, newName) {
    if (this.state.currentMode === 'column') {
      this.renameTreeNode(path, newName);
    }
    this.renameDirent(path, newName);
  }

  deleteItem(path, isDir) {
    let repoID = this.props.repoID;
    if (isDir) {
      seafileAPI.deleteDir(repoID, path).then(() => {
        this.deleteItemAjaxCallback(path, isDir);
        let name = Utils.getFileName(path);
        var msg = gettext('Successfully deleted {name}').replace('{name}', name);
        toaster.success(msg);
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        if (errMessage === gettext('Error')) {
          let name = Utils.getFileName(path);
          errMessage = gettext('Failed to delete {name}').replace('{name}', name);
        }
        toaster.danger(errMessage);
      });
    } else {
      seafileAPI.deleteFile(repoID, path).then(() => {
        this.deleteItemAjaxCallback(path, isDir);
        let name = Utils.getFileName(path);
        var msg = gettext('Successfully deleted {name}').replace('{name}', name);
        toaster.success(msg);
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        if (errMessage === gettext('Error')) {
          let name = Utils.getFileName(path);
          errMessage = gettext('Failed to delete {name}').replace('{name}', name);
        }
        toaster.danger(errMessage);
      });
    }
  }

  deleteItemAjaxCallback(path) {
    if (this.state.currentMode === 'column') {
      this.deleteTreeNode(path);
    }
    this.deleteDirent(path);
  }

  // list operations
  onMoveItem = (destRepo, dirent, moveToDirentPath, nodeParentPath) => {
    let repoID = this.props.repoID;
    //just for view list state
    let dirName = dirent.name;
    if (!nodeParentPath) {
      nodeParentPath = this.state.path;
    }
    let direntPath = Utils.joinPath(nodeParentPath, dirName);
    seafileAPI.moveDir(repoID, destRepo.repo_id, moveToDirentPath, nodeParentPath, dirName).then(res => {
      if (repoID !== destRepo.repo_id) {
        let taskId = res.data.task_id;
        seafileAPI.queryAsyncOperationProgress(taskId).then(res => {
          if (res.data.failed) {
            let errMessage = gettext('Failed to move {name}.');
            errMessage = errMessage.replace('{name}', dirName);
            toaster.danger(errMessage);
            return;
          }
          if (this.state.currentMode === 'column') {
            this.deleteTreeNode(direntPath);
          }
          this.moveDirent(direntPath);
          let message = gettext('Successfully moved {name}.');
          message = message.replace('{name}', dirName);
          toaster.success(message);
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      } else {
        if (this.state.currentMode === 'column') {
          this.deleteTreeNode(direntPath);
          this.updateMoveCopyTreeNode(moveToDirentPath);
        }
        this.moveDirent(direntPath, moveToDirentPath);
  
        let message = gettext('Successfully moved {name}.');
        message = message.replace('{name}', dirName);
        toaster.success(message);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = gettext('Failed to move {name}.');
        errMessage = errMessage.replace('{name}', dirName);
      }
      toaster.danger(errMessage);
    });
  }

  onCopyItem = (destRepo, dirent, copyToDirentPath, nodeParentPath) => {
    let repoID = this.props.repoID;
    //just for view list state
    let dirName = dirent.name;
    if (!nodeParentPath) {
      nodeParentPath = this.state.path;
    }
    let direntPath = Utils.joinPath(nodeParentPath, dirName);

    seafileAPI.copyDir(repoID, destRepo.repo_id, copyToDirentPath, nodeParentPath, dirName).then(res => {
      
      if (repoID !== destRepo.repo_id) {
        let taskId = res.data.task_id;
        seafileAPI.queryAsyncOperationProgress(taskId).then(res => {
          if (res.data.failed) {
            let errMessage = gettext('Failed to copy %(name)s');
            errMessage = errMessage.replace('%(name)s', dirName);
            toaster.danger(errMessage);
            return;
          }
          if (copyToDirentPath === nodeParentPath) {
            this.loadDirentList(this.state.path);
          }
          let message = gettext('Successfully copied %(name)s.');
          message = message.replace('%(name)s', dirName);
          toaster.success(message);
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      } else {
        if (this.state.currentMode === 'column') {
          this.updateMoveCopyTreeNode(copyToDirentPath);
        }
        if (copyToDirentPath === nodeParentPath) {
          this.loadDirentList(this.state.path);
        }
        let message = gettext('Successfully copied %(name)s.');
        message = message.replace('%(name)s', dirName);
        toaster.success(message);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = gettext('Failed to copy %(name)s');
        errMessage = errMessage.replace('%(name)s', dirName);
      }
      toaster.danger(errMessage);
    });
  }

  onDirentClick = (dirent) => {
    let direntList = this.state.direntList.map(dirent => {
      dirent.isSelected = false;
      return dirent;
    });
    if (dirent) {
      // dirent.isSelected = true;
      this.setState({
        direntList: direntList,
        isDirentSelected: true,
        selectedDirentList: [dirent],
      });
    } else {
      this.setState({
        direntList: direntList,
        isDirentSelected: false,
        selectedDirentList: [],
      });
    }
  }

  onItemClick = (dirent) => {
    this.resetSelected();
    let repoID = this.props.repoID;
    let direntPath = Utils.joinPath(this.state.path, dirent.name);
    if (dirent.isDir()) {  // is dir
      if (this.state.currentMode === 'column') {
        this.loadTreeNodeByPath(direntPath);
      }
      this.showDir(direntPath);
    } else {  // is file
      if (this.state.currentMode === 'column' && Utils.isMarkdownFile(direntPath)) {
        this.showColumnMarkdownFile(direntPath);
      } else {
        const url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(direntPath);
        let isWeChat = Utils.isWeChat();
        if (!isWeChat) {
          let newWindow = window.open('about:blank');
          newWindow.location.href = url;
        } else {
          location.href = url;
        }
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
    let repoID = this.props.repoID;
    seafileAPI.listFileTags(repoID, direntPath).then(res => {
      let fileTags = res.data.file_tags.map(item => {
        return new FileTag(item);
      });
      this.updateDirent(dirent, 'file_tags', fileTags);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });

    this.updateUsedRepoTags();
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
      if (this.state.currentMode === 'column') {
        this.addNodeToTree(dirent.name, this.state.path, dirent.type);
      }
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
      let length = direntList.length;
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
    let repoID = this.props.repoID;
    let parentPath = Utils.getDirName(direntPath);
    let newDirentPath = Utils.joinPath(parentPath, newName);
    if (direntPath === this.state.path) {
      // the renamed item is current viewed item
      // example: direntPath = /A/B/C, state.path = /A/B/C

      this.setState({ path: newDirentPath });
      let repoInfo = this.state.currentRepoInfo;
      let url = siteRoot + 'library/' + repoID + '/' + encodeURIComponent(repoInfo.repo_name) + newDirentPath;
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

      let repoInfo = this.state.currentRepoInfo;
      let url = siteRoot + 'library/' + repoID + '/' + encodeURIComponent(repoInfo.repo_name) + newPath;
      window.history.replaceState({ url: url, path: newPath}, newPath, url);
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

  moveDirent = (direntPath, moveToDirentPath = null) => {
    let name = Utils.getFileName(direntPath);
    if (moveToDirentPath === this.state.path) {
      this.loadDirentList(this.state.path);
      return;
    }
    let direntList = this.state.direntList.filter(item => {
      return item.name !== name;
    });
    this.setState({direntList: direntList});
    this.updateReadmeMarkdown(direntList);
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

  // tree operations
  loadTreeNodeByPath = (path) => {
    let repoID = this.props.repoID;
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
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      let parentNode = tree.getNodeByPath(node.parentNode.path);
      parentNode.isExpanded = true;
      this.setState({treeData: tree, currentNode: node}); //tree
    }
  }

  loadNodeAndParentsByPath = (path) => {
    let repoID = this.props.repoID;
    let tree = this.state.treeData.clone();
    if (Utils.isMarkdownFile(path)) {
      path = Utils.getDirName(path);
    }
    seafileAPI.listDir(repoID, path, {with_parents: true}).then(res => {
      let direntList = res.data.dirent_list;
      let results = {};
      for (let i = 0; i < direntList.length; i++) {
        let object = direntList[i];
        let parentDir = object.parent_dir;
        let key = parentDir === '/' ?  '/' : parentDir.slice(0, parentDir.length - 1);
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
    let repoID = this.props.repoID;
    if (!this.state.pathExist) {
      this.setState({pathExist: true});
    }

    if (node.object.isDir()) {
      let isLoaded = node.isLoaded;
      if (!node.isLoaded) {
        let tree = this.state.treeData.clone();
        node = tree.getNodeByPath(node.path);
        seafileAPI.listDir(repoID, node.path).then(res => {
          this.addResponseListToNode(res.data.dirent_list, node);
          tree.collapseNode(node);
          this.setState({treeData: tree});
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
      if (isLoaded && node.path === this.state.path) {
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
          this.showColumnMarkdownFile(node.path);
        }
      } else {
        const w = window.open('about:blank');
        const url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(node.path);
        w.location.href = url;
      }
    }
  }

  showColumnMarkdownFile = (filePath) => {
    let repoID = this.props.repoID;
    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      if (res.data.size === 0) {
        const w = window.open('about:blank');
        const url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(filePath);
        w.location.href = url;
      } else {
        this.showFile(filePath);
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onTreeNodeCollapse = (node) => {
    let tree = treeHelper.collapseNode(this.state.treeData, node);
    this.setState({treeData: tree});
  }

  onTreeNodeExpanded = (node) => {
    let repoID = this.props.repoID;
    let tree = this.state.treeData.clone();
    node = tree.getNodeByPath(node.path);
    if (!node.isLoaded) {
      seafileAPI.listDir(repoID, node.path).then(res => {
        this.addResponseListToNode(res.data.dirent_list, node);
        this.setState({treeData: tree});
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
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

  moveTreeNode = (nodePath, moveToPath, moveToRepo, nodeName) => {
    let repoID = this.props.repoID;
    if (repoID !== moveToRepo.repo_id) {
      let tree = treeHelper.deleteNodeByPath(this.state.treeData, nodePath);
      this.setState({treeData: tree});
      return;
    }
    let tree = treeHelper.moveNodeByPath(this.state.treeData, nodePath, moveToPath, nodeName);
    this.setState({treeData: tree});
  }

  copyTreeNode = (nodePath, copyToPath, destRepo, nodeName) => {
    let repoID = this.props.repoID;
    if (repoID !== destRepo.repo_id) {
      return;
    }
    let tree = treeHelper.copyNodeByPath(this.state.treeData, nodePath, copyToPath, nodeName);
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
    this.loadDirData(this.state.path);
  }
  
  goDraftPage = () => {
    window.open(siteRoot + 'drafts/' + this.state.draftID + '/');
  }

  sortItems = (sortBy, sortOrder) => {
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortDirents(this.state.direntList, sortBy, sortOrder)
    });
  }

  onUploadFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFileUpload();
  }

  onUploadFolder = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFolderUpload();
  }

  onToolbarFileTagChanged = () => {
    let repoID = this.props.repoID;
    let filePath = this.state.path;
    seafileAPI.listFileTags(repoID, filePath).then(res => {
      let fileTags = res.data.file_tags.map(item => {
        return new FileTag(item);
      });

      this.setState({fileTags: fileTags});
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onToolbarRelatedFileChange = () => {
    let repoID = this.props.repoID;
    let filePath = this.state.path;

    seafileAPI.listRelatedFiles(repoID, filePath).then(res => {
      let relatedFiles = res.data.related_files.map((relatedFile) => {
        return relatedFile;
      });
      this.setState({relatedFiles: relatedFiles});
    }).catch((error) => {
      if (error.response.status === 500) {
        this.setState({relatedFiles: []});
      }
    });
  }

  unSelectDirent = () => {
    this.setState({
      isDirentSelected: false,
      selectedDirentList: []
    });
    const dirent = {};
    this.onDirentSelected(dirent);
  }

  onDeleteRepoTag = (deletedTagID) => {
    let direntList = this.state.direntList.map(dirent => {
      if (dirent.file_tags) {
        let fileTags = dirent.file_tags.filter(item => {
          return item.repo_tag_id !== deletedTagID;
        });
        dirent.file_tags = fileTags;
      }
      return dirent;
    });
    this.setState({direntList: direntList});
    this.updateUsedRepoTags();
  }

  render() {
    if (this.state.libNeedDecrypt) {
      return (
        <ModalPortal>
          <LibDecryptDialog 
            repoID={this.props.repoID}
            onLibDecryptDialog={this.onLibDecryptDialog}
          />
        </ModalPortal>
      );
    }

    if (!this.state.currentRepoInfo) {
      return '';
    }

    let enableDirPrivateShare = false;
    let { currentRepoInfo, userPerm } = this.state;
    let showShareBtn = Utils.isHasPermissionToShare(currentRepoInfo, userPerm);
    let isRepoOwner = currentRepoInfo.owner_email === username;
    let isVirtual = currentRepoInfo.is_virtual;
    let isAdmin = currentRepoInfo.is_admin;
    if (!isVirtual && (isRepoOwner || isAdmin)) {
      enableDirPrivateShare = true;
    }
    let direntItemsList = this.state.direntList.filter((item, index) => {
      return index < this.state.itemsShowLength;
    });

    return (
      <div className="main-panel o-hidden">
        <div className="main-panel-north border-left-show">
          <LibContentToolbar
            isViewFile={this.state.isViewFile}
            filePermission={this.state.filePermission}
            isDraft={this.state.isDraft}
            hasDraft={this.state.hasDraft}
            fileTags={this.state.fileTags}
            relatedFiles={this.state.relatedFiles}
            onFileTagChanged={this.onToolbarFileTagChanged}
            onRelatedFileChange={this.onToolbarRelatedFileChange}
            onSideNavMenuClick={this.props.onMenuClick}
            repoID={this.props.repoID}
            path={this.state.path}
            isDirentSelected={this.state.isDirentSelected}
            selectedDirentList={this.state.selectedDirentList}
            onItemsMove={this.onMoveItems}
            onItemsCopy={this.onCopyItems}
            onItemsDelete={this.onDeleteItems}
            onItemRename={this.onMainPanelItemRename}
            direntList={this.state.direntList}
            repoName={this.state.repoName}
            repoEncrypted={this.state.repoEncrypted}
            isGroupOwnedRepo={this.state.isGroupOwnedRepo}
            userPerm={this.state.userPerm}
            showShareBtn={showShareBtn}
            enableDirPrivateShare={enableDirPrivateShare}
            onAddFile={this.onAddFile}
            onAddFolder={this.onAddFolder}
            onUploadFile={this.onUploadFile}
            onUploadFolder={this.onUploadFolder}
            currentMode={this.state.currentMode}
            switchViewMode={this.switchViewMode}
            onSearchedClick={this.onSearchedClick}
            isRepoOwner={isRepoOwner}
            currentRepoInfo={this.state.currentRepoInfo}
            updateDirent={this.updateDirent}
            onDirentSelected={this.onDirentSelected}
            showDirentDetail={this.showDirentDetail}
            listRelatedFiles={this.listRelatedFiles}
            unSelectDirent={this.unSelectDirent}
            onFilesTagChanged={this.onFileTagChanged}
          />
        </div>
        <div className="main-panel-center flex-row">
          <LibContentContainer 
            pathPrefix={this.props.pathPrefix}
            currentMode={this.state.currentMode}
            path={this.state.path}
            pathExist={this.state.pathExist}
            currentRepoInfo={this.state.currentRepoInfo}
            repoID={this.props.repoID}
            repoPermission={this.state.repoPermission}
            enableDirPrivateShare={enableDirPrivateShare}
            userPerm={userPerm}
            isGroupOwnedRepo={this.state.isGroupOwnedRepo}
            onTabNavClick={this.props.onTabNavClick}
            onMainNavBarClick={this.onMainNavBarClick}
            isViewFile={this.state.isViewFile}
            hash={this.state.hash}
            isDraft={this.state.isDraft}
            hasDraft={this.state.hasDraft}
            fileTags={this.state.fileTags}
            relatedFiles={this.state.relatedFiles}
            goDraftPage={this.goDraftPage}
            isFileLoading={this.state.isFileLoading}
            isFileLoadedErr={this.state.isFileLoadedErr}
            filePermission={this.state.filePermission}
            content={this.state.content}
            lastModified={this.state.lastModified}
            latestContributor={this.state.latestContributor}
            onLinkClick={this.onLinkClick}
            isTreeDataLoading={this.state.isTreeDataLoading}
            treeData={this.state.treeData}
            currentNode={this.state.currentNode}
            onNodeClick={this.onTreeNodeClick}
            onNodeCollapse={this.onTreeNodeCollapse}
            onNodeExpanded={this.onTreeNodeExpanded}
            onAddFolderNode={this.onAddFolder}
            onAddFileNode={this.onAddFile}
            onRenameNode={this.onRenameTreeNode}
            onDeleteNode={this.onDeleteTreeNode}
            draftCounts={this.state.draftCounts}
            usedRepoTags={this.state.usedRepoTags}
            readmeMarkdown={this.state.readmeMarkdown}
            updateUsedRepoTags={this.updateUsedRepoTags}
            isDirentListLoading={this.state.isDirentListLoading}
            direntList={direntItemsList}
            sortBy={this.state.sortBy}
            sortOrder={this.state.sortOrder}
            sortItems={this.sortItems}
            updateDirent={this.updateDirent}
            onDirentClick={this.onDirentClick}
            onItemClick={this.onItemClick}
            onItemSelected={this.onDirentSelected}
            onItemDelete={this.onMainPanelItemDelete}
            onItemRename={this.onMainPanelItemRename}
            onItemMove={this.onMoveItem}
            onItemCopy={this.onCopyItem}
            onAddFolder={this.onAddFolder}
            onAddFile={this.onAddFile}
            onFileTagChanged={this.onFileTagChanged}
            isDirentSelected={this.state.isDirentSelected}
            isAllDirentSelected={this.state.isAllDirentSelected}
            onAllDirentSelected={this.onAllDirentSelected}
            isDirentDetailShow={this.state.isDirentDetailShow}
            selectedDirent={this.state.selectedDirentList && this.state.selectedDirentList[0]}
            selectedDirentList={this.state.selectedDirentList}
            onItemsMove={this.onMoveItems}
            onItemsCopy={this.onCopyItems}
            onItemsDelete={this.onDeleteItems}
            closeDirentDetail={this.closeDirentDetail}
            showDirentDetail={this.showDirentDetail}
            direntDetailPanelTab={this.state.direntDetailPanelTab}
            onDeleteRepoTag={this.onDeleteRepoTag}
            onToolbarFileTagChanged={this.onToolbarFileTagChanged}
            updateDetail={this.state.updateDetail}
            onListContainerScroll={this.onListContainerScroll}
          />
          {this.state.pathExist && !this.state.isViewFile && (
            <FileUploader
              ref={uploader => this.uploader = uploader}
              dragAndDrop={true}
              path={this.state.path}
              repoID={this.props.repoID}
              direntList={this.state.direntList}
              onFileUploadSuccess={this.onFileUploadSuccess}
            />
          )}
        </div>
      </div>
    );
  }
}

LibContentView.propTypes = propTypes;

export default LibContentView;
