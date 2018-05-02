import React from 'react';
import TreeView from '../tree-view/tree-view';

class FileTree extends React.Component {

  render() {
    return (
      <TreeView
        tree={this.props.treeData}
        editorUtilities={this.props.editorUtilities}
      />
    )
  }

}

export default FileTree;
