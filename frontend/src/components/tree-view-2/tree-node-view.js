import React from 'react';
import PropTypes from 'prop-types';
import TreeNodeMenu from './tree-node-menu';
import { permission } from '../../utils/constants';

const propTypes = {
  node: PropTypes.object.isRequired,
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
    if (node.hasExpanded()) {
      this.props.onNodeCollapse(node);
    } else {
      this.props.onNodeExpanded(node);
    }
  }

  onNodeDragStart = (e) => {

  }

  onMenuItemClick = (menuItem) => {
    this.props.onMenuItemClick(menuItem);
  }

  getNodeTypeAndIcon = () => {
    let { node } = this.props;
    let icon = '';
    let type = '';
    if (node.object.type === 'dir') {
      icon = <i className="far fa-folder"></i>
      type = 'dir';
    } else {
      let index = node.object.name.lastIndexOf('.');
      if (index === -1) {
        icon = <i className="far fa-file"></i>
        type = 'file';
      } else {
        let suffix = node.object.name.slice(index).toLowerCase();
        if (suffix === '.png' || suffix === '.jpg') {
          icon = <i className="far fa-image"></i>
          type = 'image';
        } else {
          icon = <i className="far fa-file"></i>
          type = 'file';
        }
      }
    }
    return {icon, type};
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
              key={item.path}
              node={item}
              paddingLeft={paddingLeft}
              currentPath={this.props.currentPath}
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
    let { currentPath, node } = this.props;
    let { type, icon } = this.getNodeTypeAndIcon();
    let hlClass = '';
    if (node.path === currentPath) {
      hlClass = 'tree-node-hight-light';
    }
    return (
      <div className="tree-node">
        <div type={type} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} className={`tree-node-inner text-nowrap ${hlClass} ${node.path === '/'? 'hide': ''}`}>
          <div className="tree-node-text" onClick={this.onNodeClick}>{node.object.name}</div>
          <div className="left-icon">
            {type === 'dir' && (!node.hasLoaded() ||  (node.hasLoaded() && node.hasChildren() !== 0)) && (
              <i 
                className={`folder-toggle-icon fa ${node.hasExpanded() ? 'fa-caret-down' : 'fa-caret-right'}`}
                onMouseDown={e => e.stopPropagation()}
                onClick={this.onLoadToggle}
              ></i>
            )}
            <i className="tree-node-icon">{icon}</i>
          </div>
          <div className="right-icon">
            {(permission && this.state.isShowOperationMenu) && (
              <TreeNodeMenu 
                node={this.props.node}
                onMenuItemClick={this.onMenuItemClick}
                onFreezedToggle={this.props.onFreezedToggle}
              />
            )}
          </div>
        </div>
        {node.hasExpanded() && this.renderChildren()}
      </div>
    );
  }
}

TreeNodeView.propTypes = propTypes;

export default TreeNodeView;
