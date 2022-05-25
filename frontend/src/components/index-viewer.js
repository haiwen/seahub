import React from 'react';
import PropTypes from 'prop-types';
import { repoID, slug, serviceURL, isPublicWiki } from '../utils/constants';
import { Utils } from '../utils/utils';
import { deserialize } from '@seafile/seafile-editor';
import'../css/index-viewer.css';

const viewerPropTypes = {
  indexContent: PropTypes.string.isRequired,
  onLinkClick: PropTypes.func.isRequired,
};

class TreeNode {

  constructor({ name, href, parentNode }) {
    this.name = name;
    this.href = href;
    this.parentNode = parentNode || null;
    this.children = [];
  }

  setParent(parentNode) {
    this.parentNode = parentNode;
  }

  addChildren(nodeList) {
    nodeList.forEach((node) => {
      node.setParent(this);
    });
    this.children = nodeList;
  }
}

class IndexContentViewer extends React.Component {

  constructor(props) {
    super(props);
    this.links = [];
    this.treeRoot = new TreeNode({ name: '', href: '' });
    this.state = {
      currentPath: '',
    };
  }

  componentWillMount() {
    this.getRootNode();
  }

  componentDidMount() {
    this.bindClickEvent();
  }

  componentWillReceiveProps() {
    this.removeClickEvent();
  }

  componentDidUpdate() {
    this.bindClickEvent();
  }

  componentWillUnmount() {
    this.removeClickEvent();
  }

  bindClickEvent = () => {
    const contentClass = 'wiki-nav-content';
    this.links = document.querySelectorAll(`.${contentClass} a`);
    this.links.forEach(link => {
      link.addEventListener('click', this.onLinkClick);
    });
  }

  removeClickEvent = () => {
    this.links.forEach(link => {
      link.removeEventListener('click', this.onLinkClick);
    });
  }

  onLinkClick = (event) => {
    event.preventDefault();
    const currentPath = event.target.getAttribute('data-path');
    if (currentPath === this.state.currentPath) {
      return;
    } else if (currentPath) {
      this.setState({ currentPath: currentPath });
    }
    const link = this.getLink(event.target);
    if (link) this.props.onLinkClick(link);
  }

  getLink = (node) => {
    const tagName = node.tagName;
    if (!tagName || tagName === 'HTML') return;
    if (tagName === 'A') {
      return node.href;
    } else {
      return this.getLink(node.parentNode);
    }
  }

  changeInlineNode = (item) => {
    if (item.type == 'link' || item.type === 'image') {
      let url;

      // change image url
      if (item.type == 'image' && isPublicWiki) {
        url = item.data.src;
        const re = new RegExp(serviceURL + '/lib/' + repoID +'/file.*raw=1');
        // different repo
        if (!re.test(url)) {
          return;
        }
        // get image path
        let index = url.indexOf('/file');
        let index2 = url.indexOf('?');
        const imagePath = url.substring(index + 5, index2);
        // replace url
        item.data.src = serviceURL + '/view-image-via-public-wiki/?slug=' + slug + '&path=' + imagePath;
      }

      else if (item.type == 'link') {
        url = item.data.href;
        /* eslint-disable */
        let expression = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/
        /* eslint-enable */
        let re = new RegExp(expression);

        // Solving relative paths
        if (!re.test(url)) {
          item.data.href = serviceURL + '/published/' + slug + '/' + url;
        }
        // change file url
        else if (Utils.isInternalMarkdownLink(url, repoID)) {
          let path = Utils.getPathFromInternalMarkdownLink(url, repoID);
          // replace url
          item.data.href = serviceURL + '/published/' + slug + path;
        }
        // change dir url
        else if (Utils.isInternalDirLink(url, repoID)) {
          let path = Utils.getPathFromInternalDirLink(url, repoID);
          // replace url
          item.data.href = serviceURL + '/published/' + slug + path;
        }
      }
    }

    return item;
  }

  getRootNode = () => {
    let value = deserialize(this.props.indexContent);
    const newNodes = Utils.changeMarkdownNodes(value, this.changeInlineNode);
    newNodes.map((node) => {
      if (node.type === 'unordered_list' || node.type === 'ordered_list') {
        let treeRoot = this.transSlateToTree(node.children, this.treeRoot);
        this.setNodePath(treeRoot, '/');
        this.treeRoot = treeRoot;
      }
    });
  }

