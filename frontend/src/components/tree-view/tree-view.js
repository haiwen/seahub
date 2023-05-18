import React from 'react';
import PropTypes from 'prop-types';
import TextTranslation from '../../utils/text-translation';
import TreeNodeView from './tree-node-view';
import ContextMenu from '../context-menu/context-menu';
import { hideMenu, showMenu } from '../context-menu/actions';
import { Utils } from '../../utils/utils';

const propTypes = {
  userPerm: PropTypes.string,
  isNodeMenuShow: PropTypes.bool.isRequired,
  treeData: PropTypes.object.isRequired,
  currentPath: PropTypes.string.isRequired,
  onMenuItemClick: PropTypes.func,
  onNodeClick: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onItemMove: PropTypes.func,
  currentRepoInfo: PropTypes.object,
  selectedDirentList: PropTypes.array,
  onItemsMove: PropTypes.func,
};

const PADDING_LEFT = 20;

class TreeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
      isTreeViewDropTipShow: false,
    };
    const { userPerm } = props;
    this.canDrop = userPerm === 'rw';
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    if (isCustomPermission) {
      const { modify } = customPermission.permission;
      this.canDrop = modify;
    }
  }

  onItemMove = (repo, dirent, selectedPath, currentPath) => {
    this.props.onItemMove(repo, dirent, selectedPath, currentPath);
  }

  onNodeDragStart = (e, node) => {
    if (Utils.isIEBrower()) {
      return false;
    }
    let dragStartNodeData = {nodeDirent: node.object, nodeParentPath: node.parentNode.path, nodeRootPath: node.path};
    dragStartNodeData = JSON.stringify(dragStartNodeData);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('applicaiton/drag-item-info', dragStartNodeData);
  }

  onNodeDragEnter = (e, node) => {
    if (Utils.isIEBrower() || !this.canDrop) {
      return false;
    }
    e.persist();
    if (e.target.className === 'tree-view tree ') {
      this.setState({
        isTreeViewDropTipShow: true,
      });
    }
  }

  onNodeDragMove = (e) => {
    if (Utils.isIEBrower() || !this.canDrop) {
      return false;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  onNodeDragLeave = (e, node) => {
    if (Utils.isIEBrower() || !this.canDrop) {
      return false;
    }
    if (e.target.className === 'tree-view tree tree-view-drop') {
      this.setState({
        isTreeViewDropTipShow: false,
      });
    }
  }

  onContainerClick = (event) => {
    hideMenu();
  }

  onNodeClick = (node) => {
    hideMenu();
    this.props.onNodeClick(node);
  }

  onNodeDrop = (e, node) => {
    if (Utils.isIEBrower() || !this.canDrop) {
      return false;
    }
    if (e.dataTransfer.files.length) { // uploaded files
      return;
    }
    let dragStartNodeData = e.dataTransfer.getData('applicaiton/drag-item-info');
    dragStartNodeData = JSON.parse(dragStartNodeData);

    let {nodeDirent, nodeParentPath, nodeRootPath} = dragStartNodeData;
    let dropNodeData = node;

    if (Array.isArray(dragStartNodeData)) { //move items
      if (!dropNodeData) { //move items to root
        if (dragStartNodeData[0].nodeParentPath === '/') {
          this.setState({isTreeViewDropTipShow: false});
          return;
        }
        this.props.onItemsMove(this.props.currentRepoInfo, '/');
        this.setState({isTreeViewDropTipShow: false});
        return;
      }
      this.onMoveItems(dragStartNodeData, dropNodeData, this.props.currentRepoInfo, dropNodeData.path);
      return;
    }

    if (!dropNodeData) {
      if (nodeParentPath === '/') {
        this.setState({isTreeViewDropTipShow: false});
        return;
      }
      this.onItemMove(this.props.currentRepoInfo, nodeDirent, '/', nodeParentPath);
      this.setState({isTreeViewDropTipShow: false});
      return;
    }

    if (dropNodeData.object.type !== 'dir') {
      return;
    }

    if (nodeParentPath === dropNodeData.path) {
      return;
    }

    // copy the dirent to itself. eg: A/B -> A/B
    if (nodeParentPath === dropNodeData.parentNode.path) {
      if (dropNodeData.object.name === nodeDirent.name) {
        return;
      }
    }

    // copy the dirent to it's child. eg: A/B -> A/B/C
    if (dropNodeData.object.type === 'dir' && nodeDirent.type === 'dir') {
      if (dropNodeData.parentNode.path !== nodeParentPath) {
        let paths = Utils.getPaths(dropNodeData.path);
        if (paths.includes(nodeRootPath)) {
          return;
        }
      }
    }

    this.onItemMove(this.props.currentRepoInfo, nodeDirent, dropNodeData.path, nodeParentPath);
  }

  onMoveItems = (dragStartNodeData, dropNodeData, destRepo, destDirentPath) => {
    let direntPaths = [];
    let paths = Utils.getPaths(destDirentPath);
    dragStartNodeData.forEach(dirent => {
      let path = dirent.nodeRootPath;
      direntPaths.push(path);
    });

    if (dropNodeData.object.type !== 'dir') {
      return;
    }

    // move dirents to one of them. eg: A/B, A/C -> A/B
    if (direntPaths.some(direntPath => { return direntPath === destDirentPath;})) {
      return;
    }

    // move dirents to current path
    if (dragStartNodeData[0].nodeParentPath && dragStartNodeData[0].nodeParentPath === dropNodeData.path ) {
      return;
    }

    // move dirents to one of their child. eg: A/B, A/D -> A/B/C
    let isChildPath = direntPaths.some(direntPath => {
      return paths.includes(direntPath);
    });
    if (isChildPath) {
      return;
    }

    this.props.onItemsMove(destRepo, destDirentPath);
  }

  freezeItem = () => {
    this.setState({isItemFreezed: true});
  }

  unfreezeItem = () => {
    this.setState({isItemFreezed: false});
  }

  onMenuItemClick = (operation, node) => {
    this.props.onMenuItemClick(operation, node);
    hideMenu();
  }

  onMouseDown = (event) => {
    event.stopPropagation();
    if (event.button === 2) {
      return;
    }
  }

  onContextMenu = (event) => {
    event.preventDefault();

    let currentRepoInfo = this.props.currentRepoInfo;
    if (currentRepoInfo.permission !== 'admin' && currentRepoInfo.permission !== 'rw') {
      return '';
    }
    this.handleContextClick(event);
  }

  handleContextClick = (event, node) => {
    event.preventDefault();
    event.stopPropagation();

    if (!this.props.isNodeMenuShow) {
      return;
    }

    let x = event.clientX || (event.touches && event.touches[0].pageX);
    let y = event.clientY || (event.touches && event.touches[0].pageY);

    if (this.props.posX) {
      x -= this.props.posX;
    }
    if (this.props.posY) {
      y -= this.props.posY;
    }

    hideMenu();

    let menuList = this.getMenuList(node);

    let showMenuConfig = {
      id: 'tree-node-contextmenu',
      position: { x, y },
      target: event.target,
      currentObject: node,
      menuList: menuList,
    };

    showMenu(showMenuConfig);
  }

  getMenuList = (node) => {
    let menuList = [];

    let { NEW_FOLDER, NEW_FILE, COPY, MOVE, RENAME, DELETE, OPEN_VIA_CLIENT } = TextTranslation;

    if (!node) {
      return [NEW_FOLDER, NEW_FILE];
    }

    if (node.object.type === 'dir') {
      menuList = [NEW_FOLDER, NEW_FILE, COPY, MOVE, RENAME, DELETE];
    } else {
      menuList = [RENAME, DELETE, COPY, MOVE, OPEN_VIA_CLIENT];
    }

    const { userPerm } = this.props;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    if (!isCustomPermission) {
      return menuList;
    }

    menuList = [];

    const { create: canCreate, modify: canModify, delete: canDelete, copy: canCopy } = customPermission.permission;
    if (!node) {
      canCreate && menuList.push(NEW_FOLDER, NEW_FILE);
      return menuList;
    }

    if (node.object.type === 'dir') {
      canCreate && menuList.push(NEW_FOLDER, NEW_FILE);
    }

    canCopy && menuList.push(COPY);
    canModify && menuList.push(MOVE, RENAME);
    canDelete && menuList.push(DELETE);

    if (node.object.type !== 'dir') { 
      menuList.push(OPEN_VIA_CLIENT);
    }

    return menuList;
  }

  onShowMenu = () => {
    this.freezeItem();
  }

  onHideMenu = () => {
    this.unfreezeItem();
  }

  render() {
    return (
      <div
        className={`tree-view tree ${(this.state.isTreeViewDropTipShow && this.canDrop) ? 'tree-view-drop' : ''}`}
        onDrop={this.onNodeDrop}
        onDragEnter={this.onNodeDragEnter}
        onDragLeave={this.onNodeDragLeave}
        onMouseDown={this.onMouseDown}
        onContextMenu={this.onContextMenu}
        onClick={this.onContainerClick}
      >
        <TreeNodeView
          userPerm={this.props.userPerm}
          node={this.props.treeData.root}
          currentPath={this.props.currentPath}
          paddingLeft={PADDING_LEFT}
          isNodeMenuShow={this.props.isNodeMenuShow}
          isItemFreezed={this.state.isItemFreezed}
          onNodeClick={this.onNodeClick}
          onMenuItemClick={this.props.onMenuItemClick}
          onNodeExpanded={this.props.onNodeExpanded}
          onNodeCollapse={this.props.onNodeCollapse}
          onNodeDragStart={this.onNodeDragStart}
          freezeItem={this.freezeItem}
          unfreezeItem={this.unfreezeItem}
          onNodeDragMove={this.onNodeDragMove}
          onNodeDrop={this.onNodeDrop}
          onNodeDragEnter={this.onNodeDragEnter}
          onNodeDragLeave={this.onNodeDragLeave}
          handleContextClick={this.handleContextClick}
        />
        <ContextMenu
          id={'tree-node-contextmenu'}
          onMenuItemClick={this.onMenuItemClick}
          onHideMenu={this.onHideMenu}
          onShowMenu={this.onShowMenu}
        />
      </div>
    );
  }
}

TreeView.propTypes = propTypes;

export default TreeView;
