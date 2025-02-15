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

const LEFT_INDENT = 20;

class TreeView extends React.Component {

  /*
  onNodeClick = (node) => {
    this.props.onNodeClick(node);
  };
  */

  render() {
    return (
      <div
        className={'tree-view tree'}
      >
        <TreeNodeView
          leftIndent={LEFT_INDENT}
          node={this.props.treeData.root}
          currentPath={this.props.currentPath}
          onNodeClick={this.props.onNodeClick}
          onNodeExpanded={this.props.onNodeExpanded}
          onNodeCollapse={this.props.onNodeCollapse}
        />
      </div>
    );
  }
}

TreeView.propTypes = propTypes;

export default TreeView;
