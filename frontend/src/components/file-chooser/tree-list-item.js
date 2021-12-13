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
  filePath: PropTypes.string,
  fileSuffixes: PropTypes.array,
};

class TreeViewItem extends React.Component {

  constructor(props) {
    super(props);
    let filePath = this.props.filePath ?  this.props.filePath +  '/' + this.props.node.object.name : this.props.node.path;

    this.state = {
      filePath: filePath,
    };
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
    let isCurrentRepo = false;
    if (this.props.selectedRepo) {
      isCurrentRepo = this.props.selectedRepo.repo_id === this.props.repo.repo_id;
    }

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
              repo={this.props.repo}
              onDirentItemClick={this.props.onDirentItemClick}
              selectedRepo={this.props.selectedRepo}
              selectedPath={this.props.selectedPath}
              fileSuffixes={this.props.fileSuffixes}
            />);
        })}
      </div>
    );
  }

  render() {
    let { node } = this.props;
    let isCurrentRepo = false;
    if (this.props.selectedRepo) {
      isCurrentRepo = this.props.selectedRepo.repo_id === this.props.repo.repo_id;
    }
    let isCurrentPath = this.props.selectedPath === this.state.filePath;

    const fileName = node.object.name;
    if (this.props.fileSuffixes && fileName && node.object.type === 'file') {
      if ( fileName.indexOf('.') !== -1) {
        const suffix = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase();
        if (!this.props.fileSuffixes.includes(suffix)) return null;
      } else {
        if (node.object.type === 'file') return null;
      }
    }

    return (
      <div className="file-chooser-item">
        <div className={`${node.path === '/'? 'hide': ''}`}>
          <div className={`${(isCurrentRepo && isCurrentPath) ? 'item-active' : ''} item-info`} onClick={this.onItemClick}>
            <div className="item-text">
              <span className="name user-select-none ellipsis" title={node.object && node.object.name}>{node.object && node.object.name}</span>
            </div>
            <div className="item-left-icon">
              {
                node.object.type !== 'file' &&
                <span className={`icon item-toggle fa ${node.isExpanded ? 'fa-caret-down' : 'fa-caret-right'}`} onClick={this.onToggleClick}></span>
              }
              <i className="tree-node-icon">
                <span className={`icon far ${node.object.type === 'dir' ? 'fa-folder' : 'fa-file'}`}></span>
              </i>
            </div>
          </div>
        </div>
        {node.isExpanded && this.renderChildren()}
      </div>
    );
  }
}

TreeViewItem.propTypes = propTypes;

export default TreeViewItem;
