import React from 'react';
import PropTypes from 'prop-types';
import TreeNodeMenu from './tree-node-menu';

const propTypes = {
  node: PropTypes.object.isRequired,
  permission: PropTypes.bool.isRequired,
  currentPath: PropTypes.string.isRequired,
  paddingLeft: PropTypes.number.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeDragStart: PropTypes.func.isRequired,
  onFreezedToggle: PropTypes.func.isRequired,
};

function sortNode(a, b) {
  if (a.object.type == 'dir' && b.object.type != 'dir') {
    return -1;
  } else if (a.object.type != 'dir' && b.object.type == 'dir') {
    return 1;
  } else {
    return a.object.name.localeCompare(b.object.name);
  }
}

class TreeNodeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isShowOperationMenu: false
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({isShowOperationMenu: true});
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({isShowOperationMenu: false});
    }
  }

  onNodeClick = () => {
    this.props.onNodeClick(this.props.node);
  }

  onLoadToggle = () => {
    let { node } = this.props;
    if (node.isExpanded()) {
      this.props.onNodeCollapse(node);
    } else {
      this.props.onNodeExpanded(node);
    }
  }

  onNodeDragStart = (e) => {

  }

  onMenuItemClick = (menuItem) => {

  }

  getNodeIcon = () => {
    let { node } = this.props;
    let icon = '';
    if (node.object.type === 'dir') {
      icon = <i className="far fa-folder"></i>
    } else {
      let index = node.object.name.lastIndexOf('.');
      if (index === -1) {
        icon = <i className="far fa-file"></i>
      } else {
        let suffix = node.object.name.slice(index).toLowerCase();
        if (suffix === '.png' || suffix === '.jpg') {
          icon = <i className="far fa-image"></i>
        } else {
          icon = <i className="far fa-file"></i>
        }
      }
    }
    return icon;
  }

  renderChildren = () => {
    let { node, paddingLeft } = this.props;
    if (!node.hasChildren()) {
      return '';
    }
    let sortedNode = node.children.sort(sortNode);
    return (
      <div className="children" style={{paddingLeft: paddingLeft}}>
        {sortedNode.map(item => {
          return (
            <TreeNodeView 
              node={item}
              permission={this.props.permission}
              paddingLeft={paddingLeft}
              onFreezedToggle={this.props.onFreezedToggle}
              onMenuItemClick={this.onMenuItemClick}
              onNodeClick={this.props.onNodeClick}
              onNodeCollapse={this.props.onNodeCollapse}
              onNodeExpanded={this.props.onNodeExpanded}
            />
          );
        })}
      </div>
    );
  }

  render() {
    let { node } = this.props;
    return (
      <div className="tree-node">
        <div onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <div className="tree-node-text" onClick={this.onNodeClick}></div>
          <div className="left-icon">
            {node.hasChildren() && (
              <i 
                className={`folder-toggle-icon fa ${node.isExpanded() ? 'fa-caret-down' : 'fa-caret-right'}`}
                onMouseDown={e => e.stopPropagation()}
                onClick={this.onLoadToggle}
              ></i>
            )}
            <i className="tree-node-icon">{this.getNodeIcon()}</i>
          </div>
          <div className="right-icon">
              {(this.props.permission && this.state.isShowOperationMenu) && (
                <TreeNodeMenu 
                  node={this.props.node}
                  onMenuItemClick={this.onMenuItemClick}
                  onFreezedToggle={this.props.onFreezedToggle}
                />
              )}
          </div>
        </div>
        {node.isExpanded() && this.renderChildren()}
      </div>
    );
  }
}

TreeNodeView.propTypes = propTypes;

export default TreeNodeView;
