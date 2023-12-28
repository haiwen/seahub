import React from 'react';
import PropTypes from 'prop-types';
import { MarkdownViewer } from '@seafile/sdoc-editor';
import { appAvatarURL, assetsUrl, gettext, name, repoID, serviceURL, sharedToken, siteRoot, slug, username } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../loading';

import './style.css';

const propTypes = {
  isWiki: PropTypes.bool,
  path: PropTypes.string,
  repoID: PropTypes.string,
  isTOCShow: PropTypes.bool,
  children: PropTypes.object,
  isFileLoading: PropTypes.bool.isRequired,
  containerClassName: PropTypes.string,
  markdownContent: PropTypes.string.isRequired,
  latestContributor: PropTypes.string.isRequired,
  lastModified: PropTypes.string.isRequired,
  onLinkClick: PropTypes.func.isRequired,
};

class SdocMarkdownViewer extends React.Component {

  constructor(props) {
    super(props);
    this.scrollRef = React.createRef();
  }

  componentDidMount() {
    // const eventBus = EventBus.getInstance();
    // this.unsubscribeLinkClick = eventBus.subscribe(EXTERNAL_EVENTS.ON_LINK_CLICK, this.onLinkClick);
  }

  componentWillUnmount() {
    // this.unsubscribeLinkClick();
  }

  onLinkClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    let link = '';
    let target = event.target;
    while (!target.dataset || !target.dataset.url) {
      target = target.parentNode;
    }
    if (!target) return;
    link = target.dataset.url;
    this.props.onLinkClick(link);
  };

  changeInlineNode = (item) => {
    const { repoID } = this.props;
    let url, imagePath;
    // isPublicWiki: in the old version, only public wiki need replace image url
    if (item.type == 'image') { // change image url
      url = item.data.src;
      const re = new RegExp(serviceURL + '/lib/' + repoID +'/file.*raw=1');
      // different repo
      if (re.test(url)) {
        // get image path
        let index = url.indexOf('/file');
        let index2 = url.indexOf('?');
        imagePath = url.substring(index + 5, index2);
      } else if (/^\.\.\/*/.test(url) || /^\.\/*/.test(url)) {
        const path = this.props.path;
        const originalPath = path.slice(0, path.lastIndexOf('/')) + '/' + url;
        imagePath = Utils.pathNormalize(originalPath);
      } else {
        return;
      }
      item.data.src = serviceURL + '/view-image-via-public-wiki/?slug=' + slug + '&path=' + imagePath;
    } else if (item.type == 'link') { // change link url
      url = item.url;
      if (Utils.isInternalFileLink(url, repoID)) { // change file url
        if (Utils.isInternalMarkdownLink(url, repoID)) {
          let path = Utils.getPathFromInternalMarkdownLink(url, repoID);
          // replace url
          item.url = serviceURL + '/published/' + slug + path;
        } else {
          item.url = url.replace(/(.*)lib\/([-0-9a-f]{36})\/file(.*)/g, (match, p1, p2, p3) => {
            return `${p1}d/${sharedToken}/files/?p=${p3}&dl=1`;
          });
        }
      } else if (Utils.isInternalDirLink(url, repoID)) { // change dir url
        let path = Utils.getPathFromInternalDirLink(url, repoID);
        // replace url
        item.url = serviceURL + '/published/' + slug + path;
      }
    }

    return item;
  };

  modifyValueBeforeRender = (value) => {
    let newNodes = Utils.changeMarkdownNodes(value, this.changeInlineNode);
    return newNodes;
  };

  renderMarkdown = () => {
    let { isTOCShow, markdownContent } = this.props;
    if (!markdownContent) return null;

    let document = JSON.parse(markdownContent);
    // if (isWiki) {
    //   const newChildren = this.modifyValueBeforeRender(document.children);
    //   document.children = newChildren;
    // }

    if (!window.seafile) {
      window.seafile = {
        serviceUrl: serviceURL,
        username: username,
        name: name,
        avatarURL: appAvatarURL,
        repoID: repoID,
        siteRoot: siteRoot,
        assetsUrl: assetsUrl,
      };
    }

    const props = {
      document: document,
      showOutline: isTOCShow,
      scrollRef: this.scrollRef,
    };

    return <MarkdownViewer {...props} />;
  };

  render() {
    if (this.props.isFileLoading) {
      return <Loading />;
    }

    const { isWiki, containerClassName = '' } = this.props;
    const containerClass = `wiki-page-container ${containerClassName}`;
    // In dir-column-file width is 100%;
    // In wiki-viewer width isn't 100%
    const contentClassName = `wiki-page-content ${!isWiki ?  + 'w-100' : ''}`;
    return (
      <div ref={this.scrollRef} className={containerClass}>
        <div className={contentClassName}>
          {this.props.children}
          {this.renderMarkdown()}
          <p id="wiki-page-last-modified">{gettext('Last modified by')} {this.props.latestContributor}, <span>{this.props.lastModified}</span></p>
        </div>
      </div>
    );
  }
}

const defaultProps = {
  isWiki: false,
  isTOCShow: true,
};

SdocMarkdownViewer.propTypes = propTypes;
SdocMarkdownViewer.defaultProps = defaultProps;

export default SdocMarkdownViewer;
