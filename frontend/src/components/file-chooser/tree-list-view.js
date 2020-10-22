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
    return(
      <div className="list-view-content" style={{'marginLeft': '-1.5rem'}}>
        <TreeListItem
          node={this.props.treeData.root}
          onNodeCollapse={this.props.onNodeCollapse}
          onNodeExpanded={this.props.onNodeExpanded}
          repo={this.props.repo}
          onDirentItemClick={this.props.onDirentItemClick}
          selectedRepo={this.props.selectedRepo}
          selectedPath={this.props.selectedPath}
          fileSuffixes={this.props.fileSuffixes}
        />
      </div>
    );
  }

}

TreeListView.propTypes = propTypes;

export default TreeListView;
