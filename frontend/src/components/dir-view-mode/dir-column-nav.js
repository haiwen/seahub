import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import TreeView from '../../components/tree-view/tree-view';
import Loading from '../../components/loading';
import ModalPortal from '../../components/modal-portal';
import Delete from '../../components/dialog/delete-dialog';
import Rename from '../../components/dialog/rename-dialog';
import Copy from '../../components/dialog/copy-dirent-dialog';
import Move from '../../components/dialog/move-dirent-dialog';
import CreateFolder from '../../components/dialog/create-folder-dialog';
import CreateFile from '../../components/dialog/create-file-dialog';
import { siteRoot, gettext, thumbnailSizeForOriginal } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import RightMenu from '../tree-view/right-menu';

import Lightbox from 'react-image-lightbox';
import 'react-image-lightbox/style.css';

const propTypes = {
  currentPath: PropTypes.string.isRequired,
  repoPermission: PropTypes.bool.isRequired,
  isTreeDataLoading: PropTypes.bool.isRequired,
  treeData: PropTypes.object.isRequired,
  currentNode: PropTypes.object,
  onNodeClick: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onRenameNode: PropTypes.func.isRequired,
  onDeleteNode: PropTypes.func.isRequired,
  onAddFileNode: PropTypes.func.isRequired,
  onAddFolderNode: PropTypes.func.isRequired,
  repoID: PropTypes.string.isRequired,
  navRate: PropTypes.number,
  inResizing: PropTypes.bool.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
};

