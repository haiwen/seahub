import React from 'react';
import PropTypes from 'prop-types';
import TreeView from '../tree-view/tree-view';
import ModalPortal from '../modal-portal';
import Rename from '../dialog/rename-dialog';
import Copy from '../dialog/copy-dirent-dialog';
import Move from '../dialog/move-dirent-dialog';
import CreateFolder from '../dialog/create-folder-dialog';
import CreateFile from '../dialog/create-file-dialog';
import ImageDialog from '../dialog/image-dialog';
import toaster from '../toast';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import { fileServerRoot, gettext, siteRoot, thumbnailSizeForOriginal, thumbnailDefaultSize } from '../../utils/constants';
import { isMobile, Utils } from '../../utils/utils';
import TextTranslation from '../../utils/text-translation';
import TreeSection from '../tree-section';
import imageAPI from '../../utils/image-api';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  currentPath: PropTypes.string.isRequired,
  treeData: PropTypes.object.isRequired,
  userPerm: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  direntList: PropTypes.array,
  selectedDirentList: PropTypes.array.isRequired,
  currentNode: PropTypes.object,
  getMenuContainerSize: PropTypes.func,
  onNodeClick: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onDeleteNode: PropTypes.func.isRequired,
  onAddFileNode: PropTypes.func.isRequired,
  onAddFolderNode: PropTypes.func.isRequired,
  onItemCopy: PropTypes.func.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onItemsMove: PropTypes.func.isRequired,
  updateDirent: PropTypes.func,
};

