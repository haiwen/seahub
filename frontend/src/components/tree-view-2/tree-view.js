import React from 'react';
import PropTypes from 'prop-types';
import TreeNodeView from './tree-node-view';

const propTypes = {
  treeData: PropTypes.object.isRequired,
  currentPath: PropTypes.string.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
};

const PADDING_LEFT = 12;

class TreeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
    };
  }

  onNodeDragStart = (e, node) => {

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
          node={this.props.treeData.root}
          currentPath={this.props.currentPath}
          paddingLeft={PADDING_LEFT}
          isItemFreezed={this.state.isItemFreezed}
          onNodeClick={this.props.onNodeClick}
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
