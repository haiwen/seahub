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

  onFreezedToggle = () => {
    this.setState({isItemFreezed: !this.state.isItemFreezed});
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
          onFreezedToggle={this.onFreezedToggle}
        />
      </div>
    );
  }
}

TreeView.propTypes = propTypes;

export default TreeView;
