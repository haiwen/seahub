import React from 'react';
import PropTypes from 'prop-types';
import CustomDropdown from '@/components/dropdown';
import OpIcon from '../../components/op-icon';
import { Utils } from '../../utils/utils';
import Icon from '../icon';
import getTreeNodeMenuList from './get-tree-node-menu-list';

const LEFT_INDENT = 20;

const propTypes = {
  idx: PropTypes.number,
  userPerm: PropTypes.string,
  currentRepoInfo: PropTypes.object,
  node: PropTypes.object.isRequired,
  currentPath: PropTypes.string.isRequired,
  leftIndent: PropTypes.number.isRequired,
  isNodeMenuShow: PropTypes.bool.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onNodeClick: PropTypes.func.isRequired,
  onNodeExpanded: PropTypes.func.isRequired,
  onNodeCollapse: PropTypes.func.isRequired,
  onNodeDragStart: PropTypes.func.isRequired,
  freezeItem: PropTypes.func.isRequired,
  unfreezeItem: PropTypes.func.isRequired,
  onMenuItemClick: PropTypes.func,
  onNodeDragMove: PropTypes.func,
  onNodeDrop: PropTypes.func,
  handleContextClick: PropTypes.func.isRequired,
  onNodeDragEnter: PropTypes.func.isRequired,
  onNodeDragLeave: PropTypes.func.isRequired,
  isDisplayFiles: PropTypes.bool,
};

class TreeNodeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlight: false,
      isShowOperationMenu: false,
      isNodeDropShow: false,
    };
    const { userPerm } = props;
    this.canDrag = userPerm === 'rw';
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    if (isCustomPermission) {
      const { modify } = customPermission.permission;
      this.canDrag = modify;
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (!nextProps.isItemFreezed) {
      this.setState({
        isShowOperationMenu: false,
        isHighlight: false,
      });
    }
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isShowOperationMenu: true,
        isHighlight: true,
      });
    }
  };

  onMouseOver = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isShowOperationMenu: true,
        isHighlight: true,
      });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isShowOperationMenu: false,
        isHighlight: false,
      });
    }
  };

  onNodeClick = () => {
    const { node } = this.props;
    const { object } = node;
    if (object.isDir()) {
      this.props.onNodeClick(this.props.node);
      return;
    }
    const { isCustomPermission, customPermission } = Utils.getUserPermission(object.permission);
    if (isCustomPermission) {
      const { preview: canPreview, modify: canModify } = customPermission.permission;
      if (!canPreview && !canModify) return;
    }
    this.props.onNodeClick(this.props.node);
  };

  onLoadToggle = (e) => {
    e.stopPropagation();
    let { node } = this.props;
    if (node.isExpanded) {
      this.props.onNodeCollapse(node);
    } else {
      this.props.onNodeExpanded(node);
    }
  };

  onNodeDragStart = (e) => {
    if (this.props.node.object.permission === 'navigate') {
      e.preventDefault();
      return;
    }
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    this.props.onNodeDragStart(e, this.props.node);
  };

  onNodeDragEnter = (e) => {
    if (this.props.node.object.permission === 'navigate') return;
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    if (this.props.node.object.type === 'dir') {
      this.setState({ isNodeDropShow: true });
    }
    this.props.onNodeDragEnter(e, this.props.node);
  };

  onNodeDragMove = (e) => {
    if (this.props.node.object.permission === 'navigate') return;
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    this.props.onNodeDragMove(e);
  };

  onNodeDragLeave = (e) => {
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    this.setState({ isNodeDropShow: false });
    this.props.onNodeDragLeave(e, this.props.node);
  };

  onNodeDrop = (e) => {
    if (this.props.node.object.permission === 'navigate') return;
    if (Utils.isIEBrowser() || !this.canDrag) {
      return false;
    }
    e.stopPropagation();
    this.setState({ isNodeDropShow: false });
    this.props.onNodeDrop(e, this.props.node);
  };

  unfreezeItem = () => {
    this.setState({ isShowOperationMenu: false });
    this.props.unfreezeItem();
  };

  onItemMouseDown = (event) => {
    event.stopPropagation();
    if (event.button === 2) {
      return;
    }
  };

  onItemContextMenu = (event) => {
    this.handleContextClick(event);
  };

  handleContextClick = (event) => {
    this.props.handleContextClick(event, this.props.node);
    this.setState({ isShowOperationMenu: false });
  };

  getNodeTypeAndIcon = () => {
    let { node } = this.props;
    let icon = '';
    let type = '';
    if (node.object.type === 'dir') {
      const { isExpanded } = node;
      icon = <Icon symbol={isExpanded ? 'folder-open' : 'folder'} />;
      type = 'dir';
    } else {
      let index = node.object.name.lastIndexOf('.');
      if (index === -1) {
        icon = <Icon symbol="file" />;
        type = 'file';
      } else {
        let suffix = node.object.name.slice(index).toLowerCase();
        if (suffix === '.png' || suffix === '.jpg' || suffix === '.jpeg' || suffix === '.gif' || suffix === '.bmp') {
          icon = <Icon symbol="gallery" />;
          type = 'image';
        }
        else if (suffix === '.md' || suffix === '.markdown') {
          icon = <Icon symbol="file" />;
          type = 'file';
        }
        else {
          icon = <Icon symbol="file" />;
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
        {node.children.map((item, idx) => {
          return (
            <TreeNodeView
              idx={idx}
              key={item.path}
              node={item}
              currentRepoInfo={this.props.currentRepoInfo}
              leftIndent={this.props.leftIndent + LEFT_INDENT}
              userPerm={this.props.userPerm}
              currentPath={this.props.currentPath}
              isNodeMenuShow={this.props.isNodeMenuShow}
              isItemFreezed={this.props.isItemFreezed}
              onNodeClick={this.props.onNodeClick}
              onNodeCollapse={this.props.onNodeCollapse}
              onNodeExpanded={this.props.onNodeExpanded}
              freezeItem={this.props.freezeItem}
              onMenuItemClick={this.props.onMenuItemClick}
              unfreezeItem={this.unfreezeItem}
              onNodeDragStart={this.props.onNodeDragStart}
              onNodeDragMove={this.props.onNodeDragMove}
              onNodeDrop={this.props.onNodeDrop}
              onNodeDragEnter={this.props.onNodeDragEnter}
              onNodeDragLeave={this.props.onNodeDragLeave}
              handleContextClick={this.props.handleContextClick}
              isDisplayFiles={this.props.isDisplayFiles}
            />
          );
        })}
      </div>
    );
  };

  render() {
    let { currentPath, node, isNodeMenuShow, userPerm, currentRepoInfo, leftIndent } = this.props;
    let { type, icon } = this.getNodeTypeAndIcon();
    let hlClass = this.state.isHighlight ? 'tree-node-inner-hover ' : '';
    if (node.path === currentPath) {
      hlClass = 'tree-node-hight-light';
    }

    if (node.path !== '/' && type !== 'dir' && !this.props.isDisplayFiles) {
      return '';
    }

    const nodeMenuList = getTreeNodeMenuList(node, userPerm, currentRepoInfo);
    return (
      <div className="tree-node">
        <div
          type={type}
          className={`tree-node-inner text-nowrap ${hlClass} ${node.path === '/' ? 'hide' : ''} ${this.state.isNodeDropShow ? 'tree-node-drop' : ''}`}
          onMouseEnter={this.onMouseEnter}
          onMouseOver={this.onMouseOver}
          onMouseLeave={this.onMouseLeave}
          onMouseDown={this.onItemMouseDown}
          onContextMenu={this.onItemContextMenu}
          onClick={this.onNodeClick}
          onKeyDown={Utils.onKeyDown}
          onFocus={this.onMouseEnter}
          tabIndex="0"
        >
          <div
            className="tree-node-text"
            title={node.object.name}
            draggable={this.canDrag && node.object.permission !== 'navigate'}
            onDragStart={this.onNodeDragStart}
            onDragEnter={this.onNodeDragEnter}
            onDragLeave={this.onNodeDragLeave}
            onDragOver={this.onNodeDragMove}
            onDrop={this.onNodeDrop}
            style={{ paddingLeft: leftIndent + 5 }}
          >
            {node.object.name}
          </div>
          <div className="left-icon" style={{ left: leftIndent - 40 }}>
            {type === 'dir' && (!node.isLoaded || (node.isLoaded && node.hasChildren())) && (
              <OpIcon
                id="tree-node-fold-btn"
                className={`folder-toggle-icon ${node.isExpanded ? '' : 'rotate-270'}`}
                symbol="down"
                onMouseDown={e => e.stopPropagation()}
                op={this.onLoadToggle}
              />
            )}
            <span className="tree-node-icon">{icon}</span>
          </div>
          {isNodeMenuShow && nodeMenuList.length > 0 && this.state.isShowOperationMenu && (
            <div className="right-icon">
              <CustomDropdown
                triggerClassName="op-icon mr-0"
                items={nodeMenuList.map(item => ({
                  key: item.key,
                  label: item.value,
                  onClick: (event) => {
                    event.stopPropagation();
                    this.props.onMenuItemClick(item.key, node);
                  },
                }))}
                freezeItem={this.props.freezeItem}
                unfreezeItem={this.unfreezeItem}
              />
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
