import React from 'react';
import TreeNodeView from './tree-node-view';
import Tree from './tree';
import Delete from '../delete-dialog';
import AddFile from '../add-file-dialog';
import AddFolder from '../add-dir-dialog';
import Rename from '../rename-dialog';

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
    showAddFile: false,
    showAddFolder: false,
    showRename: false,
    showContextMenu: false,
    showDelete: false,
    fileName: '',
    fileParentPath: '',
    type: ''
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

  componentDidMount() {
    this.getFiles()
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
         { this.state.showContextMenu &&
           <div style={this.state.imagePreviewPosition} className={'contextmenu'}>
             <div className={'contextmenu-item item'} onClick={this.toggleDelete}>Delete</div>
             <div className={'contextmenu-item item'} onClick={this.toggleAddFile}>New File</div>
             <div className={'contextmenu-item item'} onClick={this.toggleAddFolder}>New Folder</div>
             <div className={'contextmenu-item item'} onClick={this.toggleRename}>Rename</div>
           </div>
         }
         <Delete isOpen={this.state.showDelete}
                 handleSubmit={this.onDelete}
                 toggleCancel={this.deleteCancel} />

        <AddFile isOpen={this.state.showAddFile}
                 toggleCancel={this.addFileCancel} 
                 onSetFilePath={this.onAddFile} />

        <AddFolder isOpen={this.state.showAddFolder}
                 toggleCancel={this.addFolderCancel} 
                 onSetFolderPath={this.onAddFolder} />

        <Rename isOpen={this.state.showRename}
                type={this.state.type}
                preName={this.state.fileName}
                onRename={this.onRename} 
                toggleCancel={this.renameCancel} />
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
    this.setState({
      showContextMenu: !this.state.showContextMenu,
      fileName: node.name,
      type: node.type,
      fileParentPath: node.parent_path 
    })
  }

  toggleDelete = () => {
    this.setState({
      showContextMenu: !this.state.showContextMenu,
      showDelete: !this.state.showDelete,
    })
  }

  onDelete = () => {
    let filePath = '/';
    if (this.state.fileParentPath === '/') {
      filePath = this.state.fileParentPath + this.state.fileName
    } else {
      filePath = this.state.fileParentPath + '/' + this.state.fileName
    }

    if (this.state.type === 'file') {
      this.props.editorUtilities.deleteFile(filePath).then(res => {
        this.setState({
          showDelete: !this.state.showDelete 
        })

        this.getFiles()
      })
    } 

    if (this.state.type === 'dir') {
      this.props.editorUtilities.deleteDir(filePath).then(res => {
        this.setState({
          showDelete: !this.state.showDelete 
        })

        this.getFiles()
      })
    }
  }

  deleteCancel = () => {
    this.setState({
      showDelete: !this.state.showDelete,
    })
  }

  toggleAddFile = () => {
    this.setState({
      showAddFile: !this.state.showAddFile,
      showContextMenu: !this.state.showContextMenu
    })
  }

  onAddFile = (filePath) => {
    this.props.editorUtilities.createFile(filePath).then(res => {
      this.setState({
        showAddFile: !this.state.showAddFile
      })
      this.getFiles()
    })
  }

  addFileCancel = () => {
    this.setState({
      showAddFile: !this.state.showAddFile,
    })
  }

  toggleAddFolder = () => {
    this.setState({
      showAddFolder: !this.state.showAddFolder,
      showContextMenu: !this.state.showContextMenu
    })
  }

  onAddFolder = (dirPath) => {
    this.props.editorUtilities.createDir(dirPath).then(res => {
      this.setState({
        showAddFolder: !this.state.showAddFolder
      })
      this.getFiles()
    })
  }

  addFolderCancel = () => {
    this.setState({
      showAddFolder: !this.state.showAddFolder,
    })
  }


  toggleRename = () => {
    this.setState({
      showRename: !this.state.showRename,
      showContextMenu: !this.state.showContextMenu
    }) 
  }

  onRename = (newName) => {

    let filePath = '/'
    if (this.state.fileParentPath === '/') {
      filePath = this.state.fileParentPath + this.state.fileName
    } else {
      filePath = this.state.fileParentPath + '/' + this.state.fileName
    }

    if (this.state.type === 'file') {
      this.props.editorUtilities.renameFile(filePath, newName).then(res => {
        this.setState({
          showRename: !this.state.showRename
        })
        this.getFiles()
      })
    }

    if (this.state.type === 'dir') {
      this.props.editorUtilities.renameDir(filePath, newName).then(res => {
        this.setState({
          showRename: !this.state.showRename
        });
        this.getFiles();
      })
    }
  }

  renameCancel = () => {
    this.setState({
      showRename: !this.state.showRename
    })
  }
}

export default TreeView;
