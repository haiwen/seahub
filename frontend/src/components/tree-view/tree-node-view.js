import React from 'react';
import MenuControl from '../menu-component/node-menu-control'

function sortByType(a, b) {
  if (a.type == "dir" && b.type != "dir") {
    return -1;
  } else if (a.type != "dir" && b.type == "dir") {
    return 1;
  } else {
    return a.name.localeCompare(b.name);
  }
}

class TreeNodeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isMenuIconShow: false
    }
  }

  onClick = (e) => {
    // e.nativeEvent.stopImmediatePropagation();
    let { node } = this.props;
    this.props.treeView.onNodeClick(e, node);
  }

  onMouseEnter = () => {
    if (!this.props.isNodeItemFrezee) {
      this.setState({
        isMenuIconShow: true
      })
    }
  }

  onMouseLeave = () => {
    if (!this.props.isNodeItemFrezee) {
      this.setState({
        isMenuIconShow: false
      })
    }
  }

  handleCollapse = (e) => {
    e.stopPropagation();
    const { node } = this.props;
    if (this.props.treeView.toggleCollapse) {
      this.props.treeView.toggleCollapse(node);
    }
  }

  onDragStart = (e) => {
    const { node } = this.props;
    this.props.treeView.onDragStart(e, node);
  }

  onMenuControlClick = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    const { node } = this.props;
    this.props.treeView.onShowContextMenu(e, node);
  }

  hideMenuIcon = () => {
    this.setState({
      isMenuIconShow: false
    });
  }

  componentDidMount() {
    document.addEventListener('click', this.hideMenuIcon);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.node.path === nextProps.currentFilePath) {
      this.setState({isMenuIconShow: true});
    }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideMenuIcon);
  }

  renderCollapse = () => {
    const { node } = this.props;

    if (node.hasChildren()) {
      const { isExpanded } = node;
      return (
        <i
          className={isExpanded ? 'folder-toggle-icon fa fa-caret-down' : 'folder-toggle-icon fa fa-caret-right'}
          onMouseDown={e => e.stopPropagation()}
          onClick={this.handleCollapse}
        />
      );
    }

    return null;
  }

  renderChildren = () => {
    const { node } = this.props;
    if (node.children && node.children.length) {
      const childrenStyles = {
        paddingLeft: this.props.paddingLeft
      };
      var l = node.children.sort(sortByType);
      /*
        the `key` property is needed. Otherwise there is a warning in the console
      */
      return (
        <div className="children" style={childrenStyles}>
          {l.map(child => {
            return (
              <TreeNodeView
                node={child}
                key={child.path}
                paddingLeft={this.props.paddingLeft}
                treeView={this.props.treeView}
                isNodeItemFrezee={this.props.isNodeItemFrezee}
                permission={this.props.permission}
                currentFilePath={this.props.currentFilePath}
              />
            );
          })}
        </div>
      );
    }

    return null;
  }

  renderMenuController() {
    if (this.props.permission === "rw") {
      return (
        <div className="right-icon">
          <MenuControl 
            isShow={this.state.isMenuIconShow}
            onClick={this.onMenuControlClick}
          />
        </div>
      )
    }
    return;
  }

  getNodeTypeAndIcon() {
    const node = this.props.node;
    let icon = '';
    let type = '';
    if (node.type === 'dir') {
      icon = <i className="far fa-folder"/>;
      type = 'dir';
    } else {
      let index = node.name.lastIndexOf(".");
      if (index ===  -1) {
        icon = <i className="far fa-file"/>;
        type = 'file';
      } else {
        type = node.name.substring(index).toLowerCase();
        if (type === ".png" || type === ".jpg") {
          icon = <i className="far fa-image"/>;
          type = 'image';
        } else {
          icon = <i className="far fa-file"/>;
          type = 'file';
        }
      }
    }

    return { type, icon };


  }

  render() {
    const styles = {};
    let node = this.props.node;
    let { type, icon } = this.getNodeTypeAndIcon();
    let hlClass = "";
    if (!node.isDir() && node.path === this.props.currentFilePath) {
      hlClass = "tree-node-hight-light";
    }
    let customClass = "tree-node " + hlClass;

    return (
      <div type={type} className={customClass} style={styles}>
        <div 
          onMouseLeave={this.onMouseLeave} 
          onMouseEnter={this.onMouseEnter}
          onClick={this.onClick}
          type={type} 
          className={`tree-node-inner text-nowrap ${node.name === '/'? 'hide': ''}`}
        >
          <div className="tree-node-text" type={type} draggable="true" onDragStart={this.onDragStart}>{node.name}</div>
          <div className="left-icon">
            {this.renderCollapse()}
            <i type={type} className="tree-node-icon">{icon}</i>
          </div>
          {this.renderMenuController()}
        </div>
        {node.isExpanded ? this.renderChildren() : null}
      </div>
    );
  }

}

export default TreeNodeView;