class DirFiles extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      opNode: null,
      isAddFileDialogShow: false,
      isAddFolderDialogShow: false,
      isRenameDialogShow: false,
      isNodeImagePopupOpen: false,
      imageNodeItems: [],
      imageIndex: 0,
      isCopyDialogShow: false,
      isMoveDialogShow: false,
      isMultipleOperation: false,
      operationList: [],
      isDisplayFiles: localStorage.getItem('sf_display_files') === 'true' || false,
    };
    this.isNodeMenuShow = true;
    this.imageItemsSnapshot = [];
    this.imageIndexSnapshot = 0;
    this.rotateImageCacheBuster = new Date().getTime();
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
    const list = [];
    if (userPerm == 'rw') {
      list.push(
        TextTranslation.NEW_FOLDER,
        TextTranslation.NEW_FILE
      );
    }
    list.push(TextTranslation.DISPLAY_FILES);
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
    this.setState({ opNode: node });
    switch (operation) {
      case 'New Folder':
        if (!node) {
          this.onAddFolderToggle('root');
        } else {
          this.onAddFolderToggle();
        }
        break;
      case 'New File':
        if (!node) {
          this.onAddFileToggle('root');
        } else {
          this.onAddFileToggle();
        }
        break;
      case 'Rename':
        this.onRenameToggle();
        break;
      case 'Delete':
        this.onDeleteNode(node);
        break;
      case 'Copy':
        this.onCopyToggle();
        break;
      case 'Move':
        this.onMoveToggle();
        break;
      case 'Open in New Tab':
        this.onOpenFile(node);
        break;
      case 'Display files':
        this.onDisplayFilesToggle();
        break;
    }
  };

  onAddFileToggle = (type) => {
    if (type === 'root') {
      let root = this.props.treeData.root;
      this.setState({
        isAddFileDialogShow: !this.state.isAddFileDialogShow,
        opNode: root,
      });
    } else {
      this.setState({ isAddFileDialogShow: !this.state.isAddFileDialogShow });
    }
  };

  onAddFolderToggle = (type) => {
    if (type === 'root') {
      let root = this.props.treeData.root;
      this.setState({
        isAddFolderDialogShow: !this.state.isAddFolderDialogShow,
        opNode: root,
      });
    } else {
      this.setState({ isAddFolderDialogShow: !this.state.isAddFolderDialogShow });
    }
  };

  onRenameToggle = () => {
    this.setState({ isRenameDialogShow: !this.state.isRenameDialogShow });
  };

  onCopyToggle = () => {
    this.setState({ isCopyDialogShow: !this.state.isCopyDialogShow });
  };

  onMoveToggle = () => {
    this.setState({ isMoveDialogShow: !this.state.isMoveDialogShow });
  };

  onAddFolderNode = (dirPath) => {
    this.setState({ isAddFolderDialogShow: !this.state.isAddFolderDialogShow });
    this.props.onAddFolderNode(dirPath);
  };

  onRenameNode = (newName) => {
    this.setState({ isRenameDialogShow: !this.state.isRenameDialogShow });
    let node = this.state.opNode;
    this.props.onRenameNode(node, newName);
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
      const name = item.object.name;
      const path = Utils.encodePath(Utils.joinPath(node.parentNode.path, name));
      const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
      const isGIF = fileExt === 'gif';
      const src = `${siteRoot}repo/${repoID}/raw${path}`;
      let thumbnail = '';
      if (repoEncrypted || isGIF) {
        thumbnail = `${src}?t=${this.rotateImageCacheBuster}`;
      } else {
        thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}?t=${this.rotateImageCacheBuster}`;
      }
      return {
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
          this.rotateImageCacheBuster = new Date().getTime();
          const newThumbnailSrc = `${res.data.encoded_thumbnail_src}?t=${this.rotateImageCacheBuster}`;
          this.setState((prevState) => {
            const updatedImageItems = [...prevState.imageNodeItems];
            updatedImageItems[imageIndex].thumbnail = newThumbnailSrc;
            return { imageNodeItems: updatedImageItems };
          });
          // Update the thumbnail URL with the cache-busting query parameter
          const item = this.props.direntList.find((item) => item.name === imageName);
          this.props.updateDirent(item, 'encoded_thumbnail_src', newThumbnailSrc);
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
          toggleClass="sf3-font sf3-font-more"
          menuStyle={isMobile ? { zIndex: 1050 } : {}}
          isDisplayFiles={this.state.isDisplayFiles}
          getMenuList={this.getMenuList}
          onMenuItemClick={this.onMoreOperationClick}
        />
      </div>
    );
    return [moreOperation];
  };

  render() {
    const { repoID, currentRepoInfo, userPerm } = this.props;
    const { encrypted: repoEncrypted } = currentRepoInfo;

    let canModifyFile = false;
    if (['rw', 'cloud-edit'].indexOf(userPerm) != -1) {
      canModifyFile = true;
    } else {
      const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
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
            selectedDirentList={this.props.selectedDirentList}
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
        {this.state.isAddFolderDialogShow && (
          <ModalPortal>
            <CreateFolder
              parentPath={this.state.opNode.path}
              onAddFolder={this.onAddFolderNode}
              checkDuplicatedName={this.checkDuplicatedName}
              addFolderCancel={this.onAddFolderToggle}
            />
          </ModalPortal>
        )}
        {this.state.isAddFileDialogShow && (
          <ModalPortal>
            <CreateFile
              parentPath={this.state.opNode.path}
              onAddFile={this.props.onAddFileNode}
              checkDuplicatedName={this.checkDuplicatedName}
              toggleDialog={this.onAddFileToggle}
            />
          </ModalPortal>
        )}
        {this.state.isRenameDialogShow && (
          <ModalPortal>
            <Rename
              currentNode={this.state.opNode}
              onRename={this.onRenameNode}
              checkDuplicatedName={this.checkDuplicatedName}
              toggleCancel={this.onRenameToggle}
            />
          </ModalPortal>
        )}
        {this.state.isCopyDialogShow && (
          <ModalPortal>
            <Copy
              repoID={repoID}
              path={this.state.opNode.parentNode.path}
              dirent={this.state.opNode.object}
              onItemCopy={this.props.onItemCopy}
              repoEncrypted={repoEncrypted}
              onCancelCopy={this.onCopyToggle}
              isMultipleOperation={this.state.isMultipleOperation}
            />
          </ModalPortal>
        )}
        {this.state.isMoveDialogShow && (
          <ModalPortal>
            <Move
              repoID={repoID}
              path={this.state.opNode.parentNode.path}
              dirent={this.state.opNode.object}
              onItemMove={this.props.onItemMove}
              repoEncrypted={repoEncrypted}
              onCancelMove={this.onMoveToggle}
              isMultipleOperation={this.state.isMultipleOperation}
            />
          </ModalPortal>
        )}
        {this.state.isNodeImagePopupOpen && (
          <ModalPortal>
            <ImageDialog
              imageItems={this.state.imageNodeItems}
              imageIndex={this.state.imageIndex}
              closeImagePopup={this.closeNodeImagePopup}
              moveToPrevImage={this.moveToPrevImage}
              moveToNextImage={this.moveToNextImage}
              onDeleteImage={this.deleteImage}
              onRotateImage={this.rotateImage}
              enableRotate={canModifyFile}
            />
          </ModalPortal>
        )}
      </>
    );
  }
}

DirFiles.propTypes = propTypes;

export default DirFiles;
