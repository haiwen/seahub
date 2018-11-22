import React from 'react';
import PropTypes from 'prop-types';
import TreeNodeView from './tree-node-view';
import editorUtilities from '../../utils/editor-utilties';

const propTypes = {
  permission: PropTypes.string,
  isNodeItemFrezee: PropTypes.bool.isRequired,
  currentPath: PropTypes.string.isRequired,
  treeData: PropTypes.object.isRequired,
  onShowContextMenu: PropTypes.func.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onDirCollapse: PropTypes.func.isRequired,
};

class TreeView extends React.PureComponent {

  change = (tree) => {
    /*
    this._updated = true;
    if (this.props.onChange) this.props.onChange(tree.obj);
    */
  }

  onDragStart = (e, node) => {
    const url = editorUtilities.getFileURL(node);
    e.dataTransfer.setData('text/uri-list', url);
    e.dataTransfer.setData('text/plain', url);
  }

  onNodeClick = (node) => {
    this.props.onNodeClick(node);
  }

  onShowContextMenu = (e, node) => {
    this.props.onShowContextMenu(e, node);
  }

  render() {
    if (!this.props.treeData.root) {
      return <div>Loading...</div>;
    }

    return (
      <div className="tree-view tree">
        <TreeNodeView
          paddingLeft={12}
          treeView={this}
          node={this.props.treeData.root}
          isNodeItemFrezee={this.props.isNodeItemFrezee}
          permission={this.props.permission}
          currentPath={this.props.currentPath}
          onShowContextMenu={this.props.onShowContextMenu}
          onDirCollapse={this.props.onDirCollapse}
        />
      </div>
    );
  }

}

TreeView.propTypes = propTypes;

export default TreeView;
