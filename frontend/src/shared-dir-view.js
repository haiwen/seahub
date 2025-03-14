import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MD5 from 'MD5';
import { createRoot } from 'react-dom/client';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, UncontrolledTooltip } from 'reactstrap';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Account from './components/common/account';
import { useGoFileserver, fileServerRoot, gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle,
  thumbnailSizeForOriginal, thumbnailDefaultSize, thumbnailSizeForGrid } from './utils/constants';
import { Utils } from './utils/utils';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
import toaster from './components/toast';
import ModalPortal from './components/modal-portal';
import ZipDownloadDialog from './components/dialog/zip-download-dialog';
import ImageDialog from './components/dialog/image-dialog';
import FileUploader from './components/shared-link-file-uploader/file-uploader';
import SaveSharedDirDialog from './components/dialog/save-shared-dir-dialog';
import CopyMoveDirentProgressDialog from './components/dialog/copy-move-dirent-progress-dialog';
import RepoInfoBar from './components/repo-info-bar';
import RepoTag from './models/repo-tag';
import { LIST_MODE } from './components/dir-view-mode/constants';
import { MetadataAIOperationsProvider } from './hooks/metadata-ai-operation';
import ViewModes from './components/view-modes';
import SortMenu from './components/sort-menu';
import { TreeHelper, TreeNode, TreeView } from './components/shared-dir-tree-view';
import ResizeBar from './components/resize-bar';
import MobileItemMenu from './components/mobile-item-menu';
import {
  DRAG_HANDLER_HEIGHT, INIT_SIDE_PANEL_RATE, MAX_SIDE_PANEL_RATE, MIN_SIDE_PANEL_RATE
} from './components/resize-bar/constants';

import './css/layout.css';
import './css/header.css';
import './css/shared-dir-view.css';
import './css/grid-view.css';

dayjs.locale(window.app.config.lang);
dayjs.extend(relativeTime);

let loginUser = window.app.pageOptions.name;
let {
  token, dirName, dirPath, sharedBy,
  repoID, relativePath,
  mode, thumbnailSize,
  trafficOverLimit, canDownload,
  noQuota, canUpload, enableVideoThumbnail, enablePDFThumbnail
} = window.shared.pageOptions;

const showDownloadIcon = !trafficOverLimit && canDownload;

