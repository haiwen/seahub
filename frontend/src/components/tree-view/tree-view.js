import React from 'react';
import TreeNodeView from './tree-node-view';
import editorUtilities from '../../utils/editor-utilties';

class TreeView extends React.PureComponent {

  change = (tree) => {
    /*
    this._updated = true;
    if (this.props.onChange) this.props.onChange(tree.obj);
    */
  }

  toggleCollapse = (e, node) => {
    this.props.onDirCollapse(e, node);
  }

  onDragStart = (e, node) => {
    const url = editorUtilities.getFileURL(node);
    e.dataTransfer.setData('text/uri-list', url);
    e.dataTransfer.setData('text/plain', url);
  }

  onNodeClick = (e, node) => {
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
          paddingLeft={12}
          treeView={this}
          node={this.props.treeData.root}
          isNodeItemFrezee={this.props.isNodeItemFrezee}
          permission={this.props.permission}
          currentFilePath={this.props.currentFilePath}
          onShowContextMenu={this.props.onShowContextMenu}
          onDirCollapse={this.props.onDirCollapse}
        />
      </div>
    );
  }

}

export default TreeView;
