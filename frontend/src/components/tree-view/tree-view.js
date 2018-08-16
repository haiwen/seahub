import React from 'react';
import TreeNodeView from './tree-node-view';
import Tree from './tree';
import NodeMenu from './node-menu';


class TreeView extends React.PureComponent {

  static defaultProps = {
    paddingLeft: 20
  };

  imagePreviewTimeout = null

  state = {
    tree: new Tree(),
    loadingFailed: false,
    imagePreviewPosition: {
      left: 10+'px',
      top: 10+'px'
    },
    isShowImagePreview: false,
    imagePreviewLoading: false,
    imageSrc: '',
    isShowMenu: false,
    fileName: '',
    filePath: '',
    type: '',
    left: 0,
    right: 0,
  }

  showImagePreview = (e, node) => {
    e.persist();

    let type = e.target.getAttribute('type');
    if (type === 'image') {
      this.imagePreviewTimeout = setTimeout(() => {
        let X = e.clientX + 20;
        let Y = e.clientY - 55;
        if (e.view.innerHeight < e.clientY + 150) {
          Y = e.clientY - 219;
        }
        this.setState({
          isShowImagePreview: true,
          imagePreviewLoading: true,
          imageSrc: this.props.editorUtilities.getFileURL(node),
          imagePreviewPosition: {
            left: X + 'px',
            top: Y + 'px'
          }
        });
      }, 1000)
    }
  }

  hideImagePreview = (e) => {
    clearTimeout(this.imagePreviewTimeout);
    this.setState({
      isShowImagePreview: false,
      imagePreviewLoading: false,
    });
  }

  imageLoaded = () => {
    this.setState({
      imagePreviewLoading: false,
    });
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

  hideContextMenu = () => {
    this.setState({
      isShowMenu : false
    })
  }

  componentDidMount() {
    this.getFiles();
    document.addEventListener('click', this.hideContextMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.hideContextMenu);
  }


  render() {
    const tree = this.state.tree;
    if (!tree.root) {
      return <div>Loading...</div>
    }

    return (
      <div className="tree-view tree">
          <TreeNodeView
           node={tree.root}
           paddingLeft={20}
           treeView={this}
        />
        { this.state.isShowImagePreview &&
          <div style={this.state.imagePreviewPosition} className={'image-view'}>
            { this.state.imagePreviewLoading && <i className={'rotate fa fa-spinner'}/> }
            <img src={this.state.imageSrc} onLoad={this.imageLoaded} alt=""/>
          </div>
        }
        <NodeMenu
          left={this.state.left}
          top={this.state.top}
          isShowMenu={this.state.isShowMenu}
          curFileType={this.state.type}
          curFileName={this.state.fileName}
          onContextMenu={this.onContextMenu}
          onDeleteNode={this.onDeleteNode}
          onAddFileNode={this.onAddFileNode}
          onAddFolderNode={this.onAddFolderNode}
          onRenameNode={this.onRenameNode}
        />
      </div>
    );
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

  onContextMenu = (e, node) => {
    if (!node) {
      this.setState({isShowMenu: false}); //just close node menu;
      return;
    }
    e.nativeEvent.stopImmediatePropagation();
    this.setState({
      type: node.type,
      fileName: node.name,
      filePath: node.path,
      isShowMenu: !this.state.isShowMenu,
      left: e.clientX + 5,
      top: e.clientY + 5
    })
  }


  onDeleteNode = () => {
    let filePath = this.state.filePath;
    if (this.state.type === 'file') {
      this.props.editorUtilities.deleteFile(filePath).then(res => {
        this.getFiles()
      })
    } 

    if (this.state.type === 'dir') {
      this.props.editorUtilities.deleteDir(filePath).then(res => {
        this.getFiles()
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
    let filePath = this.state.filePath;
    if (this.state.type === 'file') {
      this.props.editorUtilities.renameFile(filePath, newName).then(res => {
        this.getFiles()
      })
    }

    if (this.state.type === 'dir') {
      this.props.editorUtilities.renameDir(filePath, newName).then(res => {
        this.getFiles();
      })
    }
  }

}

export default TreeView;
