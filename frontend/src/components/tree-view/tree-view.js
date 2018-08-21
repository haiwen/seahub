import React from 'react';
import TreeNodeView from './tree-node-view';

class TreeView extends React.PureComponent {

  change = (tree) => {
    /*
    this._updated = true;
    if (this.props.onChange) this.props.onChange(tree.obj);
    */
  }

  toggleCollapse = (node) => {
    const tree = this.props.treeData;
    node.isExpanded = !node.isExpanded;

    // copy the tree to make PureComponent work
    this.setState({
      tree: tree.copy()
    });

    this.change(tree);
  }

  onDragStart = (e, node) => {
    const url = this.props.editorUtilities.getFileURL(node);
    e.dataTransfer.setData("text/uri-list", url);
    e.dataTransfer.setData("text/plain", url);
  }

  onNodeClick = (e, node) => {
    if (node.isDir()) {
      this.toggleCollapse(node);
      return;
    }
    this.props.onNodeClick(e, node);
  }

  onShowContextMenu = (e, node) => {
    this.props.onShowContextMenu(e, node);
  }

  render() {
    if (!this.props.treeData.root) {
      return <div>Loading...</div>
    }

    return (
      <div className="tree-view tree">
        <TreeNodeView
          paddingLeft={20}
          treeView={this}
          node={this.props.treeData.root}
          isNodeItemFrezee={this.props.isNodeItemFrezee}
          permission={this.props.permission}
          onShowContextMenu={this.props.onShowContextMenu}
        />
      </div>
    );
  }

}

export default TreeView;
