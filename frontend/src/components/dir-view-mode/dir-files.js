import React from 'react';
import PropTypes from 'prop-types';
import Cookies from 'js-cookie';
import TreeView from '../tree-view/tree-view';
import ModalPortal from '../modal-portal';
import ImageDialog from '../dialog/image-dialog';
import toaster from '../toast';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import { fileServerRoot, gettext, siteRoot, thumbnailSizeForOriginal, thumbnailDefaultSize, SF_DIRECTORY_TREE_SORT_BY_KEY, SF_DIRECTORY_TREE_SORT_ORDER_KEY } from '../../utils/constants';
import { isMobile, Utils } from '../../utils/utils';
import TextTranslation from '../../utils/text-translation';
import TreeSection from '../tree-section';
import imageAPI from '../../utils/image-api';
import { seafileAPI } from '../../utils/seafile-api';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  treeData: PropTypes.object.isRequired,
  userPerm: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  direntList: PropTypes.array,
  currentNode: PropTypes.object,
  eventBus: PropTypes.object,
  getMenuContainerSize: PropTypes.func,
  onNodeClick: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onDeleteNode: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  updateDirent: PropTypes.func,
  sortTreeNode: PropTypes.func,
};

const SORT_KEY_MAP = {
  'name-asc': TextTranslation.ASCENDING_BY_NAME.key,
  'name-desc': TextTranslation.DESCENDING_BY_NAME.key,
};

