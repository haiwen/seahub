import React from 'react';
import PropTypes from 'prop-types';
import TreeNodeView from './tree-node-view';

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

const PADDING_LEFT = 10;

class TreeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
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

  render() {
    return (
      <div className="tree-view tree">
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
        />
      </div>
    );
  }
}

TreeView.propTypes = propTypes;

export default TreeView;