class DirColumnNav extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      opNode: null,
      isDeleteDialogShow: false,
      isAddFileDialogShow: false,
      isAddFolderDialogShow: false,
      isRenameDialogShow: false,
      isNodeImagePopupOpen: false,
      imageNodeItems: [],
      imageIndex: 0,
      isCopyDialogShow: false,
      isMoveDialogShow: false,
      isMutipleOperation: false,
      isRightMenuShow: false,
      nodeData: null,
      fileData: null,
      event: null,
    };
    this.isNodeMenuShow = true;
  }

  componentWillReceiveProps(nextProps) {
    this.setState({opNode: nextProps.currentNode});
  }

  onNodeClick = (node) => {
    this.setState({opNode: node});
    if (Utils.imageCheck(node.object.name)) {
      this.showNodeImagePopup(node);
      return;
    }
    this.props.onNodeClick(node);
  }

  onMenuItemClick = (operation, node) => {
    this.setState({opNode: node});
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
        this.onDeleteToggle();
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
    }
  }

  onAddFileToggle = (type) => {
    if (type === 'root') {
      let root = this.props.treeData.root;
      this.setState({
        isAddFileDialogShow: !this.state.isAddFileDialogShow,
        opNode: root,
      });
    } else {
      this.setState({isAddFileDialogShow: !this.state.isAddFileDialogShow});
    }
  }
  
  onAddFolderToggle = (type) => {
    if (type === 'root') {
      let root = this.props.treeData.root;
      this.setState({
        isAddFolderDialogShow: !this.state.isAddFolderDialogShow,
        opNode: root,
      });
    } else {
      this.setState({isAddFolderDialogShow: !this.state.isAddFolderDialogShow});
    }
  }

  onRenameToggle = () => {
    this.setState({isRenameDialogShow: !this.state.isRenameDialogShow});
  }

  onDeleteToggle = () => {
    this.setState({isDeleteDialogShow: !this.state.isDeleteDialogShow});
  }

  onCopyToggle = () => {
    this.setState({isCopyDialogShow: !this.state.isCopyDialogShow})
  }

  onMoveToggle = () => {
    this.setState({isMoveDialogShow: !this.state.isMoveDialogShow})
  }

  onAddFolderNode = (dirPath) => {
    this.setState({isAddFolderDialogShow: !this.state.isAddFolderDialogShow});
    this.props.onAddFolderNode(dirPath);
  }

  onAddFileNode = (filePath, isDraft) => {
    this.setState({isAddFileDialogShow: !this.state.isAddFileDialogShow});
    this.props.onAddFileNode(filePath, isDraft);
  }

  onRenameNode = (newName) => {
    this.setState({isRenameDialogShow: !this.state.isRenameDialogShow});
    let node = this.state.opNode;
    this.props.onRenameNode(node, newName);
  }

  onDeleteNode = () => {
    this.setState({isDeleteDialogShow: !this.state.isDeleteDialogShow});
    let node = this.state.opNode;
    this.props.onDeleteNode(node);
  }

  onOpenFile = (node) => {
    let newUrl = siteRoot + 'lib/' + this.props.repoID + '/file' + Utils.encodePath(node.path);
    window.open(newUrl, '_blank');
  }

  componentDidMount() {
    this.showContextMenu()
  }

  contextMenu = (e) => {
    e.preventDefault();
    this.setState({
      isRightMenuShow:false,
    });
    setTimeout(() => { 
      this.setState({
        isRightMenuShow:true,
        fileData:this.state.nodeData,
        event:e,
      })
    },40)
  }  

  hideContextMenu = () => {
    let dirContentNav = document.querySelector('.dir-content-nav');
    dirContentNav.removeEventListener('contextmenu',this.contextMenu)
  }

  showContextMenu = () => {
    let dirContentNav = document.querySelector('.dir-content-nav');
    dirContentNav.addEventListener('contextmenu',this.contextMenu)
  }

  isNodeData = (node) => {
    this.setState({
      nodeData:node
    })
  }

  closeRightMenu = () => {
    this.setState({
      isRightMenuShow:false,
    })
  }

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
  }

  showNodeImagePopup = (node) => {
    let childrenNode = node.parentNode.children;
    let items = childrenNode.filter((item) => {
      return Utils.imageCheck(item.object.name);
    });
    let imageNames = items.map((item) => {
      return item.object.name;
    })
    this.setState({
      isNodeImagePopupOpen: true,
      imageNodeItems: this.prepareImageItems(node),
      imageIndex: imageNames.indexOf(node.object.name)
    });
  }

  prepareImageItems = (node) => {
    let childrenNode = node.parentNode.children;
    let items = childrenNode.filter((item) => {
      return Utils.imageCheck(item.object.name);
    });

    const useThumbnail = !this.props.currentRepoInfo.encrypted;
    let prepareItem = (item) => {
      const name = item.object.name;

      const path = Utils.encodePath(Utils.joinPath(node.parentNode.path, name));
      const fileExt = name.substr(name.lastIndexOf('.') + 1).toLowerCase();
      const isGIF = fileExt === 'gif';

      const repoID = this.props.repoID;
      let src = '';
      if (useThumbnail && !isGIF) {
        src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`;
      } else {
        src = `${siteRoot}repo/${repoID}/raw${path}`;
      }

      return {
        'name': name,
        'url': `${siteRoot}lib/${repoID}/file${path}`,
        'src': src
      };
    };

    return items.map((item) => { return prepareItem(item); });
  }

  closeNodeImagePopup = () => {
    this.setState({
      isNodeImagePopupOpen: false
    });
  }

  moveToPrevImage = () => {
    const imageItemsLength = this.state.imageNodeItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + imageItemsLength - 1) % imageItemsLength
    }));
  }

  moveToNextImage = () => {
    const imageItemsLength = this.state.imageNodeItems.length;
    this.setState((prevState) => ({
      imageIndex: (prevState.imageIndex + 1) % imageItemsLength
    }));
  }

  render() {
    let flex = this.props.navRate ? '0 0 ' + this.props.navRate * 100 + '%' : '0 0 25%';
    const select = this.props.inResizing ? 'none' : '';

    const imageNodeItems = this.state.imageNodeItems;
    const imageIndex = this.state.imageIndex;
    const imageItemsLength = imageNodeItems.length; 
    const imageCaption = imageItemsLength && (
      <Fragment>
        <span>{gettext('%curr% of %total%').replace('%curr%', imageIndex + 1).replace('%total%', imageItemsLength)}</span>
        <br />
        <a href={imageNodeItems[imageIndex].url} target="_blank">{gettext('Open in New Tab')}</a>
      </Fragment>
    );

    return (
      <Fragment>
        <div className="dir-content-nav" role="navigation" style={{flex: (flex), userSelect: select}}>
          {this.props.isTreeDataLoading ? 
            (<Loading/>) :
            (<TreeView
              repoPermission={this.props.repoPermission}
              isNodeMenuShow={this.isNodeMenuShow}
              treeData={this.props.treeData}
              currentPath={this.props.currentPath}
              onNodeClick={this.onNodeClick}
              onNodeExpanded={this.props.onNodeExpanded}
              onNodeCollapse={this.props.onNodeCollapse}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.onFreezedItem}
              onUnFreezedItem={this.onUnFreezedItem}
              isNodeData={this.isNodeData}
              showContextMenu={this.showContextMenu}
              hideContextMenu={this.hideContextMenu}
            />)
          }
        </div>
        {this.state.isRightMenuShow && (
          <RightMenu 
            node={this.state.fileData}
            onMenuItemClick={this.onMenuItemClick}
            event={this.state.event}
            closeRightMenu={this.closeRightMenu}
          />
        )}
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
              onAddFile={this.onAddFileNode}
              checkDuplicatedName={this.checkDuplicatedName}
              addFileCancel={this.onAddFileToggle}
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
        {this.state.isDeleteDialogShow && (
          <ModalPortal>
            <Delete
              currentNode={this.state.opNode}
              handleSubmit={this.onDeleteNode}
              toggleCancel={this.onDeleteToggle}
            />
          </ModalPortal>
        )}
        {this.state.isCopyDialogShow && (
          <ModalPortal>
            <Copy
              path={this.state.opNode.parentNode.path}
              repoID={this.props.repoID}
              dirent={this.state.opNode.object}
              onItemCopy={this.props.onItemCopy}
              repoEncrypted={this.props.currentRepoInfo.encrypted}
              onCancelCopy={this.onCopyToggle}
              isMutipleOperation={this.state.isMutipleOperation}
            />
          </ModalPortal>
        )}
        {this.state.isMoveDialogShow && (
          <ModalPortal>
            <Move
              path={this.state.opNode.parentNode.path}
              repoID={this.props.repoID}
              dirent={this.state.opNode.object}
              onItemMove={this.props.onItemMove}
              repoEncrypted={this.props.currentRepoInfo.encrypted}
              onCancelMove={this.onMoveToggle}
              isMutipleOperation={this.state.isMutipleOperation}
            />
          </ModalPortal>
        )}
        {this.state.isNodeImagePopupOpen && (
            <Lightbox
              mainSrc={imageNodeItems[imageIndex].src}
              imageCaption={imageCaption}
              imageTitle={imageNodeItems[imageIndex].name}
              nextSrc={imageNodeItems[(imageIndex + 1) % imageItemsLength].src}
              prevSrc={imageNodeItems[(imageIndex + imageItemsLength - 1) % imageItemsLength].src}
              onCloseRequest={this.closeNodeImagePopup}
              onMovePrevRequest={this.moveToPrevImage}
              onMoveNextRequest={this.moveToNextImage}
              imagePadding={70}
              imageLoadErrorMessage={gettext('The image could not be loaded.')}
              prevLabel={gettext('Previous (Left arrow key)')}
              nextLabel={gettext('Next (Right arrow key)')}
              closeLabel={gettext('Close (Esc)')}
              zoomInLabel={gettext('Zoom in')}
              zoomOutLabel={gettext('Zoom out')}
            />
        )}
      </Fragment>
    );
  }
}

DirColumnNav.defaultProps={
  navRate: 0.25
};

DirColumnNav.propTypes = propTypes;

export default DirColumnNav;
