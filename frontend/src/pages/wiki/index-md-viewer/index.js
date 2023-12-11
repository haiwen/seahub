import React from 'react';
import PropTypes from 'prop-types';
import { mdStringToSlate } from '@seafile/seafile-editor';
import { isPublicWiki, repoID, serviceURL, slug } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { generateNavItems } from '../utils/generate-navs';
import NavItem from './nav-item';

import'./style.css';

const viewerPropTypes = {
  indexContent: PropTypes.string.isRequired,
  onLinkClick: PropTypes.func.isRequired,
};

class IndexMdViewer extends React.Component {

  constructor(props) {
    super(props);
    this.links = [];
    this.state = {
      currentPath: '',
      treeRoot: { name: '', href: '', children: [], isRoot: true },
    };
  }

  componentDidMount() {
    const { indexContent } = this.props;
    const slateNodes = mdStringToSlate(indexContent);
    const newSlateNodes = Utils.changeMarkdownNodes(slateNodes, this.changeInlineNode);
    const treeRoot = generateNavItems(newSlateNodes);
    this.setState({
      treeRoot: treeRoot,
    });
  }

  onLinkClick = (node) => {
    const { currentPath } = this.state;
    if (node.path === currentPath) return;
    if (node.path) {
      this.setState({ currentPath: node.path });
    }
    if (node.href) this.props.onLinkClick(node.href);
  };

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
        url = item.url;
        /* eslint-disable */
        let expression = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/
        /* eslint-enable */
        let re = new RegExp(expression);

        // Solving relative paths
        if (!re.test(url)) {
          if (url.startsWith('./')) {
            url = url.slice(2);
          }
          item.url = serviceURL + '/published/' + slug + '/' + url;
        }
        // change file url
        else if (Utils.isInternalMarkdownLink(url, repoID)) {
          let path = Utils.getPathFromInternalMarkdownLink(url, repoID);
          // replace url
          item.url = serviceURL + '/published/' + slug + path;
        }
        // change dir url
        else if (Utils.isInternalDirLink(url, repoID)) {
          let path = Utils.getPathFromInternalDirLink(url, repoID);
          // replace url
          item.url = serviceURL + '/published/' + slug + path;
        }
      }
    }

    return item;
  };

  render() {
    const { treeRoot, currentPath } = this.state;
    return (
      <div className="mx-4 o-hidden">
        {treeRoot.children.map(node => {
          return (
            <NavItem key={node.path} node={node} currentPath={currentPath} onLinkClick={this.onLinkClick} />
          );
        })}
      </div>
    );
  }
}

IndexMdViewer.propTypes = viewerPropTypes;

export default IndexMdViewer;
