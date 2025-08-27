import React from 'react';
import PropTypes from 'prop-types';
import Cookies from 'js-cookie';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import classnames from 'classnames';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { navigate } from '@gatsbyjs/reach-router';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { gettext, SF_DIRECTORY_TREE_SORT_BY_KEY, SF_DIRECTORY_TREE_SORT_ORDER_KEY, siteRoot, username } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { Dirent, FileTag, RepoTag, RepoInfo } from '../../models';
import TreeNode from '../../components/tree-view/tree-node';
import treeHelper from '../../components/tree-view/tree-helper';
import toaster from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
import LibDecryptDialog from '../../components/dialog/lib-decrypt-dialog';
import FileUploader from '../../components/file-uploader/file-uploader';
import CopyMoveDirentProgressDialog from '../../components/dialog/copy-move-dirent-progress-dialog';
import DeleteFolderDialog from '../../components/dialog/delete-folder-dialog';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';
import { PRIVATE_FILE_TYPE, DIRENT_DETAIL_SHOW_KEY, TREE_PANEL_STATE_KEY, RECENTLY_USED_LIST_KEY } from '../../constants';
import { MetadataStatusProvider, FileOperationsProvider, MetadataMiddlewareProvider } from '../../hooks';
import { MetadataProvider } from '../../metadata/hooks';
import { LIST_MODE, METADATA_MODE, TAGS_MODE } from '../../components/dir-view-mode/constants';
import CurDirPath from '../../components/cur-dir-path';
import DirTool from '../../components/cur-dir-path/dir-tool';
import Detail from '../../components/dirent-detail';
import DirColumnView from '../../components/dir-view-mode/dir-column-view';
import SelectedDirentsToolbar from '../../components/toolbar/selected-dirents-toolbar';
import MetadataPathToolbar from '../../components/toolbar/metadata-path-toolbar';
import { eventBus } from '../../components/common/event-bus';
import WebSocketClient from '../../utils/websocket-service';

import '../../css/lib-content-view.css';

