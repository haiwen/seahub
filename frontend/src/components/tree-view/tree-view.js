import React from 'react';
import PropTypes from 'prop-types';
import TreeNodeView from './tree-node-view';

import TreeViewContextMenu from './tree-view-contextmenu'

const propTypes = {
  repoPermission: PropTypes.bool,
  isNodeMenuShow: PropTypes.bool.isRequired,
  treeData: PropTypes.object.isRequired,
  currentPath: PropTypes.string.isRequired,
  onMenuItemClick: PropTypes.func,
  onNodeClick: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onItemMove: PropTypes.func,
  currentRepoInfo: PropTypes.object,
  showDifferentContextmenu: PropTypes.func,
  contextmenuType: PropTypes.oneOf(['container_contextmenu', 'item_contextmenu', 'tree_contextmenu', '']),
};

const PADDING_LEFT = 20;

class TreeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isRightMenuShow: false,
      nodeData: null,
      fileData: null,
      mousePosition: {clientX: '', clientY: ''},
    };
  }

  componentDidMount() {
    this.registerHandlers();
  }

  componentDidUpdate() {
    this.registerHandlers();
  }

  componentWillUnmount() {
    this.unregisterHandlers();
  }

  onItemMove = (repo, dirent, selectedPath, currentPath) => {
    this.props.onItemMove(repo, dirent, selectedPath, currentPath);
  }

  onNodeDragStart = (e, node) => {
    let dragStartNodeData = {nodeDirent: node.object, nodeParentPath: node.parentNode.path, nodeRootPath: node.path};
    dragStartNodeData = JSON.stringify(dragStartNodeData);
    
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData('applicaiton/drag-item-info', dragStartNodeData);
  }

  onNodeDragEnter = (e, node) => {
    //todo
  }

  onNodeDragMove = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  onNodeDragLeave = (e, node) => {
    //todo
  }

  onNodeDrop = (e, node) => {
    if (e.dataTransfer.files.length) { // uploaded files
      return;
    }
    let dragStartNodeData = e.dataTransfer.getData('applicaiton/drag-item-info');
    dragStartNodeData = JSON.parse(dragStartNodeData);

    let {nodeDirent, nodeParentPath, nodeRootPath} = dragStartNodeData;
    let dropNodeData = node;

    if (dropNodeData.object.type !== 'dir') {
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
        if (dropNodeData.path.indexOf(nodeRootPath) !== -1) {
          return;
        }
      }
    }

    this.onItemMove(this.props.currentRepoInfo, nodeDirent, dropNodeData.path, nodeParentPath);
  }

  contextMenu = (e) => {
    e.preventDefault();
    
    this.props.onFreezedItem();
    this.props.showDifferentContextmenu('tree_contextmenu');

    this.setState({
      isRightMenuShow:false,
    });
    setTimeout(() => { 
      this.setState({
        isRightMenuShow:true,
        fileData:this.state.nodeData,
        mousePosition: {clientX: e.clientX, clientY: e.clientY}
      })
    },40)
  }  

  unregisterHandlers = () => {
    let treeView = document.querySelector('.tree-view');
    treeView.removeEventListener('contextmenu', this.contextMenu);
  }

  registerHandlers = () => {
    let treeView = document.querySelector('.tree-view');
    treeView.addEventListener('contextmenu', this.contextMenu);
  }

  onNodeChanged = (node) => {
    this.setState({
      nodeData:node
    })
  }

  closeRightMenu = () => {
    this.setState({
      isRightMenuShow:false,
    })
    this.props.onUnfreezedItem();
    this.props.showDifferentContextmenu('empty_contextmenu');
  }

  onMenuItemClick = (operation, node) => {
    this.props.onMenuItemClick(operation, node)
  }

  render() {
    return (
      <div className="tree-view tree">
        <TreeNodeView 
          repoPermission={this.props.repoPermission}
          node={this.props.treeData.root}
          currentPath={this.props.currentPath}
          paddingLeft={PADDING_LEFT}
          isNodeMenuShow={this.props.isNodeMenuShow}
          isItemFreezed={this.props.isItemFreezed}
          onNodeClick={this.props.onNodeClick}
          onMenuItemClick={this.props.onMenuItemClick}
          onNodeExpanded={this.props.onNodeExpanded}
          onNodeCollapse={this.props.onNodeCollapse}
          onNodeDragStart={this.onNodeDragStart}
          onFreezedItem={this.props.onFreezedItem}
          onUnFreezedItem={this.props.onUnfreezedItem}
          onNodeChanged={this.onNodeChanged}
          registerHandlers={this.registerHandlers}
          unregisterHandlers={this.unregisterHandlers}
          onNodeDragMove={this.onNodeDragMove}
          onNodeDrop={this.onNodeDrop}
          onNodeDragEnter={this.onNodeDragEnter}
          onNodeDragLeave={this.onNodeDragLeave}
          contextmenuType={this.props.contextmenuType}
        />
       {this.state.isRightMenuShow && this.props.contextmenuType === 'tree_contextmenu' && (
          <TreeViewContextMenu 
            node={this.state.fileData}
            onMenuItemClick={this.onMenuItemClick}
            mousePosition={this.state.mousePosition}
            closeRightMenu={this.closeRightMenu}
            registerHandlers={this.registerHandlers}
            unregisterHandlers={this.unregisterHandlers}
          />
        )}
      </div>
    );
  }
}

TreeView.propTypes = propTypes;

export default TreeView;
