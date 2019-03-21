import React from 'react';
import PropTypes from 'prop-types';
import TreeNodeView from './tree-node-view';

import TreeViewContexMenu from './tree-view-contextmenu'

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
      event: null,
    };
  }

  componentDidMount() {
    this.showContextMenu()
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
        event:e,
      })
    },40)
  }  

  hideContextMenu = () => {
    let dirContentNav = document.querySelector('.tree-view');
    dirContentNav.removeEventListener('contextmenu',this.contextMenu)
  }

  showContextMenu = () => {
    let dirContentNav = document.querySelector('.tree-view');
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
          isNodeData={this.isNodeData}
          showContextMenu={this.showContextMenu}
          hideContextMenu={this.hideContextMenu}
        />
       {this.state.isRightMenuShow && (
          <TreeViewContexMenu 
            node={this.state.fileData}
            onMenuItemClick={this.onMenuItemClick}
            event={this.state.event}
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