class SharedDirView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isTreeDataLoading: true,
      treeData: TreeHelper.buildTree(),

      // for resizing side/main panels
      inResizing: false,
      sidePanelRate: parseFloat(localStorage.getItem('sf_side_panel_rate') || INIT_SIDE_PANEL_RATE),

      isLoading: true,
      errorMsg: '',
      items: [],
      path: relativePath,

      isDropdownMenuOpen: false,
      currentMode: mode,

      isAllItemsSelected: false,
      selectedItems: [],

      sortBy: 'name', // 'name' or 'time' or 'size'
      sortOrder: 'asc', // 'asc' or 'desc'

      isZipDialogOpen: false,
      zipFolderPath: '',

      usedRepoTags: [],

      isSaveSharedDirDialogShow: false,
      itemsForSave: [],

      asyncCopyMoveTaskId: '',
      asyncOperationProgress: 0,
      asyncOperatedFilesLength: 0,
      isCopyMoveProgressDialogShow: false,

      isImagePopupOpen: false,
      imageItems: [],
      imageIndex: 0
    };

    this.resizeBarRef = React.createRef();
    this.dragHandlerRef = React.createRef();
  }

  componentDidMount() {
    if (trafficOverLimit) {
      toaster.danger(gettext('File download is disabled: the share link traffic of owner is used up.'), {
        duration: 3
      });
    }

    this.loadTreePanel();
    this.listItems();
    this.getShareLinkRepoTags();
  }

  loadTreePanel = () => {
    seafileAPI.listSharedDir(token, '/', thumbnailSize).then((res) => {
      const { dirent_list } = res.data;
      let tree = this.state.treeData;
      this.addResponseListToNode(dirent_list, tree.root);
      this.setState({
        isTreeDataLoading: false,
        treeData: tree
      });
    }).catch(() => {
      this.setState({ isTreeDataLoading: false });
    });
  };

  addResponseListToNode = (list, node) => {
    node.isLoaded = true;
    node.isExpanded = true;

    // only display folders in the tree
    const dirList = list.filter(item => item.is_dir);
    const direntList = Utils.sortDirentsInSharedDir(dirList, this.state.sortBy, this.state.sortOrder);

    const nodeList = direntList.map(object => {
      return new TreeNode({ object });
    });
    node.addChildren(nodeList);
  };

  listItems = () => {
    const { path, currentMode } = this.state;
    const thumbnailSize = currentMode == LIST_MODE ? thumbnailDefaultSize : thumbnailSizeForGrid;
    seafileAPI.listSharedDir(token, path, thumbnailSize).then((res) => {
      const items = res.data['dirent_list'].map(item => {
        item.isSelected = false;
        return item;
      });
      this.setState({
        isLoading: false,
        errorMsg: '',
        items: Utils.sortDirentsInSharedDir(items, this.state.sortBy, this.state.sortOrder)
      }, () => {
        this.getThumbnails(thumbnailSize);
      });
    }).catch((error) => {
      let errorMsg = Utils.getErrorMsg(error);
      this.setState({
        isLoading: false,
        errorMsg: errorMsg
      });
    });

    // update the URL
    let normalizedPath = '';
    if (path == '/') {
      normalizedPath = path;
    } else {
      normalizedPath = path[path.length - 1] === '/' ? path.slice(0, path.length - 1) : path;
    }
    let url = new URL(location.href);
    let searchParams = new URLSearchParams(url.search);
    searchParams.set('p', normalizedPath);
    searchParams.set('mode', currentMode);
    url.search = searchParams.toString();
    url = url.toString();
    window.history.pushState({ url: url, path: path }, path, url);
  };

  sortItems = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortDirentsInSharedDir(this.state.items, sortBy, sortOrder)
    });
  };

  getThumbnails = (thumbnailSize) => {
    let items = this.state.items.filter((item) => {
      return !item.is_dir &&
        (Utils.imageCheck(item.file_name) ||
        (enableVideoThumbnail && Utils.videoCheck(item.file_name)) ||
        (enablePDFThumbnail && Utils.pdfCheck(item.file_name))) &&
        !item.encoded_thumbnail_src;
    });
    if (items.length == 0) {
      return ;
    }

    const len = items.length;
    const _this = this;
    let getThumbnail = function (i) {
      const curItem = items[i];
      seafileAPI.getShareLinkThumbnail(token, curItem.file_path, thumbnailSize).then((res) => {
        curItem.encoded_thumbnail_src = res.data.encoded_thumbnail_src;
      }).catch((error) => {
        // do nothing
      }).then(() => {
        if (i < len - 1) {
          getThumbnail(++i);
        } else {
          // when done, `setState()`
          _this.setState({
            items: _this.state.items
          });
        }
      });
    };
    getThumbnail(0);
  };

  toggleDropdownMenu = () => {
    this.setState({
      isDropdownMenuOpen: !this.state.isDropdownMenuOpen
    });
  };

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.toggleDropdownMenu();
    }
  };

  onMenuItemKeyDown = (item, e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      item.onClick();
    }
  };

  visitFolder = (folderPath) => {
    this.setState({
      path: folderPath
    }, () => {
      this.listItems();
    });
  };

  renderPath = () => {
    let opList = [];
    if (showDownloadIcon) {
      opList.push({
        'icon': 'download1',
        'text': gettext('ZIP'),
        'onClick': this.zipDownloadFolder.bind(this, this.state.path)
      });

      if (canDownload && loginUser && (loginUser !== sharedBy)) {
        opList.push({
          'icon': 'save',
          'text': gettext('Save'),
          'onClick': this.saveAllItems
        });
      }
    }

    if (canUpload) {
      opList.push({
        'icon': 'upload-files',
        'disabled': noQuota,
        'title': noQuota ? gettext('The owner of this library has run out of space.') : '',
        'text': gettext('Upload'),
        'onClick': this.onUploadFile
      });
    }

    const zipped = []; // be compatible with the old code
    const rootItem = {
      path: '/',
      name: dirName
    };
    zipped.push(rootItem);
    const { path } = this.state;
    if (path != '/') {
      const normalizedPath = path[path.length - 1] === '/' ? path.slice(0, path.length - 1) : path;
      const pathList = normalizedPath.split('/');
      pathList.shift();
      let itemPath = '';
      const subItems = pathList.map((item, index) => {
        itemPath += '/' + item;
        return {
          path: itemPath + '/', // the ending '/' is necessary
          name: item
        };
      });
      zipped.push(...subItems);
    }

    return (
      <React.Fragment>
        {zipped.map((item, index) => {
          if (index != zipped.length - 1) {
            return (
              <React.Fragment key={index}>
                <span className="path-item" title={item.name} role="button" onClick={this.visitFolder.bind(this, item.path)}>{item.name}</span>
                <span className="path-split"> / </span>
              </React.Fragment>
            );
          }
          return null;
        })}
        {(!showDownloadIcon && !canUpload)
          ? <span className="path-item" title={zipped[zipped.length - 1].name}>{zipped[zipped.length - 1].name}</span>
          : (
            <Dropdown isOpen={this.state.isDropdownMenuOpen} toggle={this.toggleDropdownMenu}>
              <DropdownToggle
                tag="div"
                role="button"
                className="path-item path-item-dropdown-toggle"
                onClick={this.toggleDropdownMenu}
                onKeyDown={this.onDropdownToggleKeyDown}
                data-toggle="dropdown"
              >
                <span title={zipped[zipped.length - 1].name}>{zipped[zipped.length - 1].name}</span>
                {canUpload
                  ? <><i className="sf3-font-new sf3-font main-icon ml-2"></i><i className="sf3-font-down sf3-font"></i></>
                  : <i className="sf3-font-down sf3-font ml-1"></i>
                }
              </DropdownToggle>
              <DropdownMenu className='position-fixed'>
                {opList.map((item, index) => {
                  if (item == 'Divider') {
                    return <DropdownItem key={index} divider />;
                  } else {
                    return (
                      <DropdownItem
                        key={index}
                        onClick={item.onClick}
                        onKeyDown={this.onMenuItemKeyDown.bind(this, item)}
                        disabled={item.disabled || false}
                        title={item.title || ''}
                      >
                        <i className={`sf3-font-${item.icon} sf3-font mr-2 dropdown-item-icon`}></i>
                        {item.text}
                      </DropdownItem>
                    );
                  }
                })}
              </DropdownMenu>
            </Dropdown>
          )
        }
      </React.Fragment>
    );
  };

  zipDownloadFolder = (folderPath) => {
    if (!useGoFileserver) {
      this.setState({
        isZipDialogOpen: true,
        zipFolderPath: folderPath
      });
    }
    else {
      seafileAPI.getShareLinkZipTask(token, folderPath).then((res) => {
        const zipToken = res.data['zip_token'];
        location.href = `${fileServerRoot}zip/${zipToken}`;
      }).catch((error) => {
        let errorMsg = Utils.getErrorMsg(error);
        this.setState({
          isLoading: false,
          errorMsg: errorMsg
        });
      });
    }
  };

  zipDownloadSelectedItems = () => {
    const { path } = this.state;
    if (!useGoFileserver) {
      this.setState({
        isZipDialogOpen: true,
        zipFolderPath: path,
        selectedItems: this.state.items.filter(item => item.isSelected)
          .map(item => item.file_name || item.folder_name)
      });
    }
    else {
      let target = this.state.items.filter(item => item.isSelected).map(item => item.file_name || item.folder_name);
      seafileAPI.getShareLinkDirentsZipTask(token, path, target).then((res) => {
        const zipToken = res.data['zip_token'];
        location.href = `${fileServerRoot}zip/${zipToken}`;
      }).catch((error) => {
        let errorMsg = Utils.getErrorMsg(error);
        this.setState({
          isLoading: false,
          errorMsg: errorMsg
        });
      });
    }
  };

  async getAsyncCopyMoveProgress() {
    let { asyncCopyMoveTaskId } = this.state;
    try {
      let res = await seafileAPI.queryAsyncOperationProgress(asyncCopyMoveTaskId);
      let data = res.data;
      if (data.failed) {
        let message = gettext('Failed to copy files to another library.');
        toaster.danger(message);
        this.setState({
          asyncOperationProgress: 0,
          isCopyMoveProgressDialogShow: false,
        });
        return;
      }

      if (data.successful) {
        this.setState({
          asyncOperationProgress: 0,
          isCopyMoveProgressDialogShow: false,
        });
        let message = gettext('Successfully copied files to another library.');
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

  saveSelectedItems = () => {
    this.setState({
      isSaveSharedDirDialogShow: true,
      itemsForSave: this.state.items.filter(item => item.isSelected)
        .map(item => item.file_name || item.folder_name)
    });
  };

  saveAllItems = () => {
    this.setState({
      isSaveSharedDirDialogShow: true,
      itemsForSave: this.state.items
        .map(item => item.file_name || item.folder_name)
    });
  };

  toggleSaveSharedDirCancel = () => {
    this.setState({
      isSaveSharedDirDialogShow: false,
      itemsForSave: []
    });
  };

  handleSaveSharedDir = (destRepoID, dstPath) => {
    const { path, itemsForSave } = this.state;
    seafileAPI.saveSharedDir(destRepoID, dstPath, token, path, itemsForSave).then((res) => {
      this.setState({
        isSaveSharedDirDialogShow: false,
        itemsForSave: [],
        isCopyMoveProgressDialogShow: true,
        asyncCopyMoveTaskId: res.data.task_id,
        asyncOperatedFilesLength: itemsForSave.length,
      }, () => {
        this.getAsyncCopyMoveProgress();
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      this.setState({ errMessage: errMessage });
    });
  };

  onProgressDialogToggle = () => {
    let { asyncOperationProgress } = this.state;
    if (asyncOperationProgress !== 100) {
      let taskId = this.state.asyncCopyMoveTaskId;
      seafileAPI.cancelCopyMoveOperation(taskId);
    }

    this.setState({
      asyncOperationProgress: 0,
      isCopyMoveProgressDialogShow: false,
    });
  };

  closeZipDialog = () => {
    this.setState({
      isZipDialogOpen: false,
      zipFolderPath: '',
      selectedItems: []
    });
  };

  // for image popup
  prepareImageItem = (item) => {
    const name = item.file_name;
    const mtime = item.last_modified;
    const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
    const isGIF = fileExt == 'gif';

    let src;
    const fileURL = `${siteRoot}d/${token}/files/?p=${encodeURIComponent(item.file_path)}`;
    if (!isGIF) {
      src = `${siteRoot}thumbnail/${token}/${thumbnailSizeForOriginal}${Utils.encodePath(item.file_path)}?mtime=${mtime}`;
    } else {
      src = `${fileURL}&raw=1`;
    }

    return {
      'name': name,
      'url': fileURL,
      'parentDir': item.file_path.slice(0, item.file_path.indexOf(name)),
      'thumbnail': `${siteRoot}thumbnail/${token}/${thumbnailSizeForOriginal}${Utils.encodePath(item.file_path)}?mtime=${mtime}`,
      'src': src,
      'downloadURL': fileURL + '&dl=1'
    };
  };

  showImagePopup = (curItem) => {
    const items = this.state.items.filter((item) => {
      return !item.is_dir && Utils.imageCheck(item.file_name);
    });
    const imageItems = items.map((item) => {
      return this.prepareImageItem(item);
    });

    this.setState({
      isImagePopupOpen: true,
      imageItems: imageItems,
      imageIndex: items.indexOf(curItem)
    });
  };

  closeImagePopup = () => {
    this.setState({
      isImagePopupOpen: false
    });
  };

  moveToPrevImage = () => {
    const imageItemsLength = this.state.imageItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + imageItemsLength - 1) % imageItemsLength
    }));
  };

  moveToNextImage = () => {
    const imageItemsLength = this.state.imageItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + 1) % imageItemsLength
    }));
  };

  unselectItems = () => {
    this.setState({
      isAllItemsSelected: false,
      items: this.state.items.map((item) => {
        item.isSelected = false;
        return item;
      })
    });
  };

  toggleAllSelected = () => {
    this.setState((prevState) => ({
      isAllItemsSelected: !prevState.isAllItemsSelected,
      items: this.state.items.map((item) => {
        item.isSelected = !prevState.isAllItemsSelected;
        return item;
      })
    }));
  };

  toggleItemSelected = (targetItem, isSelected) => {
    this.setState({
      items: this.state.items.map((item) => {
        if (item === targetItem) {
          item.isSelected = isSelected;
        }
        return item;
      })
    }, () => {
      this.setState({
        isAllItemsSelected: !this.state.items.some(item => !item.isSelected)
      });
    });
  };

  onUploadFile = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.uploader.onFileUpload();
  };

  onFileUploadSuccess = (direntObject) => {
    const { path } = this.state;
    const { name, size } = direntObject;
    const newItem = {
      isSelected: false,
      file_name: name,
      file_path: Utils.joinPath(path, name),
      is_dir: false,
      last_modified: dayjs().format(),
      size: size
    };
    const folderItems = this.state.items.filter(item => { return item.is_dir; });
    // put the new file as the first file
    let items = Array.from(this.state.items);
    items.splice(folderItems.length, 0, newItem);
    this.setState({ items: items });
    seafileAPI.shareLinksUploadDone(token, Utils.joinPath(dirPath, name));
  };

  getShareLinkRepoTags = () => {
    seafileAPI.getShareLinkRepoTags(token).then(res => {
      let usedRepoTags = [];
      res.data.repo_tags.forEach(item => {
        let usedRepoTag = new RepoTag(item);
        if (usedRepoTag.fileCount > 0) {
          usedRepoTags.push(usedRepoTag);
        }
      });
      this.setState({ usedRepoTags: usedRepoTags });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  switchMode = (mode) => {
    const { currentMode } = this.state;
    if (mode == currentMode) {
      return;
    } else {
      this.setState({
        currentMode: mode,
        isLoading: true
      }, () => {
        this.listItems();
      });
    }
  };

  onSelectSortOption = (item) => {
    const [sortBy, sortOrder] = item.value.split('-');
    this.sortItems(sortBy, sortOrder);
  };

  onTreeNodeCollapse = (node) => {
    const tree = TreeHelper.collapseNode(this.state.treeData, node);
    this.setState({ treeData: tree });
  };

  onTreeNodeExpanded = (node) => {
    let tree = this.state.treeData.clone();
    node = tree.getNodeByPath(node.path);
    if (!node.isLoaded) {
      seafileAPI.listSharedDir(token, node.path, thumbnailSize).then((res) => {
        const { dirent_list } = res.data;
        this.addResponseListToNode(dirent_list, node);
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

  onTreeNodeClick = (node) => {
    if (node.object.is_dir) {
      if (node.isLoaded && node.path === this.state.path) {
        if (node.isExpanded) {
          let tree = TreeHelper.collapseNode(this.state.treeData, node);
          this.setState({ treeData: tree });
        } else {
          let tree = this.state.treeData.clone();
          node = tree.getNodeByPath(node.path);
          tree.expandNode(node);
          this.setState({ treeData: tree });
        }
      }

      if (!node.isLoaded) {
        let tree = this.state.treeData.clone();
        node = tree.getNodeByPath(node.path);
        seafileAPI.listSharedDir(token, node.path, thumbnailSize).then((res) => {
          const { dirent_list } = res.data;
          this.addResponseListToNode(dirent_list, node);
          tree.collapseNode(node);
          this.setState({ treeData: tree });
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }

      if (node.path === this.state.path) {
        return;
      }
      this.visitFolder(node.path);
    }
  };

  onResizeMouseUp = () => {
    if (this.state.inResizing) {
      this.setState({
        inResizing: false
      });
    }
    localStorage.setItem('sf_side_panel_rate', this.state.sidePanelRate);
  };

  onResizeMouseDown = () => {
    this.setState({
      inResizing: true
    });
  };

  onResizeMouseMove = (e) => {
    let rate = e.nativeEvent.clientX / window.innerWidth;
    this.setState({
      sidePanelRate: Math.max(Math.min(rate, MAX_SIDE_PANEL_RATE), MIN_SIDE_PANEL_RATE),
    });
  };

  onResizeMouseOver = (event) => {
    if (!this.dragHandlerRef.current) return;
    const { top } = this.resizeBarRef.current.getBoundingClientRect();
    const dragHandlerRefTop = event.pageY - top - DRAG_HANDLER_HEIGHT / 2;
    this.setDragHandlerTop(dragHandlerRefTop);
  };

  setDragHandlerTop = (top) => {
    this.dragHandlerRef.current.style.top = top + 'px';
  };

  render() {
    const {
      usedRepoTags, currentMode: mode,
      sortBy, sortOrder, isTreeDataLoading, treeData, path,
      sidePanelRate, inResizing
    } = this.state;

    const mainPanelStyle = {
      userSelect: inResizing ? 'none' : '',
      flex: sidePanelRate ? `1 0 ${(1 - sidePanelRate) * 100}%` : `0 0 ${100 - INIT_SIDE_PANEL_RATE * 100}%`,
    };
    const sidePanelStyle = {
      userSelect: inResizing ? 'none' : '',
      flex: sidePanelRate ? `0 0 ${sidePanelRate * 100}%` : `0 0 ${INIT_SIDE_PANEL_RATE * 100}%`,
    };

    const isDesktop = Utils.isDesktop();
    const selectedItemsLength = this.state.items.filter(item => item.isSelected).length;
    const isRepoInfoBarShown = isDesktop && path == '/' && usedRepoTags.length != 0;

    return (
      <MetadataAIOperationsProvider repoID={repoID} enableMetadata={false} enableOCR={false} repoInfo={{ permission: 'r' }} >
        <div id="shared-dir-view" className="h-100 d-flex flex-column">
          <div className="top-header d-flex justify-content-between flex-shrink-0">
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
            {loginUser && <Account />}
          </div>
          <div
            className="flex-fill d-flex o-hidden position-relative"
            onMouseMove={inResizing ? this.onResizeMouseMove : null}
            onMouseUp={this.onResizeMouseUp}
          >
            <div className="side-panel" style={sidePanelStyle}>
              <div className="meta-info py-4 mx-4">
                <h2 className="h3 text-truncate mb-4" title={dirName}>{dirName}</h2>
                <p className="m-0">{gettext('Shared by: ')}{sharedBy}</p>
              </div>
              <div className="p-4 flex-fill o-auto">
                {isTreeDataLoading ? <Loading /> : (
                  <TreeView
                    currentPath={path}
                    treeData={treeData}
                    onNodeExpanded={this.onTreeNodeExpanded}
                    onNodeCollapse={this.onTreeNodeCollapse}
                    onNodeClick={this.onTreeNodeClick}
                  />
                )}
              </div>
            </div>
            {isDesktop &&
            <ResizeBar
              resizeBarRef={this.resizeBarRef}
              dragHandlerRef={this.dragHandlerRef}
              resizeBarStyle={{ left: `calc(${sidePanelRate ? sidePanelRate * 100 + '%' : `${INIT_SIDE_PANEL_RATE * 100}%`} - 1px)` }}
              dragHandlerStyle={{ height: DRAG_HANDLER_HEIGHT }}
              onResizeMouseDown={this.onResizeMouseDown}
              onResizeMouseOver={this.onResizeMouseOver}
            />
            }
            <div className="main-panel cur-view-container" style={mainPanelStyle}>
              <div className="cur-view-path d-flex justify-content-between align-items-center">
                <div className="cur-view-path-left flex-fill o-hidden">
                  {(showDownloadIcon && this.state.items.some(item => item.isSelected))
                    ? (
                      <div className="selected-items-toolbar">
                        <span className="cur-view-path-btn px-1" onClick={this.unselectItems}>
                          <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
                          <span>{`${selectedItemsLength} ${gettext('selected')}`}</span>
                        </span>
                        <span className="cur-view-path-btn ml-4" onClick={this.zipDownloadSelectedItems}>
                          <span className="sf3-font-download1 sf3-font" aria-label={gettext('Download')} title={gettext('Download')}></span>
                        </span>
                        {(canDownload && loginUser && (loginUser !== sharedBy)) &&
                        <span className="cur-view-path-btn ml-4" onClick={this.saveSelectedItems}>
                          <span className="sf3-font-save sf3-font" aria-label={gettext('Save')} title={gettext('Save')}></span>
                        </span>
                        }
                      </div>
                    )
                    : (
                      <div className="path-container">
                        <span className="mr-2">{gettext('Current path: ')}</span>
                        {this.renderPath()}
                      </div>
                    )
                  }
                </div>
                <div className="cur-view-path-right">
                  {isDesktop && (
                    <>
                      <ViewModes currentViewMode={mode} switchViewMode={this.switchMode} />
                      <SortMenu sortBy={sortBy} sortOrder={sortOrder} onSelectSortOption={this.onSelectSortOption} />
                    </>
                  )}
                </div>
              </div>
              {!noQuota && canUpload && (
                <FileUploader
                  ref={uploader => this.uploader = uploader}
                  dragAndDrop={false}
                  token={token}
                  path={dirPath === '/' ? dirPath : dirPath.replace(/\/+$/, '')}
                  relativePath={path === '/' ? path : path.replace(/\/+$/, '')}
                  repoID={repoID}
                  onFileUploadSuccess={this.onFileUploadSuccess}
                />
              )}

              <div className="cur-view-content p-0">
                {isRepoInfoBarShown && (
                  <RepoInfoBar
                    repoID={repoID}
                    currentPath={'/'}
                    usedRepoTags={this.state.usedRepoTags}
                    shareLinkToken={token}
                    enableFileDownload={showDownloadIcon}
                  />
                )}

                <Content
                  isDesktop={isDesktop}
                  isLoading={this.state.isLoading}
                  errorMsg={this.state.errorMsg}
                  mode={mode}
                  items={this.state.items}
                  sortBy={this.state.sortBy}
                  sortOrder={this.state.sortOrder}
                  sortItems={this.sortItems}
                  isAllItemsSelected={this.state.isAllItemsSelected}
                  toggleAllSelected={this.toggleAllSelected}
                  toggleItemSelected={this.toggleItemSelected}
                  visitFolder={this.visitFolder}
                  zipDownloadFolder={this.zipDownloadFolder}
                  showImagePopup={this.showImagePopup}
                />
              </div>
            </div>
          </div>
        </div>
        {this.state.isZipDialogOpen &&
        <ModalPortal>
          <ZipDownloadDialog
            token={token}
            path={this.state.zipFolderPath}
            target={this.state.selectedItems}
            toggleDialog={this.closeZipDialog}
          />
        </ModalPortal>
        }
        {this.state.isSaveSharedDirDialogShow &&
          <SaveSharedDirDialog
            sharedToken={token}
            parentDir={path}
            items={this.state.itemsForSave}
            toggleCancel={this.toggleSaveSharedDirCancel}
            handleSaveSharedDir={this.handleSaveSharedDir}
          />
        }
        {this.state.isCopyMoveProgressDialogShow && (
          <CopyMoveDirentProgressDialog
            type='copy'
            asyncOperatedFilesLength={this.state.asyncOperatedFilesLength}
            asyncOperationProgress={this.state.asyncOperationProgress}
            toggleDialog={this.onProgressDialogToggle}
          />
        )}
        {this.state.isImagePopupOpen &&
        <ModalPortal>
          <ImageDialog
            repoID={repoID}
            repoInfo={{ 'permission': 'r' }}
            imageItems={this.state.imageItems}
            imageIndex={this.state.imageIndex}
            closeImagePopup={this.closeImagePopup}
            moveToPrevImage={this.moveToPrevImage}
            moveToNextImage={this.moveToNextImage}
            enableRotate={false}
            isCustomPermission={true}
          />
        </ModalPortal>
        }
      </MetadataAIOperationsProvider>
    );
  }
}

class Content extends React.Component {

  constructor(props) {
    super(props);
  }

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortByTime = (e) => {
    e.preventDefault();
    const sortBy = 'time';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  sortBySize = (e) => {
    e.preventDefault();
    const sortBy = 'size';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  render() {
    const {
      isDesktop,
      isLoading, errorMsg, mode, items,
      sortBy, sortOrder,
      isAllItemsSelected
    } = this.props;

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-6 text-center">{errorMsg}</p>;
    }

    const tbody = (
      <tbody>
        {items.map((item, index) => {
          return <Item
            key={index}
            isDesktop={isDesktop}
            mode={mode}
            item={item}
            visitFolder={this.props.visitFolder}
            zipDownloadFolder={this.props.zipDownloadFolder}
            showImagePopup={this.props.showImagePopup}
            toggleItemSelected={this.props.toggleItemSelected}
          />;
        })}
      </tbody>
    );

    if (!isDesktop) {
      return (
        <table className="table-hover table-thead-hidden">
          <thead>
            <tr>
              <th width="12%"></th>
              <th width="80%"></th>
              <th width="8%"></th>
            </tr>
          </thead>
          {tbody}
        </table>
      );
    }

    const sortIcon = <span className={`sf3-font ${sortOrder == 'asc' ? 'sf3-font-down rotate-180 d-inline-block' : 'sf3-font-down'}`}></span>;
    return mode == LIST_MODE ? (
      <div className="table-container">
        <table className="table-hover">
          <thead>
            <tr>
              {showDownloadIcon &&
              <th width="3%" className="text-center">
                <input type="checkbox" checked={isAllItemsSelected} onChange={this.props.toggleAllSelected} />
              </th>
              }
              <th width="5%"></th>
              <th width={showDownloadIcon ? '50%' : '53%'}><a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortBy == 'name' && sortIcon}</a></th>
              <th width="8%"></th>
              <th width="14%"><a className="d-block table-sort-op" href="#" onClick={this.sortBySize}>{gettext('Size')} {sortBy == 'size' && sortIcon}</a></th>
              <th width="13%"><a className="d-block table-sort-op" href="#" onClick={this.sortByTime}>{gettext('Last Update')} {sortBy == 'time' && sortIcon}</a></th>
              <th width="7%"></th>
            </tr>
          </thead>
          {tbody}
        </table>
      </div>
    ) : (
      <ul className="grid-view">
        {items.map((item, index) => {
          return <GridItem
            key={index}
            mode={mode}
            item={item}
            visitFolder={this.props.visitFolder}
            zipDownloadFolder={this.props.zipDownloadFolder}
            showImagePopup={this.props.showImagePopup}
          />;
        })}
      </ul>
    );
  }
}

Content.propTypes = {
  isDesktop: PropTypes.bool,
  isLoading: PropTypes.bool,
  isAllItemsSelected: PropTypes.bool,
  errorMsg: PropTypes.string,
  mode: PropTypes.string,
  items: PropTypes.array,
  sortItems: PropTypes.func,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  toggleAllSelected: PropTypes.func,
  toggleItemSelected: PropTypes.func,
  zipDownloadFolder: PropTypes.func,
  showImagePopup: PropTypes.func,
  visitFolder: PropTypes.func.isRequired
};

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isIconShown: false,
      isOpMenuOpen: false
    };
  }

  toggleOpMenu = () => {
    this.setState({ isOpMenuOpen: !this.state.isOpMenuOpen });
  };

  handleMouseOver = () => {
    this.setState({ isIconShown: true });
  };

  handleMouseOut = () => {
    this.setState({ isIconShown: false });
  };

  zipDownloadFolder = (e) => {
    e.preventDefault();
    this.props.zipDownloadFolder.bind(this, this.props.item.folder_path)();
  };

  handleFileClick = (e) => {
    const item = this.props.item;
    if (!Utils.imageCheck(item.file_name)) {
      return;
    }

    e.preventDefault();
    this.props.showImagePopup(item);
  };

  toggleItemSelected = (e) => {
    this.props.toggleItemSelected(this.props.item, e.target.checked);
  };

  onFolderItemClick = (e) => {
    e.preventDefault();
    const { item } = this.props;
    const { folder_path } = item;
    this.props.visitFolder(folder_path);
  };

  render() {
    const { item, isDesktop, mode } = this.props;
    const { isIconShown } = this.state;

    let toolTipID = '';
    let tagTitle = '';
    if (item.file_tags && item.file_tags.length > 0) {
      toolTipID = MD5(item.file_name).slice(0, 7);
      tagTitle = item.file_tags.map(item => item.tag_name).join(' ');
    }

    if (item.is_dir) {
      return isDesktop ? (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
          {showDownloadIcon &&
            <td className="text-center">
              <input type="checkbox" checked={item.isSelected} onChange={this.toggleItemSelected} />
            </td>
          }
          <td className="text-center"><img src={Utils.getFolderIconUrl()} alt="" width="24" /></td>
          <td>
            <a href={`?p=${encodeURIComponent(item.folder_path.substr(0, item.folder_path.length - 1))}&mode=${mode}`} onClick={this.onFolderItemClick}>{item.folder_name}</a>
          </td>
          <td></td>
          <td></td>
          <td title={dayjs(item.last_modified).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(item.last_modified).fromNow()}</td>
          <td>
            {showDownloadIcon &&
            <a role="button" className={`op-icon sf3-font sf3-font-download1${isIconShown ? '' : ' invisible'}`} href="#" onClick={this.zipDownloadFolder} title={gettext('Download')} aria-label={gettext('Download')}>
            </a>
            }
          </td>
        </tr>
      ) : (
        <tr>
          <td className="text-center"><img src={Utils.getFolderIconUrl()} alt="" width="24" /></td>
          <td>
            <a href={`?p=${encodeURIComponent(item.folder_path.substr(0, item.folder_path.length - 1))}&mode=${mode}`} onClick={this.onFolderItemClick}>{item.folder_name}</a>
            <br />
            <span className="item-meta-info">{dayjs(item.last_modified).fromNow()}</span>
          </td>
          <td>
            {showDownloadIcon &&
              <MobileItemMenu>
                <DropdownItem className="mobile-menu-item" onClick={this.zipDownloadFolder}>{gettext('Download')}</DropdownItem>
              </MobileItemMenu>
            }
          </td>
        </tr>
      );
    } else {
      const fileURL = `${siteRoot}d/${token}/files/?p=${encodeURIComponent(item.file_path)}`;
      const thumbnailURL = item.encoded_thumbnail_src ? `${siteRoot}${item.encoded_thumbnail_src}?mtime=${item.last_modified}` : '';
      return isDesktop ? (
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
          {showDownloadIcon &&
            <td className="text-center">
              <input type="checkbox" checked={item.isSelected} onChange={this.toggleItemSelected} />
            </td>
          }
          <td className="text-center">
            {thumbnailURL ?
              <img className="thumbnail" src={thumbnailURL} alt="" /> :
              <img src={Utils.getFileIconUrl(item.file_name)} alt="" width="24" />
            }
          </td>
          <td>
            <a href={fileURL} onClick={this.handleFileClick}>{item.file_name}</a>
          </td>
          <td className="tag-list-title">
            {(item.file_tags && item.file_tags.length > 0) && (
              <Fragment>
                <div id={`tag-list-title-${toolTipID}`} className="dirent-item tag-list tag-list-stacked">
                  {item.file_tags.map((fileTag, index) => {
                    let length = item.file_tags.length;
                    return (
                      <span className="file-tag" key={fileTag.file_tag_id} style={{ zIndex: length - index, backgroundColor: fileTag.tag_color }}></span>
                    );
                  })}
                </div>
                <UncontrolledTooltip target={`tag-list-title-${toolTipID}`} placement="bottom">
                  {tagTitle}
                </UncontrolledTooltip>
              </Fragment>
            )}
          </td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td title={dayjs(item.last_modified).format('dddd, MMMM D, YYYY h:mm:ss A')}>{dayjs(item.last_modified).fromNow()}</td>
          <td>
            {showDownloadIcon &&
            <a className={`op-icon sf3-font sf3-font-download1${isIconShown ? '' : ' invisible'}`} href={`${fileURL}&dl=1`} title={gettext('Download')} aria-label={gettext('Download')}></a>
            }
          </td>
        </tr>
      ) : (
        <tr>
          <td className="text-center">
            {thumbnailURL ?
              <img className="thumbnail" src={thumbnailURL} alt="" /> :
              <img src={Utils.getFileIconUrl(item.file_name)} alt="" width="24" />
            }
          </td>
          <td>
            <a href={fileURL} onClick={this.handleFileClick}>{item.file_name}</a>
            <br />
            <span className="item-meta-info">{Utils.bytesToSize(item.size)}</span>
            <span className="item-meta-info">{dayjs(item.last_modified).fromNow()}</span>
          </td>
          <td>
            {showDownloadIcon &&
              <MobileItemMenu>
                <DropdownItem className="mobile-menu-item" tag="a" href={`${fileURL}&dl=1`}>{gettext('Download')}</DropdownItem>
              </MobileItemMenu>
            }
          </td>
        </tr>
      );
    }
  }
}

Item.propTypes = {
  isDesktop: PropTypes.bool,
  mode: PropTypes.string,
  item: PropTypes.object,
  sortItems: PropTypes.func,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  toggleAllSelected: PropTypes.func,
  toggleItemSelected: PropTypes.func,
  zipDownloadFolder: PropTypes.func,
  showImagePopup: PropTypes.func,
  visitFolder: PropTypes.func.isRequired
};

class GridItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isIconShown: false
    };
  }

  handleMouseOver = () => {
    this.setState({ isIconShown: true });
  };

  handleMouseOut = () => {
    this.setState({ isIconShown: false });
  };

  zipDownloadFolder = (e) => {
    e.preventDefault();
    this.props.zipDownloadFolder.bind(this, this.props.item.folder_path)();
  };

  handleFileClick = (e) => {
    const item = this.props.item;
    if (!Utils.imageCheck(item.file_name)) {
      return;
    }

    e.preventDefault();
    this.props.showImagePopup(item);
  };

  onFolderItemClick = (e) => {
    e.preventDefault();
    const { item } = this.props;
    const { folder_path } = item;
    this.props.visitFolder(folder_path);
  };

  render() {
    const { item, mode } = this.props;
    const { isIconShown } = this.state;

    if (item.is_dir) {
      const folderURL = `?p=${encodeURIComponent(item.folder_path.substr(0, item.folder_path.length - 1))}&mode=${mode}`;
      return (
        <li className="grid-item" onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
          <a href={folderURL} className="grid-file-img-link d-block" onClick={this.onFolderItemClick}>
            <img src={Utils.getFolderIconUrl(false, 192)} alt="" width="80" height="80" />
          </a>
          <a href={folderURL} className="grid-file-name grid-file-name-link" onClick={this.onFolderItemClick}>{item.folder_name}</a>
          {showDownloadIcon &&
            <a role="button" className={`action-icon sf3-font sf3-font-download1${isIconShown ? '' : ' invisible'}`} href="#" onClick={this.zipDownloadFolder} title={gettext('Download')} aria-label={gettext('Download')}>
            </a>
          }
        </li>
      );
    } else {
      const fileURL = `${siteRoot}d/${token}/files/?p=${encodeURIComponent(item.file_path)}`;
      const thumbnailURL = item.encoded_thumbnail_src ? `${siteRoot}${item.encoded_thumbnail_src}?mtime=${item.last_modified}` : '';
      return (
        <li className="grid-item" onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
          <a href={fileURL} className="grid-file-img-link d-block" onClick={this.handleFileClick}>
            {thumbnailURL ?
              <img className="thumbnail" src={thumbnailURL} alt="" /> :
              <img src={Utils.getFileIconUrl(item.file_name)} alt="" width="80" height="80" />
            }
          </a>
          <a href={fileURL} className="grid-file-name grid-file-name-link" onClick={this.handleFileClick}>{item.file_name}</a>
          {showDownloadIcon &&
            <a className={`action-icon sf3-font sf3-font-download1${isIconShown ? '' : ' invisible'}`} href={`${fileURL}&dl=1`} title={gettext('Download')} aria-label={gettext('Download')}>
            </a>
          }
        </li>
      );
    }
  }
}

GridItem.propTypes = {
  mode: PropTypes.string,
  item: PropTypes.object,
  zipDownloadFolder: PropTypes.func,
  showImagePopup: PropTypes.func,
  visitFolder: PropTypes.func.isRequired
};

const root = createRoot(document.getElementById('wrapper'));
root.render(<SharedDirView />);
