import React from 'react';
import TreeNodeView from './tree-node-view';
import Tree from './tree';

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

  componentDidMount() {
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
        tree: treeData
      })
    }, () => {
      console.log("failed to load files");
      this.setState({
        loadingFailed: true
      })
    })
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
    this.props.onClick(e, node);
  }

}

export default TreeView;