dayjs.extend(relativeTime);

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
    const storedTreePanelState = localStorage.getItem(TREE_PANEL_STATE_KEY);
    if (storedTreePanelState != undefined) {
      isTreePanelShown = storedTreePanelState === 'true';
    }

    const storedDirentDetailShowState = localStorage.getItem(DIRENT_DETAIL_SHOW_KEY);
    const isDirentDetailShow = storedDirentDetailShowState === 'true';

    this.socket = new WebSocketClient(this.onMessageCallback, this.props.repoID);
    this.state = {
      currentMode: Cookies.get('seafile_view_mode') || LIST_MODE,
      isTreePanelShown: isTreePanelShown, // display the 'dirent tree' side panel
      path: '',
      pathExist: true,
      isViewFile: false,
      currentRepoInfo: null,
      repoName: '',
      repoEncrypted: false,
      libNeedDecrypt: false,
      isGroupOwnedRepo: false,
      userPerm: '',
      showMdView: false,
      selectedDirentList: [],
      lastSelectedIndex: null,
      fileTags: [],
      repoTags: [],
      usedRepoTags: [],
      isTreeDataLoading: true,
      treeData: treeHelper.buildTree(),
      currentNode: null,
      isFileLoading: true,
      filePermission: '',
      content: '',
      lastModified: '',
      latestContributor: '',
      isDirentListLoading: true,
      direntList: [],
      isDirentSelected: false,
      sortBy: Cookies.get('seafile-repo-dir-sort-by') || 'name', // 'name' or 'time' or 'size'
      sortOrder: Cookies.get('seafile-repo-dir-sort-order') || 'asc', // 'asc' or 'desc'
      isAllDirentSelected: false,
      dirID: '', // for update dir list
      errorMsg: '',
      isDirentDetailShow,
      itemsShowLength: 100,
      isSessionExpired: false,
      isCopyMoveProgressDialogShow: false,
      isDeleteFolderDialogOpen: false,
      asyncCopyMoveTaskId: '',
      asyncOperationType: 'move',
      asyncOperationProgress: 0,
      asyncOperatedFilesLength: 0,
      viewId: '0000',
      tagId: '',
      currentDirent: null,
    };

    this.oldOnpopstate = window.onpopstate;
    window.onpopstate = this.onpopstate;
    this.lastModifyTime = new Date();
    this.isNeedUpdateHistoryState = true; // Load, refresh page, switch mode for the first time, no need to set historyState
    this.currentMoveItemName = '';
    this.currentMoveItemPath = '';
    this.unsubscribeEventBus = null;
  }

  updateCurrentDirent = (dirent = null) => {
    this.setState({ currentDirent: dirent });
  };

  updateCurrentNotExistDirent = (deletedDirent) => {
    let { currentDirent } = this.state;
    if (currentDirent && deletedDirent.name === currentDirent.name) {
      this.setState({ currentDirent: null });
    }
  };

  onItemsScroll = (e) => {
    let target = e.target;
    if (target.scrollTop === 0) {
      return;
    }
    if (target.scrollTop + target.clientHeight + 1 >= target.scrollHeight) {
      this.onListContainerScroll();
    }
  };

  showDirentDetail = () => {
    this.setState({ isDirentDetailShow: true }, () => {
      localStorage.setItem(DIRENT_DETAIL_SHOW_KEY, true);
    });
  };

  toggleDirentDetail = () => {
    const newState = !this.state.isDirentDetailShow;
    this.setState({ isDirentDetailShow: newState }, () => {
      localStorage.setItem(DIRENT_DETAIL_SHOW_KEY, newState);
    });
  };

  closeDirentDetail = () => {
    this.setState({ isDirentDetailShow: false }, () => {
      localStorage.setItem(DIRENT_DETAIL_SHOW_KEY, false);
    });
  };

  componentDidMount() {
    this.unsubscribeEvent = this.props.eventBus.subscribe(EVENT_BUS_TYPE.SEARCH_LIBRARY_CONTENT, this.onSearchedClick);
    this.unsubscribeOpenTreePanel = eventBus.subscribe(EVENT_BUS_TYPE.OPEN_TREE_PANEL, this.openTreePanel);
    this.unsubscribeSelectSearchedTag = this.props.eventBus.subscribe(EVENT_BUS_TYPE.SELECT_TAG, this.onTreeNodeClick);
    this.calculatePara(this.props);
  }

  onMessageCallback = (noticeData) => {
    /**
     * noticeData structure:
     * {
     *  type: 'file-lock-changed', // operation type
     *  content: {}
     * }
     */
    if (noticeData.type === 'file-lock-changed') {
      const getFilePath = (noticeData) => {
        if (!noticeData.content || !noticeData.content.path) {
          return '';
        }
        const path = noticeData.content.path.replace(/^\/+/, '');
        const lastSlashIndex = path.lastIndexOf('/');
        return lastSlashIndex === -1 ? '' : path.slice(0, lastSlashIndex);
      };

      let currentPath = this.state.path;
      currentPath = currentPath.slice(1); // remove the leading '/'
      const noticeFilePath = getFilePath(noticeData);

      if (currentPath === noticeFilePath) {
        // update file status
        const fileNameObj = { name: noticeData.content.path.split('/').pop() };
        if (noticeData.content.change_event === 'locked') {
          if (noticeData.content.expire === -1) {
            this.updateDirent(fileNameObj, 'is_freezed', true);
          } else {
            this.updateDirent(fileNameObj, 'is_freezed', false);
          }
          this.updateDirent(fileNameObj, 'is_locked', true);
          this.updateDirent(fileNameObj, 'locked_by_me', true);
          let lockOwnerName = noticeData.content.lock_user.split('@')[0];
          this.updateDirent(fileNameObj, 'lock_owner_name', lockOwnerName);
        } else if (noticeData.content.change_event === 'unlocked') {
          this.updateDirent(fileNameObj, 'is_locked', false);
          this.updateDirent(fileNameObj, 'locked_by_me', false);
          this.updateDirent(fileNameObj, 'lock_owner_name', '');
        }
      }
    } else if (noticeData.type === 'repo-update') {
      seafileAPI.listDir(this.props.repoID, this.state.path, { 'with_thumbnail': true }).then(res => {
        const { dirent_list, user_perm: userPerm, dir_id: dirID } = res.data;
        const direntList = Utils.sortDirents(dirent_list.map(item => new Dirent(item)), this.state.sortBy, this.state.sortOrder);
        this.setState({
          pathExist: true,
          userPerm,
          isDirentListLoading: false,
          direntList,
          dirID,
          path: this.state.path,
          isSessionExpired: false,
          currentDirent: null,
        });
      });
    }
  };

  calculatePara = async (props) => {
    const { repoID } = props;

    const { path, viewId, tagId } = this.getInfoFromLocation(repoID);
    let currentMode;
    if (tagId) {
      currentMode = TAGS_MODE;
    } else if (viewId) {
      currentMode = METADATA_MODE;
    } else {
      currentMode = Cookies.get('seafile_view_mode') || LIST_MODE;
    }

    try {
      const repoInfo = await this.fetchRepoInfo(repoID);
      const isGroupOwnedRepo = repoInfo.owner_email.includes('@seafile_group');

      this.setState({
        treeData: treeHelper.buildTree(),
        currentRepoInfo: repoInfo,
        repoName: repoInfo.repo_name,
        libNeedDecrypt: repoInfo.lib_need_decrypt,
        repoEncrypted: repoInfo.encrypted,
        isGroupOwnedRepo,
        path,
        viewId,
        tagId,
        currentMode,
      }, () => {
        if (this.state.isTreePanelShown) {
          this.loadSidePanel(path);
        }
      });

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

  getInfoFromLocation = (repoID) => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('view');
    if (viewId) return { path: `/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}`, viewId };

    const tagId = urlParams.get('tag');
    if (tagId) return { path: `/${PRIVATE_FILE_TYPE.TAGS_PROPERTIES}`, tagId };

    let location = window.location.href.split('?')[0];
    location = decodeURIComponent(location);
    let path = location.slice(location.indexOf(repoID) + repoID.length + 1);
    path = path.slice(path.indexOf('/'));
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return { path };
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
    window.onpopstate = this.oldOnpopstate;
    this.unsubscribeEvent();
    this.unsubscribeOpenTreePanel();
    this.unsubscribeEventBus && this.unsubscribeEventBus();
    this.unsubscribeSelectSearchedTag && this.unsubscribeSelectSearchedTag();
    this.props.eventBus.dispatch(EVENT_BUS_TYPE.CURRENT_LIBRARY_CHANGED, {
      repoID: '',
      repoName: '',
      path: '',
      isViewFile: false,
      isLibView: false,
      currentRepoInfo: null,
    });
    this.socket.close();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.repoID !== this.props.repoID) {
      this.calculatePara(this.props);
    }
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
            lastModified: dayjs.unix(mtime).fromNow(),
            isFileLoading: false,
          });
        });
      });
    }).catch(() => {
      this.setState({
        isFileLoading: false,
      });
    });
  };

  // load data
  loadDirData = (path) => {
    this.updateUsedRepoTags();
    if (!(path.includes(PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES) || path.includes(PRIVATE_FILE_TYPE.TAGS_PROPERTIES))) {
      this.showDir(path);
    }
  };

  loadSidePanel = (path) => {
    let repoID = this.props.repoID;
    if (path === '/' || path.includes(PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES) || path.includes(PRIVATE_FILE_TYPE.TAGS_PROPERTIES)) {
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
    this.props.resetTitle();

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
      path: noRedirection ? this.state.path : filePath,
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
            lastModified: dayjs.unix(mtime).fromNow(),
            isFileLoading: false,
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
      currentMode: METADATA_MODE,
      path: filePath,
      viewId: viewId,
    });
    const url = `${siteRoot}library/${repoID}/${encodeURIComponent(repoInfo.repo_name)}/?view=${encodeURIComponent(viewId)}`;
    window.history.pushState({ url: url, path: '' }, '', url);
  };

  hideMetadataView = (isSetRoot = false) => {
    const { repoID } = this.props;
    const { path } = this.getInfoFromLocation(repoID);
    this.setState({
      currentMode: Cookies.get('seafile_view_mode') || LIST_MODE,
      path: isSetRoot ? '/' : path,
      viewId: '',
      tagId: '',
      currentDirent: isSetRoot ? null : this.state.currentDirent,
    }, () => {
      if (!isSetRoot) return;
      this.showDir('/');
    });
  };

  showTagsView = (filePath, tagId) => {
    const repoID = this.props.repoID;
    const repoInfo = this.state.currentRepoInfo;
    this.setState({
      currentMode: TAGS_MODE,
      path: filePath,
      tagId: tagId,
    });
    const url = `${siteRoot}library/${repoID}/${encodeURIComponent(repoInfo.repo_name)}/?tag=${encodeURIComponent(tagId)}`;
    window.history.pushState({ url: url, path: '' }, '', url);
  };

  loadDirentList = (path) => {
    const { repoID } = this.props;
    const { sortBy, sortOrder } = this.state;
    this.setState({
      isDirentListLoading: true,
      direntList: [],
      path,
    });
    seafileAPI.listDir(repoID, path, { 'with_thumbnail': true }).then(res => {
      const { dirent_list, user_perm: userPerm, dir_id: dirID } = res.data;
      const direntList = Utils.sortDirents(dirent_list.map(item => new Dirent(item)), sortBy, sortOrder);
      this.setState({
        pathExist: true,
        userPerm,
        isDirentListLoading: false,
        direntList,
        dirID,
        path,
        isSessionExpired: false,
        currentDirent: null,
      }, () => {
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
      });

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
    this.setState({ itemsShowLength: this.state.itemsShowLength + 100 });
  };

  resetShowLength = () => {
    this.setState({ itemsShowLength: 100 });
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

      let updatedTree = tree.clone();
      newAddedDirents.forEach(item => {
        const node = this.createTreeNode(item.name, item.type);
        updatedTree = treeHelper.addNodeToParentByPath(updatedTree, node, path);
      });
      this.setState({ treeData: updatedTree });
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

  updateRecentlyUsedList = (repo, destPath) => {
    const recentlyUsed = JSON.parse(localStorage.getItem(RECENTLY_USED_LIST_KEY)) || [];
    const updatedRecentlyUsed = [{ repo_id: repo.repo_id, path: destPath }, ...recentlyUsed];

    const filteredRecentlyUsed = updatedRecentlyUsed.filter((item, index, self) =>
      index === self.findIndex(t => (
        t.repo_id === item.repo_id && t.path === item.path
      ))
    );

    if (filteredRecentlyUsed.length > 10) {
      filteredRecentlyUsed.pop(); // Limit to 10 recent directories
    }

    localStorage.setItem(RECENTLY_USED_LIST_KEY, JSON.stringify(filteredRecentlyUsed));
  };

  // toolbar operations
  onMoveItems = (destRepo, destDirentPath, byDialog = false) => {
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
        this.moveDirents(dirNames);

        if (this.state.isTreePanelShown) {
          const updatedTree = treeHelper.moveNodeListByPaths(this.state.treeData, direntPaths, destDirentPath);

          const destNode = updatedTree.getNodeByPath(destDirentPath);
          if (destNode) {
            const sortedChildren = Utils.sortDirents(
              destNode.children.map(n => n.object),
              'name',
              'asc'
            ).map(dirent => {
              return destNode.children.find(n => n.object.name === dirent.name);
            });

            destNode.children = sortedChildren;
          }

          this.setState({ treeData: updatedTree });
        }

        // show tip message if move to current repo
        let message = Utils.getMoveSuccessMessage(dirNames);
        toaster.success(message);
      }

      if (byDialog) {
        this.updateRecentlyUsedList(destRepo, destDirentPath);
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
          libNeedDecryptWhenMove: true,
          destRepoWhenCopyMove: destRepo,
          destDirentPathWhenCopyMove: destDirentPath,
        });
      }
    });
  };

  onCopyItems = (destRepo, destDirentPath, byDialog = false) => {
    let repoID = this.props.repoID;
    let selectedDirentList = this.state.selectedDirentList;

    let dirNames = this.getSelectedDirentNames();
    seafileAPI.copyDir(repoID, destRepo.repo_id, destDirentPath, this.state.path, dirNames).then(res => {
      this.onSelectedDirentListUpdate([]);
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

      if (byDialog) {
        this.updateRecentlyUsedList(destRepo, destDirentPath);
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

    this.setState({ currentDirent: null });
    seafileAPI.deleteMultipleDirents(repoID, this.state.path, dirNames).then(res => {
      this.deleteItemsAjaxCallback(direntPaths, dirNames);

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

  removeFromRecentlyUsed = (repoID, path) => {
    const recentlyUsed = JSON.parse(localStorage.getItem(RECENTLY_USED_LIST_KEY)) || [];
    const updatedRecentlyUsed = recentlyUsed.filter(item =>
      !(item.repo_id === repoID && item.path === path)
    );
    localStorage.setItem(RECENTLY_USED_LIST_KEY, JSON.stringify(updatedRecentlyUsed));
  };

  onAddFolder = (dirPath, options = {}) => {
    const { successCallback = () => {} } = options;
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

      successCallback();
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

    Cookies.set('seafile_view_mode', mode);
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
    this.setState({ currentMode: mode, isDirentSelected: false });
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
    }

    if (item.is_dir) {
      this.setState({ currentMode: Cookies.get('seafile_view_mode') || LIST_MODE });
      this.showDir(path);
    } else {
      this.openSearchedNewTab(item);
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
    this.resetSelected({ path: nodePath });
    if (this.state.isTreePanelShown) {
      let tree = this.state.treeData.clone();
      let node = tree.getNodeByPath(nodePath);
      tree.expandNode(node);
      this.setState({ treeData: tree, currentNode: nodePath !== '/' ? node : null });
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
    this.updateCurrentNotExistDirent(dirent);
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

  renameItemAjaxCallback = (path, newName) => {
    if (this.state.isTreePanelShown) {
      this.renameTreeNode(path, newName);
    }
    this.renameDirent(path, newName);
  };

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
    this.removeFromRecentlyUsed(this.props.repoID, path);
  }

  deleteItemsAjaxCallback = (direntPaths, dirNames) => {
    if (this.state.isTreePanelShown) {
      this.deleteTreeNodes(direntPaths);
    }
    this.deleteDirents(dirNames);
    this.removeFromRecentlyUsed(this.props.repoID, this.state.path);
  };

  // list operations
  moveItemsAjaxCallback = (repoID, targetRepo, dirent, moveToDirentPath, nodeParentPath, taskId, byDialog = false) => {
    this.updateCurrentNotExistDirent(dirent);

    const dirName = dirent.name;
    const direntPath = Utils.joinPath(nodeParentPath, dirName);
    if (repoID !== targetRepo.repo_id) {
      this.setState({
        asyncCopyMoveTaskId: taskId,
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

    // 1. move to current repo
    // 2. tow columns mode need update left tree
    const updateAfterMove = () => {
      if (repoID === targetRepo.repo_id && this.state.isTreePanelShown) {
        this.updateMoveCopyTreeNode(moveToDirentPath);
      }
      this.moveDirent(direntPath, moveToDirentPath);
    };

    if (this.state.isTreePanelShown) {
      this.deleteTreeNode(direntPath, updateAfterMove);
    } else {
      updateAfterMove();
    }

    // show tip message if move to current repo
    if (repoID === targetRepo.repo_id) {
      let message = gettext('Successfully moved {name}.');
      message = message.replace('{name}', dirName);
      toaster.success(message);
    }

    if (byDialog) {
      this.updateRecentlyUsedList(targetRepo, moveToDirentPath);
    }
  };

  onMoveItem = (destRepo, dirent, moveToDirentPath, nodeParentPath, byDialog = false) => {
    let repoID = this.props.repoID;
    // just for view list state
    let dirName = dirent.name;
    if (!nodeParentPath) {
      nodeParentPath = this.state.path;
    }

    seafileAPI.moveDir(repoID, destRepo.repo_id, moveToDirentPath, nodeParentPath, dirName).then(res => {
      this.moveItemsAjaxCallback(repoID, destRepo, dirent, moveToDirentPath, nodeParentPath, res.data.task_id, byDialog);
    }).catch((error) => {
      if (!error.response.data.lib_need_decrypt) {
        let errMessage = Utils.getErrorMsg(error);
        if (errMessage === gettext('Error')) {
          errMessage = gettext('Failed to move {name}.');
          errMessage = errMessage.replace('{name}', dirName);
        }
        toaster.danger(errMessage);
        return;
      }
      this.setState({
        libNeedDecryptWhenMove: true,
        destRepoWhenCopyMove: destRepo,
        destDirentPathWhenCopyMove: moveToDirentPath,
        copyMoveSingleItem: true,
        srcDirentWhenCopyMove: dirent,
        srcNodeParentPathWhenCopyMove: nodeParentPath,
      });
    });
  };

  copyItemsAjaxCallback = (repoID, targetRepo, dirent, copyToDirentPath, nodeParentPath, taskId, byDialog = false) => {
    this.onSelectedDirentListUpdate([]);
    if (repoID !== targetRepo.repo_id) {
      this.setState({
        asyncCopyMoveTaskId: taskId,
        asyncOperatedFilesLength: 1,
        asyncOperationProgress: 0,
        asyncOperationType: 'copy',
        isCopyMoveProgressDialogShow: true
      }, () => {
        this.getAsyncCopyMoveProgress();
      });
      if (byDialog) {
        this.updateRecentlyUsedList(targetRepo, copyToDirentPath);
      }
      return;
    }

    if (this.state.isTreePanelShown) {
      this.updateMoveCopyTreeNode(copyToDirentPath);
    }

    if (copyToDirentPath === nodeParentPath && this.state.currentMode !== METADATA_MODE && this.state.currentMode !== TAGS_MODE) {
      this.loadDirentList(this.state.path);
    }

    const dirName = dirent.name;
    let message = gettext('Successfully copied %(name)s.');
    message = message.replace('%(name)s', dirName);
    toaster.success(message);

    if (byDialog) {
      this.updateRecentlyUsedList(targetRepo, copyToDirentPath);
    }
  };

  onCopyItem = (destRepo, dirent, copyToDirentPath, nodeParentPath, byDialog = false) => {
    let repoID = this.props.repoID;
    // just for view list state
    let dirName = dirent.name;
    if (!nodeParentPath) {
      nodeParentPath = this.state.path;
    }

    seafileAPI.copyDir(repoID, destRepo.repo_id, copyToDirentPath, nodeParentPath, dirName).then(res => {
      this.copyItemsAjaxCallback(repoID, destRepo, dirent, copyToDirentPath, nodeParentPath, res.data.task_id || null, byDialog);
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

  convertFileAjaxCallback = ({ newName, parentDir, size, path, error }) => {
    if (error) {
      let errMessage = Utils.getErrorMsg(error);
      if (errMessage === gettext('Error')) {
        const name = Utils.getFileName(path);
        errMessage = gettext('Failed to convert {name}.').replace('{name}', name);
      }
      toaster.danger(errMessage, { 'id': 'conversion' });
      return;
    }
    const new_path = parentDir + '/' + newName;
    const parentPath = Utils.getDirName(new_path);
    if (this.state.isTreePanelShown) {
      this.addNodeToTree(newName, parentPath, 'file');
    }
    this.addDirent(newName, 'file', size);
    const message = gettext('Successfully converted the file.');
    toaster.success(message, { 'id': 'conversion' });
  };

  onConvertItem = (dirent, dstType) => {
    let path = Utils.joinPath(this.state.path, dirent.name);
    let repoID = this.props.repoID;
    toaster.notifyInProgress(gettext('Converting, please wait...'), { 'id': 'conversion' });
    seafileAPI.convertFile(repoID, path, dstType).then((res) => {
      const newFileName = res.data.obj_name;
      const parentDir = res.data.parent_dir;
      this.convertFileAjaxCallback({ newName: newFileName, parentDir, size: res.data.size });
    }).catch((error) => {
      this.convertFileAjaxCallback({ path, error });
    });

  };

  onDirentClick = (clickedDirent, event) => {
    this.setState({
      currentDirent: clickedDirent && clickedDirent.isActive ? null : clickedDirent
    });
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

      this.setState(prevState => {
        const newDirentList = prevState.direntList.map(dirent => {
          const isSelected = newSelectedDirentList.some(selected => selected.name === dirent.name);
          return new Dirent({
            ...dirent,
            isSelected: isSelected,
          });
        });

        const updatedSelectedDirents = newSelectedDirentList.map(selected =>
          newDirentList.find(dirent => dirent.name === selected.name)
        );

        return {
          direntList: newDirentList,
          isDirentSelected: updatedSelectedDirents.length > 0,
          isAllDirentSelected: updatedSelectedDirents.length === newDirentList.length,
          selectedDirentList: updatedSelectedDirents,
          lastSelectedIndex: clickedIndex,
        };
      });
    } else {
      this.setState(prevState => ({
        direntList: prevState.direntList.map(dirent => new Dirent({ ...dirent, isSelected: false })),
        isDirentSelected: false,
        isAllDirentSelected: false,
        selectedDirentList: [],
        lastSelectedIndex: null,
      }));
    }
  };

  onSelectedDirentListUpdate = (newSelectedDirentList, lastSelectedIndex = null) => {
    this.setState({
      direntList: this.state.direntList.map(dirent => {
        return new Dirent({
          ...dirent,
          isSelected: newSelectedDirentList.some(
            selected => selected.name === dirent.name
          )
        });
      }),
      isDirentSelected: newSelectedDirentList.length > 0,
      selectedDirentList: newSelectedDirentList,
      lastSelectedIndex: lastSelectedIndex,
      isAllDirentSelected: newSelectedDirentList.length === this.state.direntList.length,
    });
  };

  onItemClick = (dirent) => {
    this.resetSelected(dirent);
    let repoID = this.props.repoID;
    let direntPath = Utils.joinPath(this.state.path, dirent.name);
    if (dirent.isDir()) { // is dir
      if (this.state.isTreePanelShown) {
        this.loadTreeNodeByPath(direntPath);
      }
      this.showDir(direntPath);
    } else { // is file
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
  };

  onDirentSelected = (dirent, event) => {
    this.setState({
      currentDirent: dirent && dirent.isActive ? null : dirent
    });

    const { direntList, lastSelectedIndex, selectedDirentList } = this.state;
    const clickedDirentIndex = dirent ? direntList.findIndex((currDirent) => currDirent.name === dirent.name) : -1;
    const clickedDirent = clickedDirentIndex > -1 ? direntList[clickedDirentIndex] : null;
    let nextSelectedIndex = null;
    if (clickedDirent && !clickedDirent.isSelected) {
      nextSelectedIndex = clickedDirentIndex;
    }

    let nextDirentList = direntList;
    if (event && event.shiftKey && lastSelectedIndex !== null && nextSelectedIndex !== null) {
      // select multiple files with shift key
      const start = Math.min(lastSelectedIndex, nextSelectedIndex);
      const end = Math.max(lastSelectedIndex, nextSelectedIndex);
      const direntListInRange = direntList.slice(start, end + 1);
      if (direntListInRange.length > 0) {
        const nameDirentSelectedMap = selectedDirentList.reduce((currNameDirentSelectedMap, currDirent) => {
          return { ...currNameDirentSelectedMap, [currDirent.name]: true };
        }, {});
        const nameDirentSelectingMap = direntListInRange.reduce((currNameDirentSelectingMap, currDirent) => {
          return { ...currNameDirentSelectingMap, [currDirent.name]: true };
        }, {});
        nextDirentList = direntList.map((currDirent) => {
          if (nameDirentSelectedMap[currDirent.name] || nameDirentSelectingMap[currDirent.name]) {
            currDirent.isSelected = true;
          }
          return currDirent;
        });
      }
    } else {
      nextDirentList = direntList.map(item => {
        if (dirent && item.name === dirent.name) {
          item.isSelected = !item.isSelected;
        }
        return item;
      });
    }

    const nextSelectedDirentList = nextDirentList.filter(item => item.isSelected);
    if (nextSelectedDirentList.length) {
      this.setState({ isDirentSelected: true });
      if (nextSelectedDirentList.length === nextDirentList.length) {
        this.setState({
          isAllDirentSelected: true,
          direntList: nextDirentList,
          selectedDirentList: nextSelectedDirentList,
          lastSelectedIndex: nextSelectedIndex,
        });
      } else {
        this.setState({
          isAllDirentSelected: false,
          direntList: nextDirentList,
          selectedDirentList: nextSelectedDirentList,
          lastSelectedIndex: nextSelectedIndex,
        });
      }
    } else {
      this.setState({
        isDirentSelected: false,
        isAllDirentSelected: false,
        direntList: nextDirentList,
        selectedDirentList: [],
        lastSelectedIndex: nextSelectedIndex,
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
    let dirent = null;
    const isExist = this.state.direntList.some(item => item.name === direntObject.name && item.type === direntObject.type);
    if (isExist) {
      dirent = this.state.direntList.find(dirent => dirent.name === direntObject.name && dirent.type === direntObject.type);
      const mtime = dayjs.unix(direntObject.mtime).fromNow();
      dirent && this.updateDirent(dirent, 'mtime', mtime);
    } else {
      // use current dirent parent's permission as it's permission
      direntObject.permission = this.state.userPerm;
      dirent = new Dirent(direntObject);

      this.setState(prevState => ({
        direntList: direntObject.type === 'dir' ? [dirent, ...prevState.direntList] : [...prevState.direntList, dirent]
      }));
    }

    if (this.state.isTreePanelShown && !isExist) {
      this.addNodeToTree(dirent.name, this.state.path, dirent.type);
    }
  };

  addDirent = (name, type, size) => {
    let direntList = this.state.direntList;
    // The notification server may have received the 'repo-update' message and setState the direntList.
    // So this file may already be in the direntList, we check if it has a duplicate name to avoid inserting new file repeatedly.
    if (direntList.some(item => item.name === name)) {
      return;
    }
    let item = this.createDirent(name, type, size);
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
      // the deleted item is ancestor of the current item
      let parentPath = Utils.getDirName(direntPath);
      this.showDir(parentPath);
    }
    // else do nothing
  }

  // only one scene: The deleted items are inside current path
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
    this.setState({ direntList: direntList, currentDirent: null });
  };

  // only one scene: The moved items are inside current path
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
      currentDirent: null,
    });
  };

  updateDirent = (dirent, paramKey, paramValue) => {
    let newDirentList = this.state.direntList.map(item => {
      if (item.name === dirent.name) {
        if (typeof paramKey === 'string') {
          item[paramKey] = paramValue;
        } else if (Array.isArray(paramKey)) {
          paramKey.forEach((key, index) => {
            item[key] = paramValue[index];
          });
        }
      }
      return item;
    });
    this.setState({ direntList: newDirentList });
  };

  updateTreeNode = (path, keys, values) => {
    let tree = this.state.treeData.clone();
    let node = tree.getNodeByPath(path);
    tree.updateNode(node, keys, values);
    this.setState({
      treeData: tree,
    });
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
        currentNode: tree.getNodeByPath(path),
        userPerm: user_perm,
      });
    }).catch(() => {
      this.setState({ isLoadFailed: true });
    });
  };

  onTreeNodeClick = (node) => {
    this.resetSelected(node);
    let repoID = this.props.repoID;

    if (!this.state.pathExist) {
      this.setState({ pathExist: true });
    }

    if (node.object.isDir()) {
      this.setState({ currentNode: node, path: node.path });
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
      if (this.state.path.includes(PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES) ||
        this.state.path.includes(PRIVATE_FILE_TYPE.TAGS_PROPERTIES)) {
        this.isNeedUpdateHistoryState = true;
      }
      this.showDir(node.path);
    } else {
      if (Utils.isFileMetadata(node?.object?.type)) {
        this.setState({ currentNode: null });
        if (node.path !== this.state.path) {
          this.showFileMetadata(node.path, node.view_id || '0000');
        }
      } else if (Utils.isTags(node?.object?.type)) {
        this.setState({ currentNode: null });
        if (node.path !== this.state.path) {
          this.showTagsView(node.path, node.tag_id);
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

  isTreeReady = (path = null) => {
    const { treeData, isTreeDataLoading } = this.state;
    if (isTreeDataLoading || !treeData || !treeData.root) return false;
    if (path) {
      const node = treeData.getNodeByPath(path);
      return node !== null;
    }
    return true;
  };

  addNodeToTree = (name, parentPath, type) => {
    if (!this.isTreeReady(parentPath)) return;
    let node = this.createTreeNode(name, type);
    let tree = treeHelper.addNodeToParentByPath(this.state.treeData, node, parentPath);
    this.setState({ treeData: tree });
  };

  renameTreeNode = (path, newName) => {
    let tree = treeHelper.renameNodeByPath(this.state.treeData, path, newName);
    const newPath = Utils.joinPath(Utils.getDirName(path), newName);
    const currentNode = path === this.state.currentNode?.path ? tree.getNodeByPath(newPath) : this.state.currentNode;
    this.setState({ treeData: tree, currentNode });
  };

  deleteTreeNode = (path, callback) => {
    let tree = treeHelper.deleteNodeByPath(this.state.treeData, path);
    this.setState({ treeData: tree }, () => {
      callback && callback();
    });
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
    const sortBy = Cookies.get(SF_DIRECTORY_TREE_SORT_BY_KEY) || 'name';
    const sortOrder = Cookies.get(SF_DIRECTORY_TREE_SORT_ORDER_KEY) || 'asc';
    direntList = Utils.sortDirents(direntList, sortBy, sortOrder);

    let nodeList = direntList.map(object => {
      return new TreeNode({ object });
    });
    node.addChildren(nodeList);
  };

  getSelectedDirentPaths = () => {
    return this.state.selectedDirentList.map(selectedDirent => Utils.joinPath(this.state.path, selectedDirent.name));
  };

  getSelectedDirentNames = () => {
    return this.state.selectedDirentList.map(selectedDirent => selectedDirent.name);
  };

  resetSelected = (node) => {
    if (node.object?.type === 'file') return;
    const path = node.path || '';
    const currentMode = this.state.currentMode;
    let nextMode;
    if (currentMode === TAGS_MODE && path.startsWith('/' + PRIVATE_FILE_TYPE.TAGS_PROPERTIES + '/')) {
      nextMode = TAGS_MODE;
    } else if (currentMode === METADATA_MODE && path.startsWith('/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/')) {
      nextMode = METADATA_MODE;
    } else {
      nextMode = Cookies.get('seafile_view_mode') || LIST_MODE;
    }

    this.setState({
      isDirentSelected: false,
      isAllDirentSelected: false,
      selectedDirentList: [],
      direntList: this.state.direntList.map(item => {
        item.isSelected = false;
        return item;
      }),
      currentMode: nextMode,
      currentDirent: null,
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
    Cookies.set('seafile-repo-dir-sort-by', sortBy);
    Cookies.set('seafile-repo-dir-sort-order', sortOrder);

    const sortedDirentList = Utils.sortDirents(this.state.direntList, sortBy, sortOrder);
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      direntList: sortedDirentList,
    });
  };

  sortTreeNode = (sortBy, sortOrder) => {
    Cookies.set(SF_DIRECTORY_TREE_SORT_BY_KEY, sortBy);
    Cookies.set(SF_DIRECTORY_TREE_SORT_ORDER_KEY, sortOrder);
    const sortedTreeData = treeHelper.sortTreeNodes(this.state.treeData, sortBy, sortOrder);
    this.setState({
      treeData: sortedTreeData,
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
    const dirent = null;
    this.onDirentSelected(dirent);
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

  openTreePanel = (callback) => {
    if (this.state.isTreePanelShown) {
      callback();
    } else {
      this.toggleTreePanel();
      setTimeout(() => {
        callback();
      }, 100);
    }
  };

  toggleTreePanel = () => {
    this.setState({
      isTreePanelShown: !this.state.isTreePanelShown
    }, () => {
      if (this.state.isTreePanelShown) {
        this.loadSidePanel(this.state.path);
      }
      localStorage.setItem(TREE_PANEL_STATE_KEY, String(this.state.isTreePanelShown));
    });
  };

  updatePath = (path) => {
    if (this.state.path === path) return;
    this.setState({ path });
  };

  toggleShowDirentToolbar = (isDirentSelected) => {
    this.setState({ isDirentSelected });
  };

  metadataStatusCallback = (status) => {
    const { enableTags, showView } = status;
    this.props.eventBus.dispatch(EVENT_BUS_TYPE.TAG_STATUS, enableTags);
    this.setState({
      showMdView: showView
    });
  };

  tagsChangedCallback = (tags) => {
    this.props.eventBus.dispatch(EVENT_BUS_TYPE.TAGS_CHANGED, tags);
  };

  updateRepoInfo = (updatedData) => {
    this.setState({
      currentRepoInfo: { ...this.state.currentRepoInfo, ...updatedData }
    });
  };

  render() {
    const { repoID } = this.props;
    let { currentRepoInfo, userPerm, isCopyMoveProgressDialogShow, isDeleteFolderDialogOpen, errorMsg,
      path, usedRepoTags, isDirentSelected, currentMode, currentNode, viewId } = this.state;

    if (this.state.libNeedDecrypt) {
      return (
        <ModalPortal>
          <LibDecryptDialog
            repoID={repoID}
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
    if (errorMsg) {
      return (
        <>
          <p className="error mt-6 text-center">{errorMsg}</p>
          <button type="submit" className="btn btn-primary submit" onClick={this.handleSubmit}>{gettext('Leave Share')}</button>
        </>
      );
    }
    if (!currentRepoInfo) {
      return '';
    }

    let enableDirPrivateShare = false;
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

    const isDesktop = Utils.isDesktop();
    let isRepoInfoBarShow = false;
    if (path === '/') {
      if (isDesktop && usedRepoTags.length !== 0) {
        isRepoInfoBarShow = true;
      }
    }

    let currentDirent = this.state.currentDirent;
    if (currentDirent instanceof Dirent) {
      currentDirent = currentDirent.toJson();
    }

    let detailPath = this.state.path;
    if (!currentDirent && currentMode !== METADATA_MODE && currentMode !== TAGS_MODE && this.state.selectedDirentList.length === 0) {
      detailPath = Utils.getDirName(this.state.path);
    }

    const detailDirent = currentDirent || currentNode?.object || null;
    return (
      <FileOperationsProvider
        repoID={repoID}
        repoInfo={currentRepoInfo}
        enableDirPrivateShare={enableDirPrivateShare}
        isGroupOwnedRepo={this.state.isGroupOwnedRepo}
        eventBus={this.props.eventBus}
        onCreateFolder={this.onAddFolder}
        onCreateFile={this.onAddFile}
        onRename={this.onMainPanelItemRename}
        onMove={this.onMoveItems}
        onMoveItem={this.onMoveItem}
        onCopy={this.onCopyItems}
        onCopyItem={this.onCopyItem}
      >
        <DndProvider backend={HTML5Backend}>
          <MetadataStatusProvider repoID={repoID} repoInfo={currentRepoInfo} currentPath={path} hideMetadataView={this.hideMetadataView} statusCallback={this.metadataStatusCallback} >
            <MetadataMiddlewareProvider repoID={repoID} currentPath={path} repoInfo={currentRepoInfo} selectTagsView={this.onTreeNodeClick} tagsChangedCallback={this.tagsChangedCallback}>
              <MetadataProvider repoID={repoID} currentPath={path} repoInfo={currentRepoInfo} selectMetadataView={this.onTreeNodeClick} >
                <div className="main-panel-center flex-row">
                  <div className="cur-view-container">
                    {this.state.currentRepoInfo.status === 'read-only' &&
                    <div className="readonly-tip-message">
                      {gettext('This library has been set to read-only by admin and cannot be updated.')}
                    </div>
                    }
                    <div className="cur-view-path lib-cur-view-path">
                      <div className={classnames(
                        'cur-view-path-left', {
                          'w-100': !isDesktop,
                          'animation-children': isDirentSelected
                        })}>
                        {isDirentSelected ? (
                          currentMode === TAGS_MODE || currentMode === METADATA_MODE ? (
                            <MetadataPathToolbar repoID={repoID} repoInfo={currentRepoInfo} mode={currentMode} path={path} viewId={viewId} />
                          ) : (
                            <SelectedDirentsToolbar
                              repoID={this.props.repoID}
                              eventBus={this.props.eventBus}
                              path={this.state.path}
                              userPerm={userPerm}
                              repoEncrypted={this.state.repoEncrypted}
                              repoTags={this.state.repoTags}
                              selectedDirentList={this.state.selectedDirentList}
                              direntList={direntItemsList}
                              onItemsDelete={this.onDeleteItems}
                              isRepoOwner={isRepoOwner}
                              currentRepoInfo={this.state.currentRepoInfo}
                              enableDirPrivateShare={enableDirPrivateShare}
                              updateDirent={this.updateDirent}
                              unSelectDirent={this.unSelectDirent}
                              onFilesTagChanged={this.onFileTagChanged}
                              showShareBtn={showShareBtn}
                              isGroupOwnedRepo={this.state.isGroupOwnedRepo}
                              showDirentDetail={this.showDirentDetail}
                              currentMode={this.state.currentMode}
                              onItemConvert={this.onConvertItem}
                            />
                          )
                        ) : (
                          <CurDirPath
                            currentRepoInfo={this.state.currentRepoInfo}
                            repoID={this.props.repoID}
                            repoName={this.state.currentRepoInfo.repo_name}
                            repoEncrypted={this.state.repoEncrypted}
                            isGroupOwnedRepo={this.state.isGroupOwnedRepo}
                            pathPrefix={this.props.pathPrefix}
                            currentPath={this.state.path}
                            userPerm={userPerm}
                            onTabNavClick={this.props.onTabNavClick}
                            onPathClick={this.onMainNavBarClick}
                            fileTags={this.state.fileTags}
                            direntList={direntItemsList}
                            sortBy={this.state.sortBy}
                            sortOrder={this.state.sortOrder}
                            sortItems={this.sortItems}
                            toggleTreePanel={this.toggleTreePanel}
                            isTreePanelShown={this.state.isTreePanelShown}
                            enableDirPrivateShare={enableDirPrivateShare}
                            showShareBtn={showShareBtn}
                            onUploadFile={this.onUploadFile}
                            onUploadFolder={this.onUploadFolder}
                            fullDirentList={this.state.direntList}
                            filePermission={this.state.filePermission}
                            onFileTagChanged={this.onToolbarFileTagChanged}
                            repoTags={this.state.repoTags}
                            onItemMove={this.onMoveItem}
                            isDesktop={isDesktop}
                            eventBus={this.props.eventBus}
                            loadDirentList={this.loadDirentList}
                          />
                        )}
                      </div>
                      {isDesktop &&
                      <div className="cur-view-path-right py-1">
                        <DirTool
                          repoID={this.props.repoID}
                          repoName={this.state.currentRepoInfo.repo_name}
                          userPerm={userPerm}
                          currentPath={path}
                          currentMode={this.state.currentMode}
                          switchViewMode={this.switchViewMode}
                          isCustomPermission={isCustomPermission}
                          sortBy={this.state.sortBy}
                          sortOrder={this.state.sortOrder}
                          sortItems={this.sortItems}
                          viewId={this.state.viewId}
                          viewType={this.props.viewType}
                          onToggleDetail={this.toggleDirentDetail}
                          onCloseDetail={this.closeDirentDetail}
                        />
                      </div>
                      }
                    </div>
                    <div className='cur-view-content lib-content-container' onScroll={this.onItemsScroll}>
                      {this.state.pathExist ?
                        <DirColumnView
                          isSidePanelFolded={this.props.isSidePanelFolded}
                          isTreePanelShown={this.state.isTreePanelShown}
                          isDirentDetailShow={this.state.isDirentDetailShow}
                          currentMode={this.state.currentMode}
                          path={this.state.path}
                          repoID={this.props.repoID}
                          currentRepoInfo={this.state.currentRepoInfo}
                          updateRepoInfo={this.updateRepoInfo}
                          isGroupOwnedRepo={this.state.isGroupOwnedRepo}
                          userPerm={userPerm}
                          showMdView={this.state.showMdView}
                          enableDirPrivateShare={enableDirPrivateShare}
                          isTreeDataLoading={this.state.isTreeDataLoading}
                          treeData={this.state.treeData}
                          currentNode={this.state.currentNode}
                          onNodeClick={this.onTreeNodeClick}
                          onNodeCollapse={this.onTreeNodeCollapse}
                          onNodeExpanded={this.onTreeNodeExpanded}
                          onRenameNode={this.onRenameTreeNode}
                          onDeleteNode={this.onDeleteTreeNode}
                          isViewFile={this.state.isViewFile}
                          isFileLoading={this.state.isFileLoading}
                          filePermission={this.state.filePermission}
                          content={this.state.content}
                          viewId={this.state.viewId}
                          tagId={this.state.tagId}
                          lastModified={this.state.lastModified}
                          latestContributor={this.state.latestContributor}
                          onLinkClick={this.onLinkClick}
                          isRepoInfoBarShow={isRepoInfoBarShow}
                          repoTags={this.state.repoTags}
                          usedRepoTags={this.state.usedRepoTags}
                          updateUsedRepoTags={this.updateUsedRepoTags}
                          isDirentListLoading={this.state.isDirentListLoading}
                          direntList={direntItemsList}
                          fullDirentList={this.state.direntList}
                          sortBy={this.state.sortBy}
                          sortOrder={this.state.sortOrder}
                          sortItems={this.sortItems}
                          onItemClick={this.onItemClick}
                          onItemSelected={this.onDirentSelected}
                          onItemDelete={this.onMainPanelItemDelete}
                          onItemRename={this.onMainPanelItemRename}
                          deleteFilesCallback={this.deleteItemsAjaxCallback}
                          renameFileCallback={this.renameItemAjaxCallback}
                          onItemMove={this.onMoveItem}
                          moveFileCallback={this.moveItemsAjaxCallback}
                          copyFileCallback={this.copyItemsAjaxCallback}
                          convertFileCallback={this.convertFileAjaxCallback}
                          onItemConvert={this.onConvertItem}
                          onDirentClick={this.onDirentClick}
                          updateDirent={this.updateDirent}
                          isAllItemSelected={this.state.isAllDirentSelected}
                          onAllItemSelected={this.onAllDirentSelected}
                          selectedDirentList={this.state.selectedDirentList}
                          onSelectedDirentListUpdate={this.onSelectedDirentListUpdate}
                          onItemsMove={this.onMoveItems}
                          onItemsDelete={this.onDeleteItems}
                          onFileTagChanged={this.onFileTagChanged}
                          showDirentDetail={this.showDirentDetail}
                          onItemsScroll={this.onItemsScroll}
                          eventBus={this.props.eventBus}
                          updateCurrentDirent={this.updateCurrentDirent}
                          updateCurrentPath={this.updatePath}
                          toggleShowDirentToolbar={this.toggleShowDirentToolbar}
                          updateTreeNode={this.updateTreeNode}
                          sortTreeNode={this.sortTreeNode}
                        />
                        :
                        <div className="message err-tip">{gettext('Folder does not exist.')}</div>
                      }
                      {!isCustomPermission && this.state.isDirentDetailShow && (
                        <Detail
                          path={detailPath}
                          repoID={this.props.repoID}
                          currentRepoInfo={{ ...this.state.currentRepoInfo }}
                          dirent={detailDirent}
                          selectedDirents={this.state.selectedDirentList}
                          repoTags={this.state.repoTags}
                          fileTags={this.state.isViewFile ? this.state.fileTags : []}
                          onFileTagChanged={this.onFileTagChanged}
                          onClose={this.closeDirentDetail}
                          currentMode={this.state.currentMode}
                        />
                      )}
                    </div>
                  </div>
                  {canUpload && this.state.pathExist && !this.state.isViewFile && ![METADATA_MODE, TAGS_MODE].includes(this.state.currentMode) && (
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
                  <Modal zIndex="1030" isOpen={!isDesktop && this.state.isTreePanelShown} toggle={this.toggleTreePanel} contentClassName="d-none"></Modal>
                </MediaQuery>
              </MetadataProvider>
            </MetadataMiddlewareProvider>
          </MetadataStatusProvider>
        </DndProvider>
      </FileOperationsProvider>
    );
  }
}

LibContentView.propTypes = propTypes;

export default LibContentView;
