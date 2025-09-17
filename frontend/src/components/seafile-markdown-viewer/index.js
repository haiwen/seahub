import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { MarkdownViewer } from '@seafile/seafile-editor';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../_i18n/i18n-seafile-editor';
import { gettext, mediaUrl, serviceURL, sharedToken, slug } from '../../utils/constants';
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

class SeafileMarkdownViewer extends React.Component {

  constructor(props) {
    super(props);
    this.scrollRef = React.createRef();
    this.seafileMarkdownViewerRef = null;
    this.timer = null;
    this.state = {
      isMarkdownEditorRenderCompleted: false,
    };
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      this.checkMarkdownEditorRenderCompleted();
    }, 100);
  }

  componentWillUnmount() {
    if (this.timer) clearInterval(this.timer);
  }

  checkMarkdownEditorRenderCompleted = () => {
    if (this.seafileMarkdownViewerRef) {
      const firstEl = this.seafileMarkdownViewerRef.firstElementChild;
      if (firstEl.className !== 'empty-loading-page') {
        this.setState({ isMarkdownEditorRenderCompleted: true });
        if (this.timer) clearInterval(this.timer);
      }
    }
  };

  onLinkClick = (link) => {
    this.props.onLinkClick(link);
  };

  changeInlineNode = (item) => {
    const { repoID } = this.props;
    let url; let imagePath;
    // isPublicWiki: in the old version, only public wiki need replace image url
    if (item.type == 'image') { // change image url
      url = item.data.src;
      const re = new RegExp(serviceURL + '/lib/' + repoID + '/file.*raw=1');
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
    const { isTOCShow = true, isWiki = false, markdownContent } = this.props;
    const props = {
      isShowOutline: isTOCShow,
      mathJaxSource: `${mediaUrl}js/mathjax/tex-svg.js`,
      value: markdownContent,
      scrollRef: this.scrollRef,
      onLinkClick: this.onLinkClick,
      ...(isWiki && { beforeRenderCallback: this.modifyValueBeforeRender })
    };

    return (
      <I18nextProvider i18n={ i18n }>
        <Suspense fallback={<Loading />}>
          <MarkdownViewer {...props} />
        </Suspense>
      </I18nextProvider>
    );
  };

  render() {
    const { isMarkdownEditorRenderCompleted } = this.state;
    const { isFileLoading, isWiki = false, containerClassName = '' } = this.props;

    if (isFileLoading) {
      return <Loading />;
    }

    // In dir-column-file width is 100%;
    // In wiki-viewer width isn't 100%
    return (
      <div ref={this.scrollRef} className={`wiki-page-container ${containerClassName}`}>
        <div className={`wiki-page-content ${isWiki ? '' : 'w-100'}`} ref={ref => this.seafileMarkdownViewerRef = ref}>
          {this.props.children}
          {this.renderMarkdown()}
          {isMarkdownEditorRenderCompleted && (
            <p id="wiki-page-last-modified">
              {gettext('Last modified by')} {this.props.latestContributor}, <span>{this.props.lastModified}</span>
            </p>
          )}
          {!isMarkdownEditorRenderCompleted && (
            <Loading />
          )}
        </div>
      </div>
    );
  }
}

SeafileMarkdownViewer.propTypes = propTypes;

export default SeafileMarkdownViewer;
