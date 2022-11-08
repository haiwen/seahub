import React from 'react';
import PropTypes from 'prop-types';
import { permission } from '../../utils/constants';
import TextTranslation from '../../utils/text-translation';
import ItemDropdownMenu from '../dropdown-menu/item-dropdown-menu';
import { Utils } from '../../utils/utils';

const propTypes = {
  userPerm: PropTypes.string,
  node: PropTypes.object.isRequired,
  currentPath: PropTypes.string.isRequired,
  paddingLeft: PropTypes.number.isRequired,
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
  onNodeDragLeave:PropTypes.func.isRequired,
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

  componentWillReceiveProps(nextProps) {
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
  }

  onMouseOver = () => {
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
  }

  onLoadToggle = (e) => {
    e.stopPropagation();
    let { node } = this.props;
    if (node.isExpanded) {
      this.props.onNodeCollapse(node);
    } else {
      this.props.onNodeExpanded(node);
    }
  }

  onNodeDragStart = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    this.props.onNodeDragStart(e, this.props.node);
  }

  onNodeDragEnter = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    if (this.props.node.object.type === 'dir') {
      this.setState({isNodeDropShow: true});
    }
    this.props.onNodeDragEnter(e, this.props.node);
  }

  onNodeDragMove = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    this.props.onNodeDragMove(e);
  }

  onNodeDragLeave = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    this.setState({isNodeDropShow: false});
    this.props.onNodeDragLeave(e, this.props.node);
  }

  onNodeDrop = (e) => {
    if (Utils.isIEBrower() || !this.canDrag) {
      return false;
    }
    e.stopPropagation();
    this.setState({isNodeDropShow: false});
    this.props.onNodeDrop(e, this.props.node);
  }

  unfreezeItem = () => {
    this.setState({isShowOperationMenu: false});
    this.props.unfreezeItem();
  }

  onMenuItemClick = (operation, event, node) => {
    this.props.onMenuItemClick(operation, node);
  }

  onItemMouseDown = (event) => {
    event.stopPropagation();
    if (event.button === 2) {
      return;
    }
  }

  onItemContextMenu = (event) => {
    this.handleContextClick(event);
  }

  handleContextClick = (event) => {
    this.props.handleContextClick(event, this.props.node);
    this.setState({isShowOperationMenu: false});
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
        if (suffix === '.png' || suffix === '.jpg' || suffix === '.jpeg' || suffix === '.gif' || suffix === '.bmp') {
          icon = <i className="far fa-image"></i>;
          type = 'image';
        }
        else if (suffix === '.md' || suffix === '.markdown') {
          icon = <i className="far fa-file-alt"></i>;
          type = 'file';
        }
        else {
          icon = <i className="far fa-file"></i>;
          type = 'file';
        }
      }
    }
    return {icon, type};
  }

  calculateMenuList = (node) => {
    let { NEW_FOLDER, NEW_FILE, COPY, MOVE, RENAME, DELETE, OPEN_VIA_CLIENT} =  TextTranslation;

    let menuList = [RENAME, DELETE, COPY, MOVE, OPEN_VIA_CLIENT];
    if (node.object.type === 'dir') {
      menuList = [NEW_FOLDER, NEW_FILE, COPY, MOVE, RENAME, DELETE];
    }

    const { userPerm } = this.props;
    const { isCustomPermission, customPermission } = Utils.getUserPermission(userPerm);
    if (!isCustomPermission) {
      return menuList;
    }

    menuList = [];
    const { create: canCreate, modify: canModify, delete: canDelete, copy: canCopy } = customPermission.permission;
    if (node.object.type === 'dir') {
      canCreate && menuList.push(NEW_FOLDER, NEW_FILE);
    }

    canCopy && menuList.push(COPY);
    canModify && menuList.push(MOVE, RENAME);
    canDelete && menuList.push(DELETE);

    if (node.object.type !== 'dir') { 
      menuList.push(OPEN_VIA_CLIENT);
    }

    return menuList;
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
            />
          );
        })}
      </div>
    );
  }

  render() {
    let { currentPath, node, isNodeMenuShow, userPerm } = this.props;
    let { type, icon } = this.getNodeTypeAndIcon();
    let hlClass = this.state.isHighlight ? 'tree-node-inner-hover ' : '';
    if (node.path === currentPath) {
      hlClass = 'tree-node-hight-light';
    }

    const { isCustomPermission } = Utils.getUserPermission(userPerm)
    return (
      <div className="tree-node">
        <div
          type={type}
          className={`tree-node-inner text-nowrap ${hlClass} ${node.path === '/'? 'hide': ''} ${this.state.isNodeDropShow ? 'tree-node-drop' : ''}`}
          title={node.object.name}
          onMouseEnter={this.onMouseEnter}
          onMouseOver={this.onMouseOver}
          onMouseLeave={this.onMouseLeave}
          onMouseDown={this.onItemMouseDown}
          onContextMenu={this.onItemContextMenu}
          onClick={this.onNodeClick}
        >
          <div className="tree-node-text" draggable={this.canDrag} onDragStart={this.onNodeDragStart} onDragEnter={this.onNodeDragEnter} onDragLeave={this.onNodeDragLeave} onDragOver={this.onNodeDragMove} onDrop={this.onNodeDrop}>{node.object.name}</div>
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
              {((userPerm === 'rw' || permission || isCustomPermission) && this.state.isShowOperationMenu) && (
                <ItemDropdownMenu
                  item={this.props.node}
                  toggleClass={'fas fa-ellipsis-v'}
                  getMenuList={this.calculateMenuList}
                  onMenuItemClick={this.onMenuItemClick}
                  freezeItem={this.props.freezeItem}
                  unfreezeItem={this.unfreezeItem}
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
