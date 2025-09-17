import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import { WikiViewer } from '@seafile/seafile-sdoc-editor';
import { I18nextProvider } from 'react-i18next';
import { appAvatarURL, assetsUrl, gettext, name, repoID, serviceURL, sharedToken, siteRoot, slug, username } from '../../utils/constants';
import i18n from '../../_i18n/i18n-sdoc-editor';
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

class SdocWikiPageViewer extends React.Component {

  constructor(props) {
    super(props);
    this.scrollRef = React.createRef();
  }

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
    let { isTOCShow = true, markdownContent } = this.props;
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

    return (
      <I18nextProvider i18n={ i18n }>
        <Suspense fallback={<Loading />}>
          <WikiViewer {...props} />
        </Suspense>
      </I18nextProvider>
    );
  };

  render() {
    if (this.props.isFileLoading) {
      return <Loading />;
    }

    const { isWiki = false, containerClassName = '' } = this.props;
    // In dir-column-file width is 100%;
    // In wiki-viewer width isn't 100%
    return (
      <div ref={this.scrollRef} className={`wiki-page-container ${containerClassName}`}>
        <div className={`wiki-page-content ${isWiki ? '' : 'w-100'}`}>
          {this.props.children}
          {this.renderMarkdown()}
          <p id="wiki-page-last-modified">
            {gettext('Last modified by')} {this.props.latestContributor}, <span>{this.props.lastModified}</span>
          </p>
        </div>
      </div>
    );
  }
}

SdocWikiPageViewer.propTypes = propTypes;

export default SdocWikiPageViewer;
