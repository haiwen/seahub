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
};

const PADDING_LEFT = 20;

class TreeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
      isRightMenuShow: false,
      nodeData: null,
      fileData: null,
      mousePosition: {clientX: '', clientY: ''},
    };
  }

  componentDidMount() {
    this.showContextMenu();
  }

  componentWillUnmount() {
    this.hideContextMenu();
  }

  onNodeDragStart = (e, node) => {
    // todo
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnFreezedItem = () => {
    this.setState({isItemFreezed: false});
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
        mousePosition: {clientX: e.clientX, clientY:e.clientY}
      })
    },40)
  }  

  hideContextMenu = () => {
    let treeView = document.querySelector('.tree-view');
    treeView.removeEventListener('contextmenu',this.contextMenu);
  }

  showContextMenu = () => {
    let treeView = document.querySelector('.tree-view');
    treeView.addEventListener('contextmenu',this.contextMenu);
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
  }

  onMenuItemClick = (operation, node) => {
    this.props.onMenuItemClick(operation, node)
  }

  render() {
    return (
      <div className="tree-view tree" style={{flex:1}}>
        <TreeNodeView 
          repoPermission={this.props.repoPermission}
          node={this.props.treeData.root}
          currentPath={this.props.currentPath}
          paddingLeft={PADDING_LEFT}
          isNodeMenuShow={this.props.isNodeMenuShow}
          isItemFreezed={this.state.isItemFreezed}
          onNodeClick={this.props.onNodeClick}
          onMenuItemClick={this.props.onMenuItemClick}
          onNodeExpanded={this.props.onNodeExpanded}
          onNodeCollapse={this.props.onNodeCollapse}
          onNodeDragStart={this.onNodeDragStart}
          onFreezedItem={this.onFreezedItem}
          onUnFreezedItem={this.onUnFreezedItem}
          onNodeChanged={this.onNodeChanged}
          showContextMenu={this.showContextMenu}
          hideContextMenu={this.hideContextMenu}
        />
       {this.state.isRightMenuShow && (
          <TreeViewContextMenu 
            node={this.state.fileData}
            onMenuItemClick={this.onMenuItemClick}
            mousePosition={this.state.mousePosition}
            closeRightMenu={this.closeRightMenu}
            showContextMenu={this.showContextMenu}
            hideContextMenu={this.hideContextMenu}
          />
        )}
      </div>
    );
  }
}

TreeView.propTypes = propTypes;

export default TreeView;
