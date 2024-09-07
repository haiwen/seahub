import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import cookie from 'react-cookies';
import moment from 'moment';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { navigate } from '@gatsbyjs/reach-router';
import { gettext, siteRoot, username, enableVideoThumbnail, enablePDFThumbnail, thumbnailDefaultSize } from '../../utils/constants';
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
import LibContentContainer from './lib-content-container';
import FileUploader from '../../components/file-uploader/file-uploader';
import CopyMoveDirentProgressDialog from '../../components/dialog/copy-move-dirent-progress-dialog';
import DeleteFolderDialog from '../../components/dialog/delete-folder-dialog';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { MetadataProvider, CollaboratorsProvider } from '../../metadata/hooks';

const propTypes = {
  eventBus: PropTypes.object,
  isSidePanelFolded: PropTypes.bool,
  pathPrefix: PropTypes.array.isRequired,
  onTabNavClick: PropTypes.func.isRequired,
  repoID: PropTypes.string,
};

class LibContentView extends React.Component {

  constructor(props) {
    super(props);

    let isTreePanelShown = true;
    const storedTreePanelState = localStorage.getItem('sf_dir_view_tree_panel_open');
    if (storedTreePanelState != undefined) {
      isTreePanelShown = storedTreePanelState == 'true';
    }
    this.state = {
      currentMode: cookie.load('seafile_view_mode') || 'list',
      isTreePanelShown: isTreePanelShown, // display the 'dirent tree' side panel
      path: '',
      pathExist: true,
      isViewFile: false,
      hash: '',
      currentRepoInfo: null,
      repoName: '',
      repoEncrypted: false,
      libNeedDecrypt: false,
      isGroupOwnedRepo: false,
      userPerm: '',
      selectedDirentList: [],
      lastSelectedIndex: null,
      fileTags: [],
      repoTags: [],
      usedRepoTags: [],
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
      dirID: '', // for update dir list
      errorMsg: '',
      isDirentDetailShow: false,
      direntDetailPanelTab: '',
      updateDetail: false,
      itemsShowLength: 100,
      isSessionExpired: false,
      isCopyMoveProgressDialogShow: false,
      isDeleteFolderDialogOpen: false,
      asyncCopyMoveTaskId: '',
      asyncOperationType: 'move',
      asyncOperationProgress: 0,
      asyncOperatedFilesLength: 0,
      viewId: '0000',
      currentDirent: null
    };

    this.oldonpopstate = window.onpopstate;
    window.onpopstate = this.onpopstate;
    this.lastModifyTime = new Date();
    this.isNeedUpdateHistoryState = true; // Load, refresh page, switch mode for the first time, no need to set historyState
    this.currentMoveItemName = '';
    this.currentMoveItemPath = '';
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
  };

  toggleDirentDetail = () => {
    this.setState({
      direntDetailPanelTab: '',
      isDirentDetailShow: !this.state.isDirentDetailShow
    });
  };

  closeDirentDetail = () => {
    this.setState({
      isDirentDetailShow: false,
      direntDetailPanelTab: '',
    });
  };

  UNSAFE_componentWillMount() {
    const hash = window.location.hash;
    if (hash.slice(0, 1) === '#') {
      this.setState({ hash: hash });
    }
  }

