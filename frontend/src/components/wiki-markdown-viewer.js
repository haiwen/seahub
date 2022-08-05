import React from 'react';
import PropTypes from 'prop-types';
import { MarkdownViewer } from '@seafile/seafile-editor';
import { gettext, repoID, slug, serviceURL, isPublicWiki, sharedToken, mediaUrl } from '../utils/constants';
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
    this.state = {
      activeTitleIndex: 0,
    };
    this.markdownContainer = React.createRef();
    this.links = [];
    this.titlesInfo = [];
  }

  componentDidMount() {
    // Bind event when first loaded
    this.links = document.querySelectorAll(`.${contentClass} a`);
    this.links.forEach(link => {
      link.addEventListener('click', this.onLinkClick);
    });

    this.getTitlesInfo();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.markdownContent === nextProps.markdownContent) {
      return;
    }
    // Unbound event when updating
    this.links.forEach(link => {
      link.removeEventListener('click', this.onLinkClick);
    });
  }

  componentDidUpdate() {
    // Update completed, rebind event
    this.links = document.querySelectorAll(`.${contentClass} a`);
    this.links.forEach(link => {
      link.addEventListener('click', this.onLinkClick);
    });
    if (this.titlesInfo.length === 0) {
      this.getTitlesInfo();
    }
  }

  componentWillUnmount() {
    // Unbound events when the component is destroyed
    this.links.forEach(link => {
      link.removeEventListener('click', this.onLinkClick);
    });
  }

  getTitlesInfo = () => {
    let titlesInfo = [];
    const titleDom = document.querySelectorAll('h1[id^="user-content"]')[0];
    if (titleDom) {
      const id = titleDom.getAttribute('id');
      let content = id && id.replace('user-content-', '');
      content = content ? `${content} - ${slug}` : slug;
      Utils.updateTabTitle(content);
    }
    let headingList = document.querySelectorAll('h2[id^="user-content"], h3[id^="user-content"]');
    for (let i = 0; i < headingList.length; i++) {
      titlesInfo.push(headingList[i].offsetTop);
    }
    this.titlesInfo = titlesInfo;
  }

  onLinkClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    let link = '';
    if (event.target.tagName !== 'A') {
      let target = event.target.parentNode;
      while (target.tagName !== 'A') {
        target = target.parentNode;
      }
      link = target.href;
    } else {
      link = event.target.href;
    }
    this.props.onLinkClick(link);
  }

  onScrollHandler = () => {
    const contentScrollTop = this.markdownContainer.current.scrollTop + 180;
    let titlesLength = this.titlesInfo.length;
    let activeTitleIndex;
    if (contentScrollTop <= this.titlesInfo[0]) {
      activeTitleIndex = 0;
      this.setState({activeTitleIndex: activeTitleIndex});
      return;
    }
    if (contentScrollTop > this.titlesInfo[titlesLength - 1]) {
      activeTitleIndex = this.titlesInfo.length - 1;
      this.setState({activeTitleIndex: activeTitleIndex});
      return;
    }
    for (let i = 0; i < titlesLength; i++) {
      if (contentScrollTop > this.titlesInfo[i]) {
        continue;
      } else {
        activeTitleIndex = i - 1;
        break;
      }
    }
    this.setState({activeTitleIndex: activeTitleIndex});
  }

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
      url = item.data.href;
      if (Utils.isInternalFileLink(url, repoID)) { // change file url
        if (Utils.isInternalMarkdownLink(url, repoID)) {
          let path = Utils.getPathFromInternalMarkdownLink(url, repoID);
          // replace url
          item.data.href = serviceURL + '/published/' + slug + path;
        } else {
          item.data.href = url.replace(/(.*)lib\/([-0-9a-f]{36})\/file(.*)/g, (match, p1, p2, p3) => {
            return `${p1}d/${sharedToken}/files/?p=${p3}&dl=1`;
          });
        }
      } else if (Utils.isInternalDirLink(url, repoID)) { // change dir url
        let path = Utils.getPathFromInternalDirLink(url, repoID);
        // replace url
        item.data.href = serviceURL + '/published/' + slug + path;
      }
    }

    return item;
  }

  modifyValueBeforeRender = (value) => {
    let newNodes = Utils.changeMarkdownNodes(value, this.changeInlineNode);
    return newNodes;
  }

  renderMarkdown = () => {
    let isTOCShow = true;
    if (this.props.isTOCShow === false) {
      isTOCShow = false;
    }
    if (this.props.isWiki) {
      return (
        <MarkdownViewer
          showTOC={isTOCShow}
          scriptSource={mediaUrl + 'js/mathjax/tex-svg.js'}
          markdownContent={this.props.markdownContent}
          activeTitleIndex={this.state.activeTitleIndex}
          modifyValueBeforeRender={this.modifyValueBeforeRender}
        />
      );
    }

    return (
      <MarkdownViewer
        showTOC={isTOCShow}
        scriptSource={mediaUrl + 'js/mathjax/tex-svg.js'}
        markdownContent={this.props.markdownContent}
        activeTitleIndex={this.state.activeTitleIndex}
      />
    );
  }

  render() {
    if (this.props.isFileLoading) {
      return <Loading />;
    }
    // In dir-column-file repoID is one of props, width is 100%; In wiki-viewer repoID is not props, width isn't 100%
    let contentClassName = `${this.props.repoID ? contentClass + ' w-100' : contentClass}`;
    return (
      <div ref={this.markdownContainer} className="wiki-page-container" onScroll={this.onScrollHandler.bind(this)}>
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