  setNodePath = (node, parentNodePath) => {
    let name = node.name;
    let path = parentNodePath === '/' ? parentNodePath + name : parentNodePath + '/' + name;
    node.path = path;
    if (node.children.length > 0) {
      node.children.map(child => {
        this.setNodePath(child, path);
      });
    }
  }

  // slateNodes is list items of an unordered list or ordered list, translate them to treeNode and add to parentTreeNode
  transSlateToTree = (slateNodes, parentTreeNode) => {
    let treeNodes = slateNodes.map((slateNode) => {
      // item has children(unordered list)
      if (slateNode.children.length === 2 && (slateNode.children[1].type === 'unordered_list' || slateNode.children[1].type === 'ordered_list')) {
        // slateNode.nodes[0] is paragraph, create TreeNode, set name and href
        const paragraphNode = slateNode.children[0];
        const treeNode = this.transParagraph(paragraphNode);
        // slateNode.nodes[1] is list, set it as TreeNode's children
        const listNode = slateNode.children[1];
        // Add sub list items to the tree node
        return this.transSlateToTree(listNode.children, treeNode);
      } else {
        // item doesn't have children list
        if (slateNode.children[0] && (slateNode.children[0].type === 'paragraph')) {
          return this.transParagraph(slateNode.children[0]);
        } else {
          // list item contain table/code_block/blockqupta
          return new TreeNode({ name: '', href: '' });
        }
      }
    });
    parentTreeNode.addChildren(treeNodes);
    return parentTreeNode;
  }

  // translate slate_paragraph_node to treeNode
  transParagraph = (paragraphNode) => {
    let treeNode;
    if (paragraphNode.children[1] && paragraphNode.children[1].type === 'link') {
      // paragraph node is a link node
      const linkNode = paragraphNode.children[1];
      const textNode = linkNode.children[0];
      let name = textNode ? textNode.text : '';
      treeNode =  new TreeNode({ name: name, href: linkNode.data.href });
    } else if (paragraphNode.children[0]) {
      // paragraph first child node is a text node, then get node name
      const textNode = paragraphNode.children[0];
      let name = textNode.text ? textNode.text : '';
      treeNode = new TreeNode({ name: name, href: '' });
    } else {
      treeNode = new TreeNode({ name: '', href: '' });
    }
    return treeNode;
  }

  render() {
    return (
      <div className="mx-4 o-hidden">
        <FolderItem node={this.treeRoot} bindClickEvent={this.bindClickEvent} currentPath={this.state.currentPath}/>
      </div>
    );
  }
}

IndexContentViewer.propTypes = viewerPropTypes;

const FolderItemPropTypes = {
  node: PropTypes.object.isRequired,
  bindClickEvent: PropTypes.func.isRequired,
  currentPath: PropTypes.string,
};

class FolderItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      expanded: false
    };
  }

  toggleExpanded = () => {
    this.setState({ expanded: !this.state.expanded }, () => {
      if (this.state.expanded) this.props.bindClickEvent();
    });
  }

  renderLink = ({ href, name, path }) => {
    const className = `wiki-nav-content ${path === this.props.currentPath ? 'wiki-nav-content-highlight' : ''}`;
    if (href && name) {
      return <div className={className}><a href={href} data-path={path} onClick={this.toggleExpanded} title={name}>{name}</a></div>;
    } else if (name) {
      return <div className="wiki-nav-content"><span onClick={this.toggleExpanded} title={name}>{name}</span></div>;
    } else {
      return null;
    }
  }

  componentDidMount() {
    if (this.props.node && !this.props.node.parentNode) {
      this.setState({ expanded: true }, () => {
        this.props.bindClickEvent();
      });
    }
  }

  render() {
    const { node } = this.props;
    if (node.children.length > 0) {
      return (
        <React.Fragment>
          {node.parentNode &&
            <React.Fragment>
              <span className="switch-btn" onClick={this.toggleExpanded}>
                {this.state.expanded ? <i className="fa fa-caret-down"></i> : <i className="fa fa-caret-right"></i>}
              </span>
              {this.renderLink(node)}
            </React.Fragment>
          }
          {this.state.expanded && node.children.map((child, index) => {
            return (
              <div className="pl-4 position-relative" key={index}>
                <FolderItem node={child} bindClickEvent={this.props.bindClickEvent} currentPath={this.props.currentPath}/>
              </div>
            );
          })}
        </React.Fragment>
      );
    } else {
      return this.renderLink(node);
    }
  }
}

FolderItem.propTypes = FolderItemPropTypes;

export default IndexContentViewer;