class DirFiles extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      opNode: null,
      isAddFileDialogShow: false,
      isAddFolderDialogShow: false,
      isNodeImagePopupOpen: false,
      imageNodeItems: [],
      imageIndex: 0,
      operationList: [],
      isDisplayFiles: localStorage.getItem('sf_display_files') === 'true' || false,
      sortKey: TextTranslation.ASCENDING_BY_NAME.key,
    };
    this.isNodeMenuShow = true;
    this.imageItemsSnapshot = [];
    this.imageIndexSnapshot = 0;
  }

  componentDidMount() {
    const sortBy = Cookies.get(SF_DIRECTORY_TREE_SORT_BY_KEY) || 'name';
    const sortOrder = Cookies.get(SF_DIRECTORY_TREE_SORT_ORDER_KEY) || 'asc';
    const sortKey = SORT_KEY_MAP[`${sortBy}-${sortOrder}`];
    this.setState({ sortKey });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.direntList.length < this.props.direntList.length && this.state.isNodeImagePopupOpen) {
      if (this.state.imageNodeItems.length === 0) {
        this.setState({
          isNodeImagePopupOpen: false,
        });
      } else {
        this.setState({
          imageNodeItems: this.imageItemsSnapshot,
          imageIndex: this.imageIndexSnapshot,
        });
      }
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({ opNode: nextProps.currentNode });
  }

  getMenuList = () => {
    const { userPerm } = this.props;
    const { sortKey } = this.state;
    const list = [];
    if (userPerm == 'rw') {
      list.push(
        TextTranslation.NEW_FOLDER,
        TextTranslation.NEW_FILE
      );
    }
    list.push({ ...TextTranslation.DISPLAY_FILES, tick: this.state.isDisplayFiles });
    list.push('Divider');
    list.push({ ...TextTranslation.ASCENDING_BY_NAME, tick: sortKey === TextTranslation.ASCENDING_BY_NAME.key });
    list.push({ ...TextTranslation.DESCENDING_BY_NAME, tick: sortKey === TextTranslation.DESCENDING_BY_NAME.key });
    return list;
  };

  onNodeClick = (node) => {
    this.setState({ opNode: node });
    if (Utils.imageCheck(node?.object?.name || '')) {
      this.showNodeImagePopup(node);
      return;
    }
    this.props.onNodeClick(node);
  };

  onMoreOperationClick = (operation) => {
    this.onMenuItemClick(operation);
  };

  onMenuItemClick = (operation, node) => {
    const { eventBus, treeData, onRenameNode } = this.props;
    this.setState({ opNode: node });
    switch (operation) {
      case 'New Folder': {
        const validNode = node || treeData.root;
        const parentNode = validNode.parentNode ? validNode.parentNode : validNode;
        const children = parentNode.children.map(item => item.object);
        eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FOLDER, validNode.path, children);
        break;
      }
      case 'New File': {
        const validNode = node || treeData.root;
        const parentNode = validNode.parentNode ? validNode.parentNode : validNode;
        const children = parentNode.children.map(item => item.object);
        eventBus.dispatch(EVENT_BUS_TYPE.CREATE_FILE, validNode.path, children);
        break;
      }
      case 'Rename': {
        const parentNode = node.parentNode ? node.parentNode : node;
        const children = parentNode.children.map(item => item.object);
        eventBus.dispatch(EVENT_BUS_TYPE.RENAME_FILE, node.object, children, (newName) => onRenameNode(node, newName));
        break;
      }
      case 'Delete':
        this.onDeleteNode(node);
        break;
      case 'Copy': {
        const path = node.parentNode.path;
        const dirent = node.object;
        eventBus.dispatch(EVENT_BUS_TYPE.COPY_FILE, path, dirent, false);
        break;
      }
      case 'Move': {
        const path = node.parentNode.path;
        const dirent = node.object;
        eventBus.dispatch(EVENT_BUS_TYPE.MOVE_FILE, path, dirent, false);
        break;
      }
      case 'Open in New Tab':
        this.onOpenFile(node);
        break;
      case 'Display files':
        this.onDisplayFilesToggle();
        break;
      case 'Ascending by name': {
        this.props.sortTreeNode('name', 'asc');
        this.setState({ sortKey: TextTranslation.ASCENDING_BY_NAME.key });
        break;
      }
      case 'Descending by name': {
        this.props.sortTreeNode('name', 'desc');
        this.setState({ sortKey: TextTranslation.DESCENDING_BY_NAME.key });
        break;
      }
    }
  };

  onDeleteNode = (node) => {
    this.props.onDeleteNode(node);
  };

  onOpenFile = (node) => {
    let newUrl = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(node.path);
    window.open(newUrl, '_blank');
  };

  onDisplayFilesToggle = () => {
    this.setState({ isDisplayFiles: !this.state.isDisplayFiles }, () => {
      localStorage.setItem('sf_display_files', this.state.isDisplayFiles);
    });
  };

  checkDuplicatedName = (newName) => {
    let node = this.state.opNode;
    // root node to new node conditions: parentNode is null,
    let parentNode = node.parentNode ? node.parentNode : node;
    let childrenObject = parentNode.children.map(item => {
      return item.object;
    });
    let isDuplicated = childrenObject.some(object => {
      return object.name === newName;
    });
    return isDuplicated;
  };

  showNodeImagePopup = (node) => {
    let childrenNode = node.parentNode.children;
    let items = childrenNode.filter((item) => {
      return Utils.imageCheck(item.object.name);
    });
    let imageNames = items.map((item) => {
      return item.object.name;
    });
    this.setState({
      isNodeImagePopupOpen: true,
      imageNodeItems: this.prepareImageItems(node),
      imageIndex: imageNames.indexOf(node.object.name)
    });
  };

  prepareImageItems = (node) => {
    let childrenNode = node.parentNode.children;
    let items = childrenNode.filter((item) => {
      return Utils.imageCheck(item.object.name);
    });

    const repoEncrypted = this.props.currentRepoInfo.encrypted;
    const repoID = this.props.repoID;
    let prepareItem = (item) => {
      const { name, mtime, id } = item.object;
      const path = Utils.encodePath(Utils.joinPath(node.parentNode.path, name));
      const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
      const isGIF = fileExt === 'gif';
      const src = `${siteRoot}repo/${repoID}/raw${path}`;
      let thumbnail = '';
      if (repoEncrypted || isGIF) {
        thumbnail = src;
      } else {
        thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}?mtime=${mtime}`;
      }
      return {
        id,
        name,
        parentDir: node.parentNode.path,
        src,
        thumbnail,
        'url': `${siteRoot}lib/${repoID}/file${path}`,
        'node': items.find(item => item.path.split('/').pop() === name),
        'downloadURL': `${fileServerRoot}repos/${repoID}/files${path}/?op=download`,
      };
    };

    return items.map((item) => { return prepareItem(item); });
  };

  closeNodeImagePopup = () => {
    this.setState({
      isNodeImagePopupOpen: false
    });
  };

  moveToPrevImage = () => {
    const imageItemsLength = this.state.imageNodeItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + imageItemsLength - 1) % imageItemsLength
    }));
  };

  moveToNextImage = () => {
    const imageItemsLength = this.state.imageNodeItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + 1) % imageItemsLength
    }));
  };

  deleteImage = () => {
    this.imageItemsSnapshot = this.state.imageNodeItems;
    this.imageIndexSnapshot = this.state.imageIndex;

    if (this.state.imageNodeItems.length > this.state.imageIndex) {
      this.props.onDeleteNode(this.state.imageNodeItems[this.state.imageIndex].node);
    }
    const imageNodeItems = this.state.imageNodeItems.filter((item, index) => index !== this.state.imageIndex);

    if (!imageNodeItems.length) {
      this.setState({
        isNodeImagePopupOpen: false,
        imageNodeItems: [],
        imageIndex: 0
      });
    } else {
      this.setState((prevState) => ({
        imageNodeItems: imageNodeItems,
        imageIndex: (prevState.imageIndex + 1) % imageNodeItems.length,
      }));
    }
  };

  handleError = (error) => {
    toaster.danger(Utils.getErrorMsg(error));
  };

  rotateImage = (imageIndex, angle) => {
    if (imageIndex >= 0 && angle !== 0) {
      let { repoID } = this.props;
      let imageName = this.state.imageNodeItems[imageIndex].name;
      let path = this.state.opNode.path;
      imageAPI.rotateImage(repoID, path, 360 - angle).then((res) => {
        seafileAPI.createThumbnail(repoID, path, thumbnailDefaultSize).then((res) => {
          // Generate a unique query parameter to bust the cache
          const cacheBuster = new Date().getTime();
          const newThumbnailSrc = `${res.data.encoded_thumbnail_src}?t=${cacheBuster}`;

          // Update correct image thumbnail into lightbox component
          const resArray = newThumbnailSrc.split('/');
          if (resArray[2] === '256') {
            resArray[2] = '1024';
          }
          const adjustedThumbnailSrc = resArray.join('/');
          this.setState((prevState) => {
            const updatedImageItems = [...prevState.imageNodeItems];
            updatedImageItems[imageIndex].thumbnail = adjustedThumbnailSrc;
            return { imageNodeItems: updatedImageItems };
          });
          // Update the thumbnail URL with the cache-busting query parameter
          const item = this.props.direntList.find((item) => item.name === imageName);
          this.props.updateDirent(item, ['encoded_thumbnail_src', 'mtime'], [newThumbnailSrc, cacheBuster]);
          this.props.updateTreeNode(path, ['encoded_thumbnail_src', 'mtime'], [newThumbnailSrc, cacheBuster]);
        }).catch(error => {
          this.handleError(error);
        });
      }).catch(error => {
        this.handleError(error);
      });
    }
  };

  renderTreeSectionHeaderOperations = (props) => {
    const moreOperation = (
      <div className="tree-section-header-operation tree-section-more-operation" key='tree-section-more-operation'>
        <ItemDropdownMenu
          {...props}
          item={{ name: 'files' }}
          menuStyle={isMobile ? { zIndex: 1050 } : {}}
          getMenuList={this.getMenuList}
          onMenuItemClick={this.onMoreOperationClick}
          tickable={true}
        />
      </div>
    );
    return [moreOperation];
  };

  setImageIndex = (index) => {
    this.setState({ imageIndex: index });
  };

  render() {
    const { repoID, currentRepoInfo, userPerm } = this.props;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    let canModifyFile = false;
    if (['rw', 'cloud-edit'].indexOf(userPerm) != -1) {
      canModifyFile = true;
    } else {
      if (isCustomPermission) {
        const { modify } = customPermission.permission;
        canModifyFile = modify;
      }
    }

    return (
      <>
        <TreeSection
          repoID={repoID}
          stateStorageKey="files"
          title={gettext('Files')}
          renderHeaderOperations={this.renderTreeSectionHeaderOperations}
        >
          <TreeView
            repoID={repoID}
            userPerm={this.props.userPerm}
            treeData={this.props.treeData}
            currentPath={this.props.currentPath}
            currentRepoInfo={currentRepoInfo}
            isDisplayFiles={this.state.isDisplayFiles}
            isNodeMenuShow={this.isNodeMenuShow}
            onNodeClick={this.onNodeClick}
            onMenuItemClick={this.onMenuItemClick}
            getMenuContainerSize={this.props.getMenuContainerSize}
            onNodeExpanded={this.props.onNodeExpanded}
            onNodeCollapse={this.props.onNodeCollapse}
            onItemMove={this.props.onItemMove}
            onItemsMove={this.props.onItemsMove}
          />
        </TreeSection>
        {this.state.isNodeImagePopupOpen && (
          <ModalPortal>
            <ImageDialog
              repoID={repoID}
              repoInfo={currentRepoInfo}
              imageItems={this.state.imageNodeItems}
              imageIndex={this.state.imageIndex}
              setImageIndex={index => this.setImageIndex(index)}
              closeImagePopup={this.closeNodeImagePopup}
              moveToPrevImage={this.moveToPrevImage}
              moveToNextImage={this.moveToNextImage}
              onDeleteImage={this.deleteImage}
              onRotateImage={this.rotateImage}
              enableRotate={canModifyFile}
              isCustomPermission={isCustomPermission}
            />
          </ModalPortal>
        )}
      </>
    );
  }
}

DirFiles.propTypes = propTypes;

export default DirFiles;
