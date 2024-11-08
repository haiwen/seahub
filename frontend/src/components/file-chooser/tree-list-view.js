import React from 'react';
import PropTypes from 'prop-types';
import TreeListItem from './tree-list-item';

const propTypes = {
  selectedPath: PropTypes.string,
  selectedRepo: PropTypes.object,
  repo: PropTypes.object.isRequired,
  onDirentItemClick: PropTypes.func.isRequired,
  treeData: PropTypes.object.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  fileSuffixes: PropTypes.array,
};

class TreeListView extends React.Component {

  render() {
    const {
      treeData,
      selectedPath,
      onNodeCollapse,
      onNodeExpanded,
      repo,
      onDirentItemClick,
      selectedRepo,
      fileSuffixes
    } = this.props;

    const node = treeData.root;

    return (
      <div className="list-view-content">
        <TreeListItem
          node={node}
          onNodeCollapse={onNodeCollapse}
          onNodeExpanded={onNodeExpanded}
          repo={repo}
          onDirentItemClick={onDirentItemClick}
          selectedRepo={selectedRepo}
          selectedPath={selectedPath}
          fileSuffixes={fileSuffixes}
          level={0}
        />
      </div>
    );
  }

}

TreeListView.propTypes = propTypes;

export default TreeListView;
