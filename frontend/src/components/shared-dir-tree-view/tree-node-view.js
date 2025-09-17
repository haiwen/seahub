import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '@/utils/constants';

const LEFT_INDENT = 20;

const propTypes = {
  node: PropTypes.object.isRequired,
  currentPath: PropTypes.string.isRequired,
  leftIndent: PropTypes.number.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
};

class TreeNodeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlight: false,
    };
  }

  onMouseEnter = () => {
    this.setState({
      isHighlight: true,
    });
  };

  onMouseOver = () => {
    this.setState({
      isHighlight: true,
    });
  };

  onMouseLeave = () => {
    this.setState({
      isHighlight: false,
    });
  };

  onNodeClick = () => {
    const { node } = this.props;
    this.props.onNodeClick(node);
  };

  onLoadToggle = (e) => {
    e.stopPropagation();
    const { node } = this.props;
    if (node.isExpanded) {
      this.props.onNodeCollapse(node);
    } else {
      this.props.onNodeExpanded(node);
    }
  };

  getNodeTypeAndIcon = () => {
    let { node } = this.props;
    let icon = '';
    let type = '';
    if (node.object.is_dir) {
      icon = <i className="sf3-font sf3-font-folder"></i>;
      type = 'dir';
    } else {
      let index = node.object.file_name.lastIndexOf('.');
      if (index === -1) {
        icon = <i className="sf3-font sf3-font-file"></i>;
        type = 'file';
      } else {
        let suffix = node.object.file_name.slice(index).toLowerCase();
        if (suffix === '.png' || suffix === '.jpg' || suffix === '.jpeg' || suffix === '.gif' || suffix === '.bmp') {
          icon = <i className="sf3-font sf3-font-image"></i>;
          type = 'image';
        }
        else if (suffix === '.md' || suffix === '.markdown') {
          icon = <i className="sf3-font sf3-font-files2"></i>;
          type = 'file';
        }
        else {
          icon = <i className="sf3-font sf3-font-file"></i>;
          type = 'file';
        }
      }
    }
    return { icon, type };
  };

  renderChildren = () => {
    let { node } = this.props;
    if (!node.hasChildren()) {
      return '';
    }
    return (
      <div className="children">
        {node.children.map((item, index) => {
          return (
            <TreeNodeView
              key={index}
              node={item}
              leftIndent={this.props.leftIndent + LEFT_INDENT}
              currentPath={this.props.currentPath}
              onNodeClick={this.props.onNodeClick}
              onNodeCollapse={this.props.onNodeCollapse}
              onNodeExpanded={this.props.onNodeExpanded}
            />
          );
        })}
      </div>
    );
  };

  render() {
    let { currentPath, node, leftIndent } = this.props;
    let { type, icon } = this.getNodeTypeAndIcon();
    let hlClass = this.state.isHighlight ? 'tree-node-inner-hover' : '';
    if (node.path === currentPath) {
      hlClass = 'tree-node-hight-light';
    }

    const nodeName = node.object.folder_name || node.object.file_name;
    return (
      <div className="tree-node">
        <div
          type={type}
          className={`tree-node-inner text-nowrap ${hlClass} ${node.path === '/' ? 'hide' : ''}`}
          title={nodeName}
          onMouseEnter={this.onMouseEnter}
          onMouseOver={this.onMouseOver}
          onMouseLeave={this.onMouseLeave}
          onClick={this.onNodeClick}
        >
          <div
            className="tree-node-text"
            style={{ paddingLeft: leftIndent + 5 }}
          >
            {nodeName}
          </div>
          <div className="left-icon" style={{ left: leftIndent - 40 }}>
            {type === 'dir' && (!node.isLoaded || (node.isLoaded && node.hasChildren())) && (
              <i
                className={`folder-toggle-icon sf3-font sf3-font-down ${node.isExpanded ? '' : 'rotate-270'}`}
                onMouseDown={e => e.stopPropagation()}
                onClick={this.onLoadToggle}
                role="button"
                aria-label={node.isExpanded ? gettext('Collapse') : gettext('Expand')}
              >
              </i>
            )}
            <i className="tree-node-icon">{icon}</i>
          </div>
        </div>
        {node.isExpanded && this.renderChildren()}
      </div>
    );
  }
}

TreeNodeView.propTypes = propTypes;

export default TreeNodeView;
