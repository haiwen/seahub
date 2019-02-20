import React from 'react';
import PropTypes from 'prop-types';
import TreeNodeMenu from './tree-node-menu';
import { permission } from '../../utils/constants';

const propTypes = {
  repoPermission: PropTypes.bool,
  node: PropTypes.object.isRequired,
  currentPath: PropTypes.string.isRequired,
  paddingLeft: PropTypes.number.isRequired,
  isNodeMenuShow: PropTypes.bool.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeDragStart: PropTypes.func.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnFreezedItem: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func,
};

class TreeNodeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlight: false,
      isShowOperationMenu: false
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isShowOperationMenu: true,
        isHighlight: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isShowOperationMenu: false,
        isHighlight: false,
      });
    }
  }

  onNodeClick = () => {
    this.props.onNodeClick(this.props.node);
  }

  onLoadToggle = () => {
    let { node } = this.props;
    if (node.isExpanded) {
      this.props.onNodeCollapse(node);
    } else {
      this.props.onNodeExpanded(node);
    }
  }

  onNodeDragStart = (e) => {
    this.props.onNodeDragStart(e, this.props.node);
  }

  onUnFreezedItem = () => {
    this.setState({isShowOperationMenu: false});
    this.props.onUnFreezedItem();
  }

  onMenuItemClick = (operation, node) => {
    this.props.onMenuItemClick(operation, node);
  }

  getNodeTypeAndIcon = () => {
    let { node } = this.props;
    let icon = '';
    let type = '';
    if (node.object.type === 'dir') {
      icon = <i className="far fa-folder"></i>;
      type = 'dir';
    } else {
      let index = node.object.name.lastIndexOf('.');
      if (index === -1) {
        icon = <i className="far fa-file"></i>;
        type = 'file';
      } else {
        let suffix = node.object.name.slice(index).toLowerCase();
        if (suffix === '.png' || suffix === '.jpg') {
          icon = <i className="far fa-image"></i>;
          type = 'image';
        } else {
          icon = <i className="far fa-file"></i>;
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
    return (
      <div className="children" style={{paddingLeft: paddingLeft}}>
        {node.children.map(item => {
          return (
            <TreeNodeView 
              key={item.path}
              node={item}
              paddingLeft={paddingLeft}
              repoPermission={this.props.repoPermission}
              currentPath={this.props.currentPath}
              isNodeMenuShow={this.props.isNodeMenuShow}
              isItemFreezed={this.props.isItemFreezed}
              onNodeClick={this.props.onNodeClick}
              onNodeCollapse={this.props.onNodeCollapse}
              onNodeExpanded={this.props.onNodeExpanded}
              onFreezedItem={this.props.onFreezedItem}
              onMenuItemClick={this.onMenuItemClick}
              onUnFreezedItem={this.onUnFreezedItem}
            />
          );
        })}
      </div>
    );
  }

  render() {
    let { currentPath, node, isNodeMenuShow } = this.props;
    let { type, icon } = this.getNodeTypeAndIcon();
    let hlClass = this.state.isHighlight ? 'tree-node-inner-hover ' : '';
    if (node.path === currentPath) {
      hlClass = 'tree-node-hight-light';
    }
    return (
      <div className="tree-node">
        <div type={type} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} className={`tree-node-inner text-nowrap ${hlClass} ${node.path === '/'? 'hide': ''}`}>
          <div className="tree-node-text" draggable="true" onDragStart={this.onNodeDragStart} onClick={this.onNodeClick}>{node.object.name}</div>
          <div className="left-icon">
            {type === 'dir' && (!node.isLoaded ||  (node.isLoaded && node.hasChildren())) && (
              <i 
                className={`folder-toggle-icon fa ${node.isExpanded ? 'fa-caret-down' : 'fa-caret-right'}`}
                onMouseDown={e => e.stopPropagation()}
                onClick={this.onLoadToggle}
              ></i>
            )}
            <i className="tree-node-icon">{icon}</i>
          </div>
          {isNodeMenuShow && (
            <div className="right-icon">
              {((this.props.repoPermission || permission) && this.state.isShowOperationMenu) && (
                <TreeNodeMenu 
                  node={this.props.node}
                  onMenuItemClick={this.onMenuItemClick}
                  onUnFreezedItem={this.onUnFreezedItem}
                  onFreezedItem={this.props.onFreezedItem}
                />
              )}
            </div>
          )}
        </div>
        {node.isExpanded && this.renderChildren()}
      </div>
    );
  }
}

TreeNodeView.propTypes = propTypes;

export default TreeNodeView;
