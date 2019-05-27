import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  selectedPath: PropTypes.string,
  selectedRepo: PropTypes.object,
  repo: PropTypes.object.isRequired,
  onDirentItemClick: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
};

class TreeViewItem extends React.Component {

  constructor(props) {
    super(props);
    let filePath = this.props.filePath ?  this.props.filePath +  '/' + this.props.node.object.name : this.props.node.path;

    this.state = {
      filePath: filePath,
    }
  }

  onToggleClick = (e) => {
    e.stopPropagation();
    let { node } = this.props;
    if (node.isExpanded) {
      this.props.onNodeCollapse(node);
    } else {
      this.props.onNodeExpanded(node);
    }
  }

  onItemClick = (e) => {
    e.stopPropagation();  // need prevent event popup
    let isCurrentRepo = this.props.selectedRepo.repo_id === this.props.repo.repo_id;
    if (isCurrentRepo) {
      if (this.props.selectedPath !== this.state.filePath) {
        this.props.onDirentItemClick(this.state.filePath, this.props.node.object);
      } else {
        if (this.props.node.object.type === 'dir') {
          this.onToggleClick(e);
        }
      }
    } else {
      this.props.onDirentItemClick(this.state.filePath, this.props.node.object);
    }
  }

  renderChildren = () => {
    let { node } = this.props;
    if (!node.hasChildren()) {
      return '';
    }
    return(
      <div className="list-view-content">
        {node.children.map(item => {
          return (
            <TreeViewItem
              key={item.path}
              node={item}
              onNodeCollapse={this.props.onNodeCollapse}
              onNodeExpanded={this.props.onNodeExpanded}
              onNodeClick={this.props.onTreeNodeClick}
              repo={this.props.repo} 
              onDirentItemClick={this.props.onDirentItemClick}
              selectedRepo={this.props.selectedRepo}
              selectedPath={this.props.selectedPath}
              fileSuffixes={this.props.fileSuffixes}
            />)
        })}
      </div>
    )
  }

  render() {
    let { node } = this.props;
    let isCurrentRepo = this.props.selectedRepo.repo_id === this.props.repo.repo_id;
    let isCurrentPath = this.props.selectedPath === this.state.filePath;

    return(
      <div className={`file-chooser-item `}>
        <div className={`${node.path === '/'? 'hide': ''}`}>
          <span className={`item-toggle fa ${node.isExpanded ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onToggleClick}></span>
          <span className={`item-info ${(isCurrentRepo && isCurrentPath) ? 'item-active' : ''}`} onClick={this.onItemClick}>
            <span className={`icon far ${node.object.type === 'dir' ? 'fa-folder' : 'fa-file'}`}></span>
            <span className="name user-select-none ellipsis">{node.object.name}</span>
          </span>
        </div>
        {node.isExpanded && this.renderChildren()}
      </div>
    );
  }
}

TreeViewItem.propTypes = propTypes;

export default TreeViewItem;
