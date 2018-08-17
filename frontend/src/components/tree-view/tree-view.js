import React from 'react';
import TreeNodeView from './tree-node-view';
import Tree from './tree';
import NodeMenu from './node-menu';


class TreeView extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state =  {
      tree: new Tree(),
      loadingFailed: false,
      isShowMenu: false,
      menu_left: 0,
      menu_top: 0,
      isNodeItemFrezee: false,
      currentNode: null
    };
  }

  change = (tree) => {
    /*
    this._updated = true;
    if (this.props.onChange) this.props.onChange(tree.obj);
    */
  }

  toggleCollapse = (node) => {
    const tree = this.state.tree;
    node.isExpanded = !node.isExpanded;

    // copy the tree to make PureComponent work
    this.setState({
      tree: tree.copy()
    });

    this.change(tree);
  }

  onDragStart = (e, node) => {
    const url = this.props.editorUtilities.getFileURL(node);
    e.dataTransfer.setData("text/uri-list", url);
    e.dataTransfer.setData("text/plain", url);
  }

  onClick = (e, node) => {
    if (node.isDir()) {
      this.toggleCollapse(node);
      return;
    }
    this.props.onClick(e, node);
  }

  onShowContextMenu = (e, node) => {
    e.nativeEvent.stopImmediatePropagation();
    this.setState({
      isShowMenu: !this.state.isShowMenu,
      menu_left: e.clientX - 8*16,
      menu_top: e.clientY + 10,
      isNodeItemFrezee: true,
      currentNode: node
    })
  }

  onHideContextMenu = () => {
    //just close node menu;
    this.setState({
      isShowMenu: false,
      isNodeItemFrezee: false
    }); 
  }

  onDeleteNode = () => {
    let filePath = this.state.currentNode.path;
    let type = this.state.currentNode.type;
    if (type === 'file') {
      this.props.editorUtilities.deleteFile(filePath).then(res => {
        this.getFiles();
      })
    } 

    if (type === 'dir') {
      this.props.editorUtilities.deleteDir(filePath).then(res => {
        this.getFiles();
      })
    }
  }

  onAddFileNode = (filePath) => {
    this.props.editorUtilities.createFile(filePath).then(res => {
      this.getFiles()
    })
  }

  onAddFolderNode = (dirPath) => {
    this.props.editorUtilities.createDir(dirPath).then(res => {
      this.getFiles()
    })
  }

  onRenameNode = (newName) => {
    var node = this.state.currentNode;
    let type = node.type;
    let filePath = node.path;
    if (type === 'file') {
      this.props.editorUtilities.renameFile(filePath, newName).then(res => {
        this.getFiles()
        if (this.isModifyCurrentFile()) {
          node.name = newName;
          this.props.onClick(null, node);
        }
      })
    }

    if (type === 'dir') {
      this.props.editorUtilities.renameDir(filePath, newName).then(res => {
        this.getFiles();
        if (this.isModifyContainsCurrentFile()) {
          let currentNode = this.state.currentNode;
          let nodePath = encodeURI(currentNode.path);
          let pathname = window.location.pathname;
          let start =  pathname.indexOf(nodePath);
          let node = currentNode.getNodeByPath(decodeURI(pathname.slice(start)));
          if(node){
            currentNode.name = newName;
            this.props.onClick(null, node);
          }
        }
      })
    }
  }

  isModifyCurrentFile() {
    let name = this.state.currentNode.name;
    let pathname = window.location.pathname;
    let currentName = pathname.slice(pathname.lastIndexOf("/") + 1);
    return name === currentName;
  }

  isModifyContainsCurrentFile() {
    let pathname = window.location.pathname;
    let nodePath = this.state.currentNode.path;
    if (pathname.indexOf(nodePath)) {
      return true;
    }
    return false;
  }

  getFiles = () => {
    this.props.editorUtilities.getFiles().then((files) => {
      // construct the tree object
      var rootObj = {
        name: '/',
        type: 'dir',
        isExpanded: true
      }
      var treeData = new Tree();
      treeData.parseFromList(rootObj, files);
      this.setState({
        tree: treeData,
      })
    }, () => {
      console.log("failed to load files");
      this.setState({
        loadingFailed: true
      })
    })
  }

  componentDidMount() {
    this.getFiles();
    document.addEventListener('click', this.onHideContextMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideContextMenu);
  }

  render() {
    const tree = this.state.tree;
    if (!tree.root) {
      return <div>Loading...</div>
    }

    let isCurrentFile = false;
    if (this.state.currentNode) {
      if (this.state.currentNode.type === "dir") {
        isCurrentFile = this.isModifyContainsCurrentFile(); 
      } else {
        isCurrentFile = this.isModifyCurrentFile();
      }
    }

    return (
      <div className="tree-view tree">
        <TreeNodeView
          node={tree.root}
          paddingLeft={20}
          treeView={this}
          isNodeItemFrezee={this.state.isNodeItemFrezee}
          permission={this.props.permission}
        />
        <NodeMenu
          left={this.state.menu_left}
          top={this.state.menu_top}
          isShowMenu={this.state.isShowMenu}
          currentNode={this.state.currentNode}
          onHideContextMenu={this.onHideContextMenu}
          onDeleteNode={this.onDeleteNode}
          onAddFileNode={this.onAddFileNode}
          onAddFolderNode={this.onAddFolderNode}
          onRenameNode={this.onRenameNode}
          isCurrentFile={isCurrentFile}
        />
      </div>
    );
  }

}

export default TreeView;
