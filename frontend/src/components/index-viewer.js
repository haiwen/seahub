import React from 'react';
import PropTypes from 'prop-types';
import { repoID, slug, serviceURL, isPublicWiki } from '../utils/constants';
import { Utils } from '../utils/utils';
import { Value } from 'slate';
import { deserialize } from '@seafile/seafile-editor/dist/utils/slate2markdown';
import'../css/index-viewer.css';

const viewerPropTypes = {
  indexContent: PropTypes.string.isRequired,
  onLinkClick: PropTypes.func.isRequired,
};

class IndexContentViewer extends React.Component {

  constructor(props) {
    super(props);
    this.links = [];
    this.rootNode = {};
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
    event.stopPropagation();
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
    if (item.object == 'inline') {
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

  modifyValueBeforeRender = (value) => {
    let nodes = value.document.nodes;
    let newNodes = Utils.changeMarkdownNodes(nodes, this.changeInlineNode);
    value.document.nodes = newNodes;
    return value;
  }

  getRootNode = () => {
    let value = deserialize(this.props.indexContent);
    value = value.toJSON();
    value = this.modifyValueBeforeRender(value);
    value = Value.fromJSON(value);
    const nodes = value.document.nodes;
    nodes.map((node) => {
      if (node.type ==='unordered_list' || node.type === 'ordered_list') {
        this.rootNode = node;
      }
    });
  }

  render() {
    return <FolderItem rootNode={this.rootNode} bindClickEvent={this.bindClickEvent} hasChild={false}/>;
  }
}

IndexContentViewer.propTypes = viewerPropTypes;

const FolderItemPropTypes = {
  rootNode: PropTypes.object.isRequired,
  bindClickEvent: PropTypes.func.isRequired,
  hasChild: PropTypes.bool,
};

class FolderItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showChild: true
    };
  }

  toggleShowChild = () => {
    this.setState({showChild: !this.state.showChild}, () => {
      if (this.state.showChild) {
        this.props.bindClickEvent();
      }
    });
  }

  componentDidMount() {
    if (this.props.hasChild) {
      this.setState({ showChild: false });
    }
  }

  render() {
    const { rootNode } = this.props;
    return (
      <div className="folder-item px-2">
        {
          rootNode.nodes.map((node) => {
            if (node.type === 'paragraph') {
              let href = '';
              node.nodes.map((linkNode) => {
                // deal with node isn't a link
                href = linkNode.data ? encodeURI(linkNode.data.get('href')) : 'javascript:void(0);';
              });
              return (
                <div key={node.key} className="px-4 wiki-nav-content">
                  <a href={href}>{node.text}</a>
                </div>
              );
            } else {
              const hasChild = (rootNode.type === 'unordered_list' && rootNode.nodes.size > 1);
              return (
                <React.Fragment key={node.key}>
                  {this.props.hasChild &&
                    <span className="switch-btn" onClick={this.toggleShowChild}>
                      {this.state.showChild ? <i className="fa fa-caret-down"></i> : <i className="fa fa-caret-right"></i>}
                    </span>
                  }
                  {this.state.showChild &&
                    <FolderItem
                      rootNode={node}
                      key={node.key}
                      hasChild={hasChild}
                      bindClickEvent={this.props.bindClickEvent}
                    />
                  }
                </React.Fragment>
              );
            }
          })
        }
      </div>
    );
  }
}

FolderItem.propTypes = FolderItemPropTypes;

export default IndexContentViewer;