  componentDidMount() {
    this.calculatePara(this.props);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.repoID !== this.props.repoID) {
      this.calculatePara(nextProps);
    }
  }

  calculatePara = async (props) => {
    const { repoID, eventBus } = props;
    this.unsubscribeEvent = eventBus.subscribe(EVENT_BUS_TYPE.SEARCH_LIBRARY_CONTENT, this.onSearchedClick);

    const path = this.getPathFromLocation(repoID);

    try {
      const repoInfo = await this.fetchRepoInfo(repoID);
      const isGroupOwnedRepo = repoInfo.owner_email.includes('@seafile_group');

      this.setState({
        treeData: treeHelper.buildTree(),
        currentRepoInfo: repoInfo,
        repoName: repoInfo.repo_name,
        libNeedDecrypt: repoInfo.lib_need_decrypt,
        repoEncrypted: repoInfo.encrypted,
        isGroupOwnedRepo: isGroupOwnedRepo,
        path: path
      });

      if (this.state.isTreePanelShown) {
        this.loadSidePanel(path);
      }

      if (repoInfo.permission.startsWith('custom-')) {
        await this.setCustomPermission(repoID, repoInfo.permission);
      }

      this.isNeedUpdateHistoryState = false;

      if (!repoInfo.lib_need_decrypt) {
        this.loadDirData(path);
      }
    } catch (error) {
      this.handleError(error);
    }
  };

  getPathFromLocation = (repoID) => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewID = urlParams.get('view');
    if (viewID) return `/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}`;

    let location = window.location.href.split('?')[0];
    location = decodeURIComponent(location);
    let path = location.slice(location.indexOf(repoID) + repoID.length + 1);
    path = path.slice(path.indexOf('/'));
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  };

  fetchRepoInfo = async (repoID) => {
    const repoRes = await seafileAPI.getRepoInfo(repoID);
    return new RepoInfo(repoRes.data);
  };

  setCustomPermission = async (repoID, permission) => {
    const permissionID = permission.split('-')[1];
    const permissionRes = await seafileAPI.getCustomPermission(repoID, permissionID);
    window.custom_permission = permissionRes.data.permission;
  };

  handleError = (error) => {
    let errorMsg = gettext('Please check the network.');
    if (error.response) {
      switch (error.response.status) {
        case 403:
          errorMsg = gettext('Permission denied');
          break;
        case 404:
          errorMsg = gettext('Library share permission not found.');
          break;
        default:
          errorMsg = gettext('Error');
      }
    }
    this.setState({
      isDirentListLoading: false,
      errorMsg: errorMsg
    });
    toaster.danger(errorMsg);
  };

  componentWillUnmount() {
    window.onpopstate = this.oldonpopstate;
    collabServer.unwatchRepo(this.props.repoID, this.onRepoUpdateEvent);
    this.unsubscribeEvent();
    this.props.eventBus.dispatch(EVENT_BUS_TYPE.CURRENT_LIBRARY_CHANGED, {
      repoID: '',
      repoName: '',
      path: '',
      isViewFile: false,
      isLibView: false,
      currentRepoInfo: null,
    });
  }

  componentDidUpdate() {
    this.lastModifyTime = new Date();
    this.props.eventBus.dispatch(EVENT_BUS_TYPE.CURRENT_LIBRARY_CHANGED, {
      repoID: this.props.repoID,
      repoName: this.state.repoName,
      currentRepoInfo: this.state.currentRepoInfo,
      path: this.state.path,
      isViewFile: this.state.isViewFile,
      isLibView: true,
    });
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
      if (this.state.isTreePanelShown) {
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
  };

  onRepoUpdateEvent = () => {
    let currentTime = new Date();
    if ((parseFloat(currentTime - this.lastModifyTime) / 1000) <= 5) {
      return;
    }
    let repoID = this.props.repoID;
    let { path, dirID } = this.state;

    if (this.state.isTreePanelShown) {
      if (this.state.isViewFile) {
        this.updateColumnMarkdownData(path);
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
  };

  updateUsedRepoTags = () => {
    let repoID = this.props.repoID;
    seafileAPI.listRepoTags(repoID).then(res => {
      let repoTags = [];
      let usedRepoTags = [];
      res.data.repo_tags.forEach(item => {
        const repoTag = new RepoTag(item);
        repoTags.push(repoTag);
        if (repoTag.fileCount > 0) {
          usedRepoTags.push(repoTag);
        }
      });
      this.setState({
        repoTags: repoTags,
        usedRepoTags: usedRepoTags
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateColumnMarkdownData = (filePath) => {
    let repoID = this.props.repoID;
    // update state
    this.setState({
      path: filePath,
      isViewFile: true
    });

    // update data
    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      let { mtime, permission, last_modifier_name } = res.data;
      seafileAPI.getFileDownloadLink(repoID, filePath).then((res) => {
        seafileAPI.getFileContent(res.data).then((res) => {
          if (this.state.content !== res.data) {
            this.setState({ isFileLoading: true });
          }
          this.setState({
            content: res.data,
            filePermission: permission,
            latestContributor: last_modifier_name,
            lastModified: moment.unix(mtime).fromNow(),
            isFileLoading: false,
            isFileLoadedErr: false,
          });
        });
      });
    }).catch(() => {
      this.setState({
        isFileLoading: false,
        isFileLoadedErr: true,
      });
    });
  };

  // load data
  loadDirData = (path) => {
    let repoID = this.props.repoID;

    // listen current repo
    collabServer.watchRepo(repoID, this.onRepoUpdateEvent);

    // list used FileTags
    this.updateUsedRepoTags();

    if (Utils.isMarkdownFile(path)) {
      this.handleMarkdownFile(path);
    } else {
      this.handleNonMarkdownFile(path);
    }
  };

  handleMarkdownFile = (path) => {
    seafileAPI.getFileInfo(this.props.repoID, path)
      .then(() => {
        /*
        if (this.state.currentMode !== 'column') {
          cookie.save('seafile_view_mode', 'column');
          this.setState({currentMode: 'column'});
        }
        */
        this.loadSidePanel(path);
        this.showFile(path);
      })
      .catch(() => {
        if (this.state.isTreePanelShown) {
          this.loadSidePanel(path);
        }
        this.showDir(path);
      });
  };

  handleNonMarkdownFile = (path) => {
    if (this.state.isTreePanelShown) {
      this.loadSidePanel(path);
    }

    if (!path.includes(PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES)) {
      this.showDir(path);
    }
  };

  loadSidePanel = (path) => {
    let repoID = this.props.repoID;
    if (path === '/' || path.includes(PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES)) {
      seafileAPI.listDir(repoID, '/').then(res => {
        const { dirent_list, user_perm } = res.data;
        let tree = this.state.treeData;
        this.addResponseListToNode(dirent_list, tree.root);
        this.setState({
          isTreeDataLoading: false,
          treeData: tree,
          userPerm: user_perm,
        });
      }).catch(() => {
        this.setState({ isTreeDataLoading: false });
      });
    } else {
      this.loadNodeAndParentsByPath(path);
    }
  };

  showDir = (path) => {
    let repoID = this.props.repoID;

    if (!this.state.isSessionExpired) {
      // update state
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
    window.history.pushState({ url: url, path: path }, path, url);
  };

  showFile = (filePath, noRedirection) => {
    let repoID = this.props.repoID;

    if (this.state.isTreePanelShown) {
      seafileAPI.listFileTags(repoID, filePath).then(res => {
        let fileTags = res.data.file_tags.map(item => {
          return new FileTag(item);
        });
        this.setState({ fileTags: fileTags });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
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
      let { mtime, permission, last_modifier_name } = res.data;
      seafileAPI.getFileDownloadLink(repoID, filePath).then((res) => {
        seafileAPI.getFileContent(res.data).then((res) => {
          this.setState({
            content: res.data,
            filePermission: permission,
            latestContributor: last_modifier_name,
            lastModified: moment.unix(mtime).fromNow(),
            isFileLoading: false,
            isFileLoadedErr: false,
          });
        });
      });
    }).catch((err) => {
      let errMsg = Utils.getErrorMsg(err, true);
      if (!err.response || err.response.status !== 403) {
        toaster.danger(errMsg);
      }
      this.setState({
        isFileLoading: false,
        isFileLoadedErr: true,
      });
    });

    if (noRedirection) return;

    // update location
    let repoInfo = this.state.currentRepoInfo;
    let url = siteRoot + 'library/' + repoID + '/' + encodeURIComponent(repoInfo.repo_name) + Utils.encodePath(filePath);
    window.history.pushState({ url: url, path: filePath }, filePath, url);
  };

  showFileMetadata = (filePath, viewId) => {
    const repoID = this.props.repoID;
    const repoInfo = this.state.currentRepoInfo;

    this.setState({
      path: filePath,
      isViewFile: true,
      isFileLoading: false,
      isFileLoadedErr: false,
      content: '__sf-metadata',
      viewId: viewId,
      isDirentDetailShow: false
    });

    const url = `${siteRoot}library/${repoID}/${encodeURIComponent(repoInfo.repo_name)}/?view=${encodeURIComponent(viewId)}`;
    window.history.pushState({ url: url, path: '' }, '', url);
  };

  hideFileMetadata = () => {
    this.setState({
      path: '',
      isViewFile: false,
      isFileLoading: false,
      isFileLoadedErr: false,
      content: '',
      viewId: '',
      isDirentDetailShow: false
    });
  };

  loadDirentList = (path) => {
    let repoID = this.props.repoID;
    seafileAPI.listDir(repoID, path, { 'with_thumbnail': true }).then(res => {
      let direntList = [];
      res.data.dirent_list.forEach(item => {
        let dirent = new Dirent(item);
        direntList.push(dirent);
      });

      this.setState({
        pathExist: true,
        userPerm: res.data.user_perm,
        isDirentListLoading: false,
        direntList: Utils.sortDirents(direntList, this.state.sortBy, this.state.sortOrder),
        dirID: res.data.dir_id,
        path: path,
        isSessionExpired: false,
      });

      if (!this.state.repoEncrypted && direntList.length) {
        this.getThumbnails(repoID, path, this.state.direntList);
      }

      if (this.state.currentRepoInfo.is_admin) {
        if (this.foldersSharedOut) {
          this.identifyFoldersSharedOut();
        } else {
          this.foldersSharedOut = [];
          seafileAPI.getAllRepoFolderShareInfo(repoID).then(res => {
            res.data.share_info_list.forEach(item => {
              if (this.foldersSharedOut.indexOf(item.path) === -1) {
                this.foldersSharedOut.push(item.path);
              }
            });
            this.identifyFoldersSharedOut();
          });
        }
      }
    }).catch((err) => {
      Utils.getErrorMsg(err, true);
      if (err.response && err.response.status === 403) {
        this.setState({ isDirentListLoading: false });
        return;
      }
      this.setState({
        isDirentListLoading: false,
        pathExist: false,
      });
    });
  };

  identifyFoldersSharedOut = () => {
    const { path, direntList } = this.state;
    if (this.foldersSharedOut.length == 0) {
      return;
    }
    direntList.forEach(dirent => {
      if (dirent.type == 'dir' && this.foldersSharedOut.indexOf(Utils.joinPath(path, dirent.name) + '/') !== -1) {
        dirent.has_been_shared_out = true;
      }
    });
    this.setState({
      direntList: direntList
    });
  };

  onListContainerScroll = () => {
    let itemsShowLength = this.state.itemsShowLength + 100;
    this.setState({ itemsShowLength: itemsShowLength });
  };

  resetShowLength = () => {
    this.setState({ itemsShowLength: 100 });
  };

  shouldDisplayThumbnail = (item) => {
    return ((Utils.imageCheck(item.name) || (enableVideoThumbnail && Utils.videoCheck(item.name)) || (enablePDFThumbnail && Utils.pdfCheck(item.name))) && !item.encoded_thumbnail_src);
  };

  getThumbnails = (repoID, path, direntList) => {
    let items = direntList.filter((item) => this.shouldDisplayThumbnail(item));
    if (items.length == 0) {
      return ;
    }
    const _this = this;
    const len = items.length;
    let getThumbnail = (i) => {
      const curItem = items[i];
      const curItemPath = [path, curItem.name].join('/');
      seafileAPI.createThumbnail(repoID, curItemPath, thumbnailDefaultSize).then((res) => {
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
  };

  updateMoveCopyTreeNode = (path) => {
    let repoID = this.props.repoID;

    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(path);

    // for node not loaded, such as a deep folder '/vv/aa'
    if (!node) { // node: null
      return false;
    }

    let nodeChildren = node.children.map(item => item.object);
    let nodeChildrenNames = nodeChildren.map(item => item.name);

    seafileAPI.listDir(repoID, path).then(res => {
      let newDirentList = res.data.dirent_list;
      let newAddedDirents = newDirentList.filter(item => {
        return !nodeChildrenNames.includes(item.name);
      });
      newAddedDirents.forEach(item => {
        this.addNodeToTree(item.name, path, item.type);
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  async getAsyncCopyMoveProgress() {
    let { asyncOperationType, asyncCopyMoveTaskId } = this.state;
    try {
      let res = await seafileAPI.queryAsyncOperationProgress(asyncCopyMoveTaskId);
      let data = res.data;
      if (data.failed) {
        let message = gettext('Failed to move files to another library.');
        if (asyncOperationType === 'copy') {
          message = gettext('Failed to copy files to another library.');
        }
        toaster.danger(message);
        this.setState({
          asyncOperationProgress: 0,
          isCopyMoveProgressDialogShow: false,
        });
        return;
      }

      if (data.successful) {
        if (asyncOperationType === 'move') {
          if (this.currentMoveItemName && this.currentMoveItemPath) {
            if (this.state.isTreePanelShown) {
              this.deleteTreeNode(this.currentMoveItemPath);
            }
            this.moveDirent(this.currentMoveItemName);
            this.currentMoveItemName = '';
            this.currentMoveItemPath = '';
          } else {
            if (this.state.isTreePanelShown) {
              let direntPaths = this.getSelectedDirentPaths();
              this.deleteTreeNodes(direntPaths);
            }
            let direntNames = this.getSelectedDirentNames();
            this.moveDirents(direntNames);
          }
        }

        this.setState({ isCopyMoveProgressDialogShow: false });
        let message = gettext('Successfully moved files to another library.');
        if (asyncOperationType === 'copy') {
          message = gettext('Successfully copied files to another library.');
        }
        toaster.success(message);
        return;
      }
      // init state: total is 0
      let asyncOperationProgress = !data.total ? 0 : parseInt((data.done / data.total * 100).toFixed(2));

      this.getAsyncCopyMoveProgress();
      this.setState({ asyncOperationProgress: asyncOperationProgress });
    } catch (error) {
      this.setState({
        asyncOperationProgress: 0,
        isCopyMoveProgressDialogShow: false,
      });
    }
  }

  cancelCopyMoveDirent = () => {
    let taskId = this.state.asyncCopyMoveTaskId;
    seafileAPI.cancelCopyMoveOperation(taskId);

    this.currentMoveItemName = '';
    this.currentMoveItemPath = '';
    let direntList = this.state.direntList;
    this.setState({ direntList: direntList.slice(0) });
  };

  onMoveProgressDialogToggle = () => {
    let { asyncOperationProgress } = this.state;
    if (asyncOperationProgress !== 100) {
      this.cancelCopyMoveDirent();
    }

    this.setState({
      asyncOperationProgress: 0,
      isCopyMoveProgressDialogShow: false,
    });
  };

  updateRecentlyUsedRepos = (repo, destPath) => {
    const recentlyUsed = JSON.parse(localStorage.getItem('recently-used-list')) || [];
    const updatedRecentlyUsed = [{ repo: repo, path: destPath }, ...recentlyUsed.filter(item => item.path !== destPath)];

    const seen = new Set();
    const filteredRecentlyUsed = updatedRecentlyUsed.filter(item => {
      if (seen.has(item.path)) {
        return false;
      } else {
        seen.add(item.path);
        return true;
      }
    });

    if (filteredRecentlyUsed.length > 10) {
      updatedRecentlyUsed.pop(); // Limit to 10 recent directories
    }

    localStorage.setItem('recently-used-list', JSON.stringify(filteredRecentlyUsed));
  };

  // toolbar operations
  onMoveItems = (destRepo, destDirentPath) => {
    let repoID = this.props.repoID;
    let selectedDirentList = this.state.selectedDirentList;

    let dirNames = this.getSelectedDirentNames();
    let direntPaths = this.getSelectedDirentPaths();

    seafileAPI.moveDir(repoID, destRepo.repo_id, destDirentPath, this.state.path, dirNames).then(res => {
      if (repoID !== destRepo.repo_id) {
        this.setState({
          asyncCopyMoveTaskId: res.data.task_id,
          asyncOperatedFilesLength: selectedDirentList.length,
          asyncOperationProgress: 0,
          asyncOperationType: 'move',
          isCopyMoveProgressDialogShow: true
        }, () => {
          // After moving successfully, delete related files
          this.getAsyncCopyMoveProgress();
        });
      }

      if (repoID === destRepo.repo_id) {
        if (this.state.isTreePanelShown) {
          this.deleteTreeNodes(direntPaths);
        }

        this.moveDirents(dirNames);

        // 2. tow columns mode need update left tree
        if (this.state.isTreePanelShown) {
          this.updateMoveCopyTreeNode(destDirentPath);
        }

        // show tip message if move to current repo
        let message = Utils.getMoveSuccessMessage(dirNames);
        toaster.success(message);
      }

      this.updateRecentlyUsedRepos(destRepo, destDirentPath);

    }).catch((error) => {
      if (!error.response.data.lib_need_decrypt) {
        let errMessage = Utils.getErrorMsg(error);
        if (errMessage === gettext('Error')) {
          errMessage = Utils.getCopyFailedMessage(dirNames);
        }
        toaster.danger(errMessage);
      } else {
        this.setState({
          libNeedDecryptWhenMove: true,
          destRepoWhenCopyMove: destRepo,
          destDirentPathWhenCopyMove: destDirentPath,
        });
      }
    });
  };

  onCopyItems = (destRepo, destDirentPath) => {
    let repoID = this.props.repoID;
    let selectedDirentList = this.state.selectedDirentList;

    let dirNames = this.getSelectedDirentNames();
    seafileAPI.copyDir(repoID, destRepo.repo_id, destDirentPath, this.state.path, dirNames).then(res => {
      if (repoID !== destRepo.repo_id) {
        this.setState({
          asyncCopyMoveTaskId: res.data.task_id,
          asyncOperatedFilesLength: selectedDirentList.length,
          asyncOperationProgress: 0,
          asyncOperationType: 'copy',
          isCopyMoveProgressDialogShow: true
        }, () => {
          this.getAsyncCopyMoveProgress();
        });
      }

      if (repoID === destRepo.repo_id) {
        if (this.state.isTreePanelShown) {
          this.updateMoveCopyTreeNode(destDirentPath);
        }

        if (destDirentPath === this.state.path) {
          this.loadDirentList(this.state.path);
        }

        // show tip message if copy to current repo
        let message = Utils.getCopySuccessfulMessage(dirNames);
        toaster.success(message);
      }
    }).catch((error) => {
      if (!error.response.data.lib_need_decrypt) {
        let errMessage = Utils.getErrorMsg(error);
        if (errMessage === gettext('Error')) {
          errMessage = Utils.getCopyFailedMessage(dirNames);
        }
        toaster.danger(errMessage);
      } else {
        this.setState({
          libNeedDecryptWhenCopy: true,
          destRepoWhenCopyMove: destRepo,
          destDirentPathWhenCopyMove: destDirentPath,
        });
      }
    });
  };

  restoreDeletedDirents = (commitID, paths, e) => {
    const { repoID } = this.props;
    e.preventDefault();
    toaster.closeAll();
    seafileAPI.restoreDirents(repoID, commitID, paths).then(res => {
      const { success, failed } = res.data;
      success.forEach(dirent => {
        let name = Utils.getFileName(dirent.path);
        let parentPath = Utils.getDirName(dirent.path);
        if (!dirent.is_dir) {
          if (this.state.isTreePanelShown) {
            this.addNodeToTree(name, parentPath, 'file');
          }
          if (parentPath === this.state.path && !this.state.isViewFile) {
            this.addDirent(name, 'file');
            if (Utils.imageCheck(name)) {
              this.props.eventBus.dispatch(EVENT_BUS_TYPE.RESTORE_IMAGE);
            }
          }
        } else {
          if (this.state.isTreePanelShown) {
            this.addNodeToTree(name, parentPath, 'dir');
          }
          if (parentPath === this.state.path && !this.state.isViewFile) {
            this.addDirent(name, 'dir');
          }
        }
      });

      if (success.length) {
        let msg = success.length > 1 ? gettext('Restored {name} and {n} other items') :
          gettext('Restored {name}');
        msg = msg.replace('{name}', success[0].path.split('/').pop())
          .replace('{n}', success.length - 1);
        toaster.success(msg);
      }

      if (failed.length) {
        let msg = failed.length > 1 ? gettext('Failed to restore {name} and {n} other items') :
          gettext('Failed to restore {name}');
        msg = msg.replace('{name}', failed[0].path.split('/').pop())
          .replace('{n}', failed.length - 1);
        toaster.danger(msg);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onDeleteItems = () => {
    let repoID = this.props.repoID;
    let direntPaths = this.getSelectedDirentPaths();
    let dirNames = this.getSelectedDirentNames();

    this.setState({ updateDetail: !this.state.updateDetail });
    seafileAPI.deleteMutipleDirents(repoID, this.state.path, dirNames).then(res => {
      if (this.state.isTreePanelShown) {
        this.deleteTreeNodes(direntPaths);
      }

      this.deleteDirents(dirNames);

      let msg = '';
      if (direntPaths.length > 1) {
        msg = gettext('Successfully deleted {name} and {n} other items.');
        msg = msg.replace('{name}', dirNames[0]);
        msg = msg.replace('{n}', dirNames.length - 1);
      } else {
        msg = gettext('Successfully deleted {name}.');
        msg = msg.replace('{name}', dirNames[0]);
      }
      const successTipWithUndo = (
        <>
          <span>{msg}</span>
          <a className="action-link p-0 ml-1" href="#" onClick={this.restoreDeletedDirents.bind(this, res.data.commit_id, direntPaths)}>{gettext('Undo')}</a>
        </>
      );
      toaster.success(successTipWithUndo, { duration: 5 });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        errMessage = gettext('Failed to delete {name} and {n} other items.');
        errMessage = errMessage.replace('{name}', dirNames[0]);
        errMessage = errMessage.replace('{n}', dirNames.length - 1);
      }
      toaster.danger(errMessage);
    });
  };

  onAddFolder = (dirPath) => {
    let repoID = this.props.repoID;
    seafileAPI.createDir(repoID, dirPath).then(() => {
      let name = Utils.getFileName(dirPath);
      let parentPath = Utils.getDirName(dirPath);

      if (this.state.isTreePanelShown) {
        this.addNodeToTree(name, parentPath, 'dir');
      }

      if (parentPath === this.state.path && !this.state.isViewFile) {
        this.addDirent(name, 'dir');
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onAddFile = (filePath) => {
    let repoID = this.props.repoID;
    seafileAPI.createFile(repoID, filePath).then(res => {
      let name = Utils.getFileName(filePath);
      let parentPath = Utils.getDirName(filePath);
      if (this.state.isTreePanelShown) {
        this.addNodeToTree(name, parentPath, 'file');
      }
      if (parentPath === this.state.path && !this.state.isViewFile) {
        this.addDirent(name, 'file', res.data.size);
      }
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

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
    if (this.state.isTreePanelShown && this.state.isViewFile) {
      path = Utils.getDirName(path);
      this.setState({
        path: path,
        isViewFile: false,
      });
      let repoInfo = this.state.currentRepoInfo;

      let url = siteRoot + 'library/' + repoInfo.repo_id + '/' + encodeURIComponent(repoInfo.repo_name) + Utils.encodePath(path);
      window.history.pushState({ url: url, path: path }, path, url);
    }

    if (this.state.isTreePanelShown) {
      this.loadSidePanel(this.state.path);
    }
    this.isNeedUpdateHistoryState = false;
    this.setState({ currentMode: mode });
    this.showDir(path);
  };

  onSearchedClick = (item) => {
    if (item.repo_id !== this.props.repoID) {
      this.openSearchedNewTab(item);
    }
    let path = item.is_dir ? item.path.slice(0, item.path.length - 1) : item.path;
    if (this.state.currentPath === path) {
      return;
    }
    if (this.state.isTreePanelShown) {
      // load sidePanel
      let index = -1;
      let paths = Utils.getPaths(path);
      for (let i = 0; i < paths.length; i++) {
        // eslint-disable-next-line
        let node = this.state.treeData.getNodeByPath(node);
        if (!node) {
          index = i;
          break;
        }
      }
      if (index === -1) { // all the data has been loaded already.
        let node = this.state.treeData.getNodeByPath(path);
        this.setState({ currentNode: node });
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
          this.openSearchedNewTab(item);
        }
      }
    } else {
      if (item.is_dir) {
        this.showDir(path);
      } else {
        this.openSearchedNewTab(item);
      }
    }
  };

  openSearchedNewTab = (item) => {
    let path = item.is_dir ? item.path.slice(0, item.path.length - 1) : item.path;
    let url = siteRoot + 'lib/' + item.repo_id + '/file' + Utils.encodePath(path);
    let isWeChat = Utils.isWeChat();
    if (!isWeChat) {
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    } else {
      location.href = url;
    }
  };

  onMainNavBarClick = (nodePath) => {
    // just for dir
    this.resetSelected();
    if (this.state.isTreePanelShown) {
      let tree = this.state.treeData.clone();
      let node = tree.getNodeByPath(nodePath);
      tree.expandNode(node);
      this.setState({ treeData: tree, currentNode: node });
    }

    this.showDir(nodePath);
  };

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
  };

  // list&tree operations
  onMainPanelItemRename = (dirent, newName) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    this.renameItem(path, dirent.isDir(), newName);
  };

  onMainPanelItemDelete = (dirent) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    this.deleteItem(path, dirent.isDir());
  };

  onRenameTreeNode = (node, newName) => {
    this.renameItem(node.path, node.object.isDir(), newName);
  };

  onDeleteTreeNode = (node) => {
    this.deleteItem(node.path, node.object.isDir());
  };

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
        let errMessage = '';
        if (error.response.status == 403 && error.response.data && error.response.data['error_msg']) {
          errMessage = error.response.data['error_msg'];
        } else {
          errMessage = Utils.getErrorMsg(error);
        }
        if (errMessage === gettext('Error')) {
          let name = Utils.getFileName(path);
          errMessage = gettext('Renaming {name} failed').replace('{name}', name);
        }
        toaster.danger(errMessage);
      });
    }
  };

  renameItemAjaxCallback(path, newName) {
    if (this.state.isTreePanelShown) {
      this.renameTreeNode(path, newName);
    }
    this.renameDirent(path, newName);
  }

  toggleDeleteFolderDialog = () => {
    this.setState({ isDeleteFolderDialogOpen: !this.state.isDeleteFolderDialogOpen });
  };

  deleteFolder = () => {
    const { repoID } = this.props;
    const { folderToDelete: path } = this.state;
    seafileAPI.deleteDir(repoID, path).then((res) => {
      this.deleteItemAjaxCallback(path, true);
      let name = Utils.getFileName(path);
      var msg = gettext('Successfully deleted {name}').replace('{name}', name);
      const successTipWithUndo = (
        <>
          <span>{msg}</span>
          <a className="action-link p-0 ml-1" href="#" onClick={this.restoreDeletedDirents.bind(this, res.data.commit_id, [path])}>{gettext('Undo')}</a>
        </>
      );
      toaster.success(successTipWithUndo, { duration: 5 });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        let name = Utils.getFileName(path);
        errMessage = gettext('Failed to delete {name}').replace('{name}', name);
      }
      toaster.danger(errMessage);
    });
  };

  deleteItem(path, isDir) {
    let repoID = this.props.repoID;
    if (isDir) {
      this.setState({ folderToDelete: path }, () => {
        this.toggleDeleteFolderDialog();
      });
    } else {
      seafileAPI.deleteFile(repoID, path).then((res) => {
        this.deleteItemAjaxCallback(path, isDir);
        let name = Utils.getFileName(path);
        var msg = gettext('Successfully deleted {name}').replace('{name}', name);
        const successTipWithUndo = (
          <>
            <span>{msg}</span>
            <a className="action-link p-0 ml-1" href="#" onClick={this.restoreDeletedDirents.bind(this, res.data.commit_id, [path])}>{gettext('Undo')}</a>
          </>
        );
        toaster.success(successTipWithUndo, { duration: 5 });
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
    if (this.state.isTreePanelShown) {
      this.deleteTreeNode(path);
    }
    this.deleteDirent(path);
  }

  // list operations
  onMoveItem = (destRepo, dirent, moveToDirentPath, nodeParentPath) => {
    let repoID = this.props.repoID;
    // just for view list state
    let dirName = dirent.name;
    if (!nodeParentPath) {
      nodeParentPath = this.state.path;
    }
    let direntPath = Utils.joinPath(nodeParentPath, dirName);

    seafileAPI.moveDir(repoID, destRepo.repo_id, moveToDirentPath, nodeParentPath, dirName).then(res => {
      if (repoID !== destRepo.repo_id) {
        this.setState({
          asyncCopyMoveTaskId: res.data.task_id,
          asyncOperatedFilesLength: 1,
          asyncOperationProgress: 0,
          asyncOperationType: 'move',
          isCopyMoveProgressDialogShow: true,
        }, () => {
          this.currentMoveItemName = dirName;
          this.currentMoveItemPath = direntPath;
          this.getAsyncCopyMoveProgress(dirName, direntPath);
        });
      }

      if (this.state.isTreePanelShown) {
        this.deleteTreeNode(direntPath);
      }

      // 1. move to current repo
      // 2. tow columns mode need update left tree
      if (repoID === destRepo.repo_id &&
    this.state.isTreePanelShown) {
        this.updateMoveCopyTreeNode(moveToDirentPath);
      }

      this.moveDirent(direntPath, moveToDirentPath);

      // show tip message if move to current repo
      if (repoID === destRepo.repo_id) {
        let message = gettext('Successfully moved {name}.');
        message = message.replace('{name}', dirName);
        toaster.success(message);
      }

      this.updateRecentlyUsedRepos(destRepo, moveToDirentPath);

    }).catch((error) => {
      if (!error.response.data.lib_need_decrypt) {
        let errMessage = Utils.getErrorMsg(error);
        if (errMessage === gettext('Error')) {
          errMessage = gettext('Failed to move {name}.');
          errMessage = errMessage.replace('{name}', dirName);
        }
        toaster.danger(errMessage);
      } else {
        this.setState({
          libNeedDecryptWhenMove: true,
          destRepoWhenCopyMove: destRepo,
          destDirentPathWhenCopyMove: moveToDirentPath,
          copyMoveSingleItem: true,
          srcDirentWhenCopyMove: dirent,
          srcNodeParentPathWhenCopyMove: nodeParentPath,
        });
      }
    });
  };

  onCopyItem = (destRepo, dirent, copyToDirentPath, nodeParentPath) => {
    let repoID = this.props.repoID;
    // just for view list state
    let dirName = dirent.name;
    if (!nodeParentPath) {
      nodeParentPath = this.state.path;
    }

    seafileAPI.copyDir(repoID, destRepo.repo_id, copyToDirentPath, nodeParentPath, dirName).then(res => {

      if (repoID !== destRepo.repo_id) {
        this.setState({
          asyncCopyMoveTaskId: res.data.task_id,
          asyncOperatedFilesLength: 1,
          asyncOperationProgress: 0,
          asyncOperationType: 'copy',
          isCopyMoveProgressDialogShow: true
        }, () => {
          this.getAsyncCopyMoveProgress();
        });
      }

      if (repoID === destRepo.repo_id) {
        if (this.state.isTreePanelShown) {
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
      if (!error.response.data.lib_need_decrypt) {
        let errMessage = Utils.getErrorMsg(error);
        if (errMessage === gettext('Error')) {
          errMessage = gettext('Failed to copy %(name)s');
          errMessage = errMessage.replace('%(name)s', dirName);
        }
        toaster.danger(errMessage);
      } else {
        this.setState({
          libNeedDecryptWhenCopy: true,
          destRepoWhenCopyMove: destRepo,
          destDirentPathWhenCopyMove: copyToDirentPath,
          copyMoveSingleItem: true,
          srcDirentWhenCopyMove: dirent,
          srcNodeParentPathWhenCopyMove: nodeParentPath,
        });
      }
    });
  };

  onConvertItem = (dirent, dstType) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    let repoID = this.props.repoID;
    toaster.notifyInProgress(gettext('Converting, please wait...'), { 'id': 'conversion' });
    seafileAPI.convertFile(repoID, path, dstType).then((res) => {
      let newFileName = res.data.obj_name;
      let parentDir = res.data.parent_dir;
      let new_path = parentDir + '/' + newFileName;
      let parentPath = Utils.getDirName(new_path);

      if (this.state.isTreePanelShown) {
        this.addNodeToTree(newFileName, parentPath, 'file');
      }

      this.addDirent(newFileName, 'file', res.data.size);
      let message = gettext('Successfully converted the file.');
      toaster.success(message, { 'id': 'conversion' });

    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        let name = Utils.getFileName(path);
        errMessage = gettext('Failed to convert {name}.').replace('{name}', name);
      }
      toaster.danger(errMessage, { 'id': 'conversion' });
    });

  };

  onDirentClick = (clickedDirent, event) => {
    const { direntList, selectedDirentList, lastSelectedIndex } = this.state;
    if (clickedDirent) {
      const clickedIndex = direntList.findIndex(dirent => dirent.name === clickedDirent.name);

      let newSelectedDirentList = [...selectedDirentList];
      const isCtrlOrMetaKeyPressed = event && (event.ctrlKey || event.metaKey);
      const isShiftKeyPressed = event && event.shiftKey;

      if (isCtrlOrMetaKeyPressed) {
        // Ctrl (Cmd on Mac) key is pressed: Toggle selection of the clicked item
        const isSelected = newSelectedDirentList.some(dirent => dirent.name === clickedDirent.name);
        if (isSelected) {
          newSelectedDirentList = newSelectedDirentList.filter(dirent => dirent.name !== clickedDirent.name);
        } else {
          newSelectedDirentList.push(clickedDirent);
        }
      } else if (isShiftKeyPressed && lastSelectedIndex !== null) {
        // Shift key is pressed: Select or unselect items based on the clicked index
        const firstSelectedIndex = direntList.findIndex(dirent => dirent.name === newSelectedDirentList[0].name);
        if (clickedIndex < firstSelectedIndex) {
          // Selected all the items between the clicked item and the first selected item
          const rangeSelectedDirents = direntList.slice(clickedIndex, firstSelectedIndex + 1);
          const rangeSelectedNames = new Set(rangeSelectedDirents.map(dirent => dirent.name));
          newSelectedDirentList = [
            ...newSelectedDirentList.filter(dirent => rangeSelectedNames.has(dirent.name)),
            ...rangeSelectedDirents
          ];
        } else if (clickedIndex >= firstSelectedIndex && clickedIndex < lastSelectedIndex) {
          // Unselect items between clicked item and the last selected item
          const rangeSelectedDirents = direntList.slice(firstSelectedIndex, clickedIndex + 1);
          const rangeSelectedNames = new Set(rangeSelectedDirents.map(dirent => dirent.name));
          newSelectedDirentList = newSelectedDirentList.filter(dirent => rangeSelectedNames.has(dirent.name));
        } else {
          // Select all items between the first selected and the clicked item
          const rangeStart = Math.min(firstSelectedIndex, clickedIndex);
          const rangeEnd = Math.max(firstSelectedIndex, clickedIndex);
          const rangeSelectedDirents = direntList.slice(rangeStart, rangeEnd + 1);

          // Merge the new range selection with the existing selection
          const rangeSelectedNames = new Set(rangeSelectedDirents.map(dirent => dirent.name));
          newSelectedDirentList = [
            ...newSelectedDirentList.filter(dirent => !rangeSelectedNames.has(dirent.name)),
            ...rangeSelectedDirents
          ];
        }
      } else {
        newSelectedDirentList = [clickedDirent];
      }

      this.setState({
        direntList: direntList.map(dirent => {
          dirent.isSelected = newSelectedDirentList.some(selectedDirent => selectedDirent.name === dirent.name);
          return dirent;
        }),
        isDirentSelected: newSelectedDirentList.length > 0,
        isAllDirentSelected: newSelectedDirentList.length === direntList.length,
        selectedDirentList: newSelectedDirentList,
        lastSelectedIndex: clickedIndex,
      });
    } else {
      this.setState({
        direntList: direntList.map(dirent => {
          dirent.isSelected = false;
          return dirent;
        }),
        isDirentSelected: false,
        isAllDirentSelected: false,
        selectedDirentList: [],
        lastSelectedIndex: null,
      });
    }
  };

  onSelectedDirentListUpdate = (newSelectedDirentList, lastSelectedIndex = null) => {
    this.setState({
      direntList: this.state.direntList.map(dirent => {
        dirent.isSelected = newSelectedDirentList.some(selectedDirent => selectedDirent.name === dirent.name);
        return dirent;
      }),
      isDirentSelected: newSelectedDirentList.length > 0,
      selectedDirentList: newSelectedDirentList,
      lastSelectedIndex: lastSelectedIndex,
    });
  };

  onItemClick = (dirent) => {
    this.resetSelected();
    let repoID = this.props.repoID;
    let direntPath = Utils.joinPath(this.state.path, dirent.name);
    if (dirent.isDir()) { // is dir
      if (this.state.isTreePanelShown) {
        this.loadTreeNodeByPath(direntPath);
      }
      this.showDir(direntPath);
    } else { // is file
      if (this.state.isTreePanelShown && Utils.isMarkdownFile(direntPath)) {
        this.setState({ currentDirent: dirent });
        this.showColumnMarkdownFile(direntPath);
      } else {
        let url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(direntPath);
        if (dirent.is_sdoc_revision && dirent.revision_id) {
          url = siteRoot + 'lib/' + repoID + '/revisions/' + dirent.revision_id + '/';
        }

        let isWeChat = Utils.isWeChat();
        if (!isWeChat) {
          window.open(url);
        } else {
          location.href = url;
        }
      }
    }
  };

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
      this.setState({ isDirentSelected: true });
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
  };

  onAllDirentSelected = () => {
    this.setState(prevState => {
      const isAllDirentSelected = !prevState.isAllDirentSelected;
      const direntList = prevState.direntList.map(item => {
        item.isSelected = isAllDirentSelected;
        return item;
      });

      return {
        isDirentSelected: isAllDirentSelected,
        isAllDirentSelected: isAllDirentSelected,
        direntList: direntList,
        selectedDirentList: isAllDirentSelected ? [...direntList] : []
      };
    });
  };

  onFileTagChanged = (dirent, direntPath) => {
    let repoID = this.props.repoID;
    seafileAPI.listFileTags(repoID, direntPath).then(res => {
      let fileTags = res.data.file_tags.map(item => {
        return new FileTag(item);
      });

      if (this.state.isViewFile) {
        this.setState({ fileTags: fileTags });
      } else {
        this.updateDirent(dirent, 'file_tags', fileTags);
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });

    this.updateUsedRepoTags();
  };

  onFileUploadSuccess = (direntObject) => {
    const isExist = this.state.direntList.some(item => item.name === direntObject.name && item.type === direntObject.type);

    if (isExist) {
      const updatedDirentList = this.state.direntList.map(dirent => {
        if (dirent.name === direntObject.name && dirent.type === direntObject.type) {
          const mtime = moment.unix(direntObject.mtime).fromNow();

          return this.updateDirent(dirent, 'mtime', mtime); // Note: Consider updating file size here as well
        }
        return dirent;
      });

      this.setState({ direntList: updatedDirentList });
    } else {
      // use current dirent parent's permission as it's permission
      direntObject.permission = this.state.userPerm;
      const dirent = new Dirent(direntObject);

      this.setState(prevState => ({
        direntList: direntObject.type === 'dir' ? [dirent, ...prevState.direntList] : [...prevState.direntList, dirent]
      }));

      if (this.state.isTreePanelShown) {
        this.addNodeToTree(dirent.name, this.state.path, dirent.type);
      }

      if (direntObject.type !== 'dir') {
        this.loadDirentList(this.state.path);
      }
    }
  };

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
    this.setState({ direntList: direntList });
  };

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
      window.history.replaceState({ url: url, path: newDirentPath }, newDirentPath, url);
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

      let repoInfo = this.state.currentRepoInfo;
      let url = siteRoot + 'library/' + repoID + '/' + encodeURIComponent(repoInfo.repo_name) + newPath;
      window.history.replaceState({ url: url, path: newPath }, newPath, url);
    }
  };

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
      this.recalculateSelectedDirents([name], direntList);
      this.setState({ direntList: direntList });
    } else if (Utils.isAncestorPath(direntPath, this.state.path)) {
      // the deleted item is ancester of the current item
      let parentPath = Utils.getDirName(direntPath);
      this.showDir(parentPath);
    }
    // else do nothing
  }

  // only one scence: The deleted items are inside current path
  deleteDirents = (direntNames) => {
    let direntList = this.state.direntList.filter(item => {
      return direntNames.indexOf(item.name) === -1;
    });
    this.recalculateSelectedDirents(direntNames, direntList);
    this.setState({ direntList: direntList });
  };

  moveDirent = (direntPath, moveToDirentPath = null) => {
    let name = Utils.getFileName(direntPath);
    if (moveToDirentPath === this.state.path) {
      this.loadDirentList(this.state.path);
      return;
    }
    let direntList = this.state.direntList.filter(item => {
      return item.name !== name;
    });
    this.recalculateSelectedDirents([name], direntList);
    this.setState({ direntList: direntList });
  };

  // only one scence: The moved items are inside current path
  moveDirents = (direntNames) => {
    let direntList = this.state.direntList.filter(item => {
      return direntNames.indexOf(item.name) === -1;
    });
    this.recalculateSelectedDirents(direntNames, direntList);
    this.setState({
      direntList: direntList,
      selectedDirentList: [],
      isDirentSelected: false,
      isAllDirentSelected: false,
    });
  };

  updateDirent = (dirent, paramKey, paramValue) => {
    let newDirentList = this.state.direntList.map(item => {
      if (item.name === dirent.name) {
        item[paramKey] = paramValue;
      }
      return item;
    });
    this.setState({ direntList: newDirentList });
  };

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
      this.setState({ treeData: tree, currentNode: node }); // tree
    }
  };

  loadNodeAndParentsByPath = (path) => {
    let repoID = this.props.repoID;
    let tree = this.state.treeData.clone();
    if (Utils.isMarkdownFile(path)) {
      path = Utils.getDirName(path);
    }
    seafileAPI.listDir(repoID, path, { with_parents: true }).then(res => {
      const { dirent_list: direntList, user_perm } = res.data;
      let results = {};
      for (let i = 0; i < direntList.length; i++) {
        let object = direntList[i];
        let parentDir = object.parent_dir;
        let key = parentDir === '/' ? '/' : parentDir.slice(0, parentDir.length - 1);
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
        treeData: tree,
        userPerm: user_perm,
      });
    }).catch(() => {
      this.setState({ isLoadFailed: true });
    });
  };

  onTreeNodeClick = (node) => {
    this.resetSelected();
    let repoID = this.props.repoID;

    if (!this.state.pathExist) {
      this.setState({ pathExist: true });
    }

    if (node.object.isDir()) {
      let isLoaded = node.isLoaded;
      if (!node.isLoaded) {
        let tree = this.state.treeData.clone();
        node = tree.getNodeByPath(node.path);
        seafileAPI.listDir(repoID, node.path).then(res => {
          this.addResponseListToNode(res.data.dirent_list, node);
          tree.collapseNode(node);
          this.setState({ treeData: tree });
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
      if (isLoaded && node.path === this.state.path) {
        if (node.isExpanded) {
          let tree = treeHelper.collapseNode(this.state.treeData, node);
          this.setState({ treeData: tree });
        } else {
          let tree = this.state.treeData.clone();
          node = tree.getNodeByPath(node.path);
          tree.expandNode(node);
          this.setState({ treeData: tree });
        }
      }
    }

    if (node.path === this.state.path) {
      return;
    }

    if (node.object.isDir()) { // isDir
      if (this.state.path.includes(PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES)) {
        this.isNeedUpdateHistoryState = true;
      }
      this.showDir(node.path);
    } else {
      if (Utils.isMarkdownFile(node.path)) {
        if (node.path !== this.state.path) {
          this.showColumnMarkdownFile(node.path);
        }
      } else if (Utils.isFileMetadata(node?.object?.type)) {
        if (node.path !== this.state.path) {
          this.showFileMetadata(node.path, node.view_id || '0000');
        }
      } else {
        let url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(node.path);
        let dirent = node.object;
        if (dirent.is_sdoc_revision && dirent.revision_id) {
          url = siteRoot + 'lib/' + repoID + '/revisions/' + dirent.revision_id + '/';
        }
        window.open(url);
      }
    }
  };

  showColumnMarkdownFile = (filePath) => {
    let repoID = this.props.repoID;
    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      if (res.data.size === 0) {
        // loading of asynchronously obtained data may be blocked
        const w = window.open('about:blank');
        const url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(filePath);
        w.location.href = url;
      } else {
        this.showFile(filePath, true);
      }
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onCloseMarkdownViewDialog = () => {
    this.setState({
      isViewFile: false,
      path: '/'
    });
  };

  onTreeNodeCollapse = (node) => {
    let tree = treeHelper.collapseNode(this.state.treeData, node);
    this.setState({ treeData: tree });
  };

  onTreeNodeExpanded = (node) => {
    let repoID = this.props.repoID;
    let tree = this.state.treeData.clone();
    node = tree.getNodeByPath(node.path);
    if (!node.isLoaded) {
      seafileAPI.listDir(repoID, node.path).then(res => {
        this.addResponseListToNode(res.data.dirent_list, node);
        this.setState({ treeData: tree });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    } else {
      tree.expandNode(node);
      this.setState({ treeData: tree });
    }
  };

  addNodeToTree = (name, parentPath, type) => {
    let node = this.createTreeNode(name, type);
    let tree = treeHelper.addNodeToParentByPath(this.state.treeData, node, parentPath);
    this.setState({ treeData: tree });
  };

  renameTreeNode = (path, newName) => {
    let tree = treeHelper.renameNodeByPath(this.state.treeData, path, newName);
    this.setState({ treeData: tree });
  };

  deleteTreeNode = (path) => {
    let tree = treeHelper.deleteNodeByPath(this.state.treeData, path);
    this.setState({ treeData: tree });
  };

  deleteTreeNodes = (paths) => {
    let tree = treeHelper.deleteNodeListByPaths(this.state.treeData, paths);
    this.setState({ treeData: tree });
  };

  moveTreeNode = (nodePath, moveToPath, moveToRepo, nodeName) => {
    let repoID = this.props.repoID;
    if (repoID !== moveToRepo.repo_id) {
      let tree = treeHelper.deleteNodeByPath(this.state.treeData, nodePath);
      this.setState({ treeData: tree });
      return;
    }
    let tree = treeHelper.moveNodeByPath(this.state.treeData, nodePath, moveToPath, nodeName);
    this.setState({ treeData: tree });
  };

  copyTreeNode = (nodePath, copyToPath, destRepo, nodeName) => {
    let repoID = this.props.repoID;
    if (repoID !== destRepo.repo_id) {
      return;
    }
    let tree = treeHelper.copyNodeByPath(this.state.treeData, nodePath, copyToPath, nodeName);
    this.setState({ treeData: tree });
  };

  createTreeNode(name, type) {
    let object = this.createDirent(name, type);
    return new TreeNode({ object });
  }

  createDirent(name, type, size) {
    // use current dirent parent's permission as it's permission
    const { userPerm: permission } = this.state;
    const mtime = new Date().getTime() / 1000;
    const obj = { name, type, mtime, size, permission };
    const dirent = new Dirent(obj);
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
      return new TreeNode({ object });
    });
    node.addChildren(nodeList);
  };

  getSelectedDirentPaths = () => {
    let paths = [];
    this.state.selectedDirentList.forEach(selectedDirent => {
      paths.push(Utils.joinPath(this.state.path, selectedDirent.name));
    });
    return paths;
  };

  getSelectedDirentNames = () => {
    let names = [];
    this.state.selectedDirentList.forEach(selectedDirent => {
      names.push(selectedDirent.name);
    });
    return names;
  };

  resetSelected = () => {
    this.setState({
      isDirentSelected: false,
      isAllDirentSelected: false,
    });
  };

  recalculateSelectedDirents = (unSelectNames, newDirentList) => {
    let selectedDirentList = this.state.selectedDirentList.slice(0);
    if (selectedDirentList.length > 0) {
      selectedDirentList = selectedDirentList.filter(item => {
        return !unSelectNames.includes(item.name);
      });
    }
    this.setState({
      selectedDirentList: selectedDirentList,
      isDirentSelected: selectedDirentList.length > 0,
      isAllDirentSelected: newDirentList.length ? selectedDirentList.length === newDirentList.length : false,
    });
  };

  onLibDecryptDialog = () => {
    this.setState({ libNeedDecrypt: false });
    this.loadDirData(this.state.path);
  };

  onLibDecryptWhenCopyMove = () => {
    if (this.state.libNeedDecryptWhenCopy) {
      if (this.state.copyMoveSingleItem) {
        this.onCopyItem(this.state.destRepoWhenCopyMove, this.state.srcDirentWhenCopyMove, this.state.destDirentPathWhenCopyMove, this.state.srcNodeParentPathWhenCopyMove);
      } else {
        this.onCopyItems(this.state.destRepoWhenCopyMove, this.state.destDirentPathWhenCopyMove);
      }
      this.setState({
        libNeedDecryptWhenCopy: false,
        copyMoveSingleItem: false,
      });
    }
    if (this.state.libNeedDecryptWhenMove) {
      if (this.state.copyMoveSingleItem) {
        this.onMoveItem(this.state.destRepoWhenCopyMove, this.state.srcDirentWhenCopyMove, this.state.destDirentPathWhenCopyMove, this.state.srcNodeParentPathWhenCopyMove);
      } else {
        this.onMoveItems(this.state.destRepoWhenCopyMove, this.state.destDirentPathWhenCopyMove);
      }
      this.setState({
        libNeedDecryptWhenMove: false,
        copyMoveSingleItem: false,
      });
    }
  };

  sortItems = (sortBy, sortOrder) => {
    cookie.save('seafile-repo-dir-sort-by', sortBy);
    cookie.save('seafile-repo-dir-sort-order', sortOrder);
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortDirents(this.state.direntList, sortBy, sortOrder)
    });
  };

  onUploadFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFileUpload();
  };

  onUploadFolder = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFolderUpload();
  };

  onToolbarFileTagChanged = () => {
    let repoID = this.props.repoID;
    let filePath = this.state.path;
    seafileAPI.listFileTags(repoID, filePath).then(res => {
      let fileTags = res.data.file_tags.map(item => {
        return new FileTag(item);
      });

      this.setState({ fileTags: fileTags });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  unSelectDirent = () => {
    const direntList = this.state.direntList.map(item => {
      item.isSelected = false;
      return item;
    });
    this.setState({
      isDirentSelected: false,
      direntList,
      selectedDirentList: []
    });
    const dirent = {};
    this.onDirentSelected(dirent);
  };

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
    this.setState({ direntList: direntList });
    this.updateUsedRepoTags();
  };


  handleSubmit = (e) => {
    let options = {
      'share_type': 'personal',
      'from': this.state.currentRepoInfo.owner_email
    };
    seafileAPI.leaveShareRepo(this.props.repoID, options).then(res => {
      navigate(siteRoot + 'shared-libs/');
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error, true);
      toaster.danger(errorMsg);
    });

    e.preventDefault();
  };

  toggleTreePanel = () => {
    this.setState({
      isTreePanelShown: !this.state.isTreePanelShown
    }, () => {
      if (this.state.isTreePanelShown) {
        this.loadSidePanel(this.state.path);
      }
      localStorage.setItem('sf_dir_view_tree_panel_open', String(this.state.isTreePanelShown));
    });
  };

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

    if (this.state.libNeedDecryptWhenCopy || this.state.libNeedDecryptWhenMove) {
      return (
        <ModalPortal>
          <LibDecryptDialog
            repoID={this.state.destRepoWhenCopyMove.repo_id}
            onLibDecryptDialog={this.onLibDecryptWhenCopyMove}
          />
        </ModalPortal>
      );
    }

    if (this.state.errorMsg) {
      return (
        <Fragment>
          <p className="error mt-6 text-center">{this.state.errorMsg}</p>
          <button type="submit" className="btn btn-primary submit" onClick={this.handleSubmit}>{gettext('Leave Share')}</button>
        </Fragment>
      );
    }

    if (!this.state.currentRepoInfo) {
      return '';
    }

    let enableDirPrivateShare = false;
    let { currentRepoInfo, userPerm, isCopyMoveProgressDialogShow, isDeleteFolderDialogOpen, currentDirent } = this.state;
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

    let canUpload = true;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    if (isCustomPermission) {
      const { upload } = customPermission.permission;
      canUpload = upload;
    }

    return (
      <MetadataProvider
        repoID={this.props.repoID}
        selectMetadataView={this.onTreeNodeClick}
        hideMetadataView={this.hideFileMetadata}
      >
        <CollaboratorsProvider repoID={this.props.repoID}>
          <div className="main-panel-center flex-row">
            <LibContentContainer
              isSidePanelFolded={this.props.isSidePanelFolded}
              repoEncrypted={this.state.repoEncrypted}
              isRepoOwner={isRepoOwner}
              onFilesTagChanged={this.onFileTagChanged}
              unSelectDirent={this.unSelectDirent}
              pathPrefix={this.props.pathPrefix}
              isTreePanelShown={this.state.isTreePanelShown}
              toggleTreePanel={this.toggleTreePanel}
              currentMode={this.state.currentMode}
              switchViewMode={this.switchViewMode}
              isCustomPermission={isCustomPermission}
              path={this.state.path}
              pathExist={this.state.pathExist}
              currentRepoInfo={this.state.currentRepoInfo}
              repoID={this.props.repoID}
              enableDirPrivateShare={enableDirPrivateShare}
              userPerm={userPerm}
              isGroupOwnedRepo={this.state.isGroupOwnedRepo}
              onTabNavClick={this.props.onTabNavClick}
              onMainNavBarClick={this.onMainNavBarClick}
              isViewFile={this.state.isViewFile}
              hash={this.state.hash}
              fileTags={this.state.fileTags}
              isFileLoading={this.state.isFileLoading}
              isFileLoadedErr={this.state.isFileLoadedErr}
              filePermission={this.state.filePermission}
              content={this.state.content}
              viewId={this.state.viewId}
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
              repoTags={this.state.repoTags}
              usedRepoTags={this.state.usedRepoTags}
              updateUsedRepoTags={this.updateUsedRepoTags}
              isDirentListLoading={this.state.isDirentListLoading}
              direntList={direntItemsList}
              fullDirentList={this.state.direntList}
              sortBy={this.state.sortBy}
              sortOrder={this.state.sortOrder}
              currentDirent={currentDirent}
              sortItems={this.sortItems}
              updateDirent={this.updateDirent}
              onDirentClick={this.onDirentClick}
              onItemClick={this.onItemClick}
              onItemSelected={this.onDirentSelected}
              onItemDelete={this.onMainPanelItemDelete}
              onItemRename={this.onMainPanelItemRename}
              onItemMove={this.onMoveItem}
              onItemCopy={this.onCopyItem}
              onItemConvert={this.onConvertItem}
              onAddFolder={this.onAddFolder}
              onAddFile={this.onAddFile}
              onFileTagChanged={this.onFileTagChanged}
              isDirentSelected={this.state.isDirentSelected}
              isAllDirentSelected={this.state.isAllDirentSelected}
              onAllDirentSelected={this.onAllDirentSelected}
              isDirentDetailShow={this.state.isDirentDetailShow}
              selectedDirent={this.state.selectedDirentList && this.state.selectedDirentList[0]}
              selectedDirentList={this.state.selectedDirentList}
              onSelectedDirentListUpdate={this.onSelectedDirentListUpdate}
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
              loadDirentList={this.loadDirentList}
              showShareBtn={showShareBtn}
              onUploadFile={this.onUploadFile}
              onUploadFolder={this.onUploadFolder}
              eventBus={this.props.eventBus}
              onCloseMarkdownViewDialog={this.onCloseMarkdownViewDialog}
            />
            {canUpload && this.state.pathExist && !this.state.isViewFile && (
              <FileUploader
                ref={uploader => this.uploader = uploader}
                dragAndDrop={true}
                path={this.state.path}
                repoID={this.props.repoID}
                direntList={this.state.direntList}
                onFileUploadSuccess={this.onFileUploadSuccess}
                isCustomPermission={isCustomPermission}
              />
            )}
          </div>
          {isCopyMoveProgressDialogShow && (
            <CopyMoveDirentProgressDialog
              type={this.state.asyncOperationType}
              asyncOperatedFilesLength={this.state.asyncOperatedFilesLength}
              asyncOperationProgress={this.state.asyncOperationProgress}
              toggleDialog={this.onMoveProgressDialogToggle}
            />
          )}
          {isDeleteFolderDialogOpen && (
            <DeleteFolderDialog
              repoID={this.props.repoID}
              path={this.state.folderToDelete}
              deleteFolder={this.deleteFolder}
              toggleDialog={this.toggleDeleteFolderDialog}
            />
          )}
          <MediaQuery query="(max-width: 767.8px)">
            <Modal zIndex="1030" isOpen={!Utils.isDesktop() && this.state.isTreePanelShown} toggle={this.toggleTreePanel} contentClassName="d-none"></Modal>
          </MediaQuery>
        </CollaboratorsProvider>
      </MetadataProvider>
    );
  }
}

LibContentView.propTypes = propTypes;

export default LibContentView;
