import React from 'react';
import PropTypes from 'prop-types';
import { EXTERNAL_EVENTS, EventBus, MarkdownViewer } from '@seafile/seafile-editor';
import { gettext, isPublicWiki, mediaUrl, repoID, serviceURL, sharedToken, slug } from '../utils/constants';
import Loading from './loading';
import { Utils } from '../utils/utils';

const propTypes = {
  children: PropTypes.object,
  isFileLoading: PropTypes.bool.isRequired,
  markdownContent: PropTypes.string.isRequired,
  latestContributor: PropTypes.string.isRequired,
  lastModified: PropTypes.string.isRequired,
  onLinkClick: PropTypes.func.isRequired,
  isWiki: PropTypes.bool,
  isTOCShow: PropTypes.bool,
  // for dir-column-file component(import repoID is undefined)
  repoID: PropTypes.string,
  path: PropTypes.string,
};

const contentClass = 'wiki-page-content';

class WikiMarkdownViewer extends React.Component {

  constructor(props) {
    super(props);
    this.scrollRef = React.createRef();
  }

  componentDidMount() {
    const eventBus = EventBus.getInstance();
    this.unsubscribeLinkClick = eventBus.subscribe(EXTERNAL_EVENTS.ON_LINK_CLICK, this.onLinkClick);
  }
  componentWillUnmount() {
    this.unsubscribeLinkClick();
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
    let url, imagePath;

    if (item.type == 'image' && isPublicWiki) { // change image url
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
    const { isTOCShow = true, isWiki, markdownContent } = this.props;
    const props = {
      isShowOutline: isTOCShow,
      mathJaxSource: `${mediaUrl}js/mathjax/tex-svg.js`,
      value: markdownContent,
      scrollRef: this.scrollRef,
      ...(isWiki && {beforeRenderCallback: this.modifyValueBeforeRender})
    };

    return <MarkdownViewer {...props} />;
  };

  render() {
    if (this.props.isFileLoading) {
      return <Loading />;
    }
    // In dir-column-file repoID is one of props, width is 100%; In wiki-viewer repoID is not props, width isn't 100%
    let contentClassName = `${this.props.repoID ? contentClass + ' w-100' : contentClass}`;
    return (
      <div ref={this.scrollRef} className="wiki-page-container">
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
};

WikiMarkdownViewer.propTypes = propTypes;
MarkdownViewer.defaultProps = defaultProps;

export default WikiMarkdownViewer;
