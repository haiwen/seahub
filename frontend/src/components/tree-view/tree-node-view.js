import React from 'react';

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

  componentDidMount() {
    document.addEventListener('click', this.hideMenuIcon);
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
      l = l.filter((node) => { return node.type == "dir" || node.isMarkdown(); })

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
              />
            );
          })}
        </div>
      );
    }

    return null;
  }

  render() {
    const { node } = this.props;
    const styles = {};
    var icon, type;
    if (node.type === "dir") {
      icon = <i className="far fa-folder"/>;
      type = 'dir';
    } else  {
      let index = node.name.lastIndexOf(".");
      if (index === -1) {
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

    return (
      <div type={type} className="tree-node" style={styles}>
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
          <div className="right-icon" onClick={this.onContextMenu}>
            <i className={`fas fa-ellipsis-v ${this.state.isMenuIconShow ? "" : "hide"}`}></i>
          </div>
        </div>
        {node.isExpanded ? this.renderChildren() : null}
      </div>
    );
  }

  onClick = e => {
    let { node } = this.props;
    this.props.treeView.onClick(e, node);
  }

  onMouseEnter = e => {
    let { node } = this.props;
    this.props.treeView.showImagePreview(e, node);
    if (!this.props.isNodeItemFrezee) {
      this.setState({
        isMenuIconShow: true
      })
    }
  }

  onMouseLeave = e => {
    this.props.treeView.hideImagePreview(e);
    if (!this.props.isNodeItemFrezee) {
      this.setState({
        isMenuIconShow: false
      })
    }
  }

  handleCollapse = e => {
    e.stopPropagation();
    const { node } = this.props;
    if (this.props.treeView.toggleCollapse) {
      this.props.treeView.toggleCollapse(node);
    }
  }

  onDragStart = e => {
    const { node } = this.props;
    this.props.treeView.onDragStart(e, node);
  }

  onContextMenu = e => {
    e.stopPropagation();
    const { node } = this.props;
    this.props.treeView.onShowContextMenu(e, node);
  }

  hideMenuIcon = () => {
    this.setState({
      isMenuIconShow: false
    });
  }

}

export default TreeNodeView;
