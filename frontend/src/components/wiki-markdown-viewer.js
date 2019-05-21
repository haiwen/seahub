import React from 'react';
import PropTypes from 'prop-types';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';
import { gettext, repoID, slug, serviceURL, isPublicWiki, siteRoot } from '../utils/constants';
import { Card, CardTitle, CardText } from 'reactstrap';
import Loading from './loading';
import { Utils } from '../utils/utils';
import { seafileAPI } from '../utils/seafile-api';
import '../css/related-files-list.css';

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
      relatedFiles: [],
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
    this.listRelatedFiles();
    this.scrollToNode();
  }

  componentWillReceiveProps() {
    // Unbound event when updating
    this.links.forEach(link => {
      link.removeEventListener('click', this.onLinkClick);
    });
    this.listRelatedFiles();
  }

  componentDidUpdate() {
    // Update completed, rebind event
    this.links = document.querySelectorAll(`.${contentClass} a`);
    this.links.forEach(link => {
      link.addEventListener('click', this.onLinkClick);
    });
  }

  componentWillUnmount() {
    // Rebinding events when the component is destroyed
    this.links.forEach(link => {
      link.removeEventListener('click', this.onLinkClick);
    });
  }

  scrollToNode = () => {
    const hash = window.location.hash;
    if (hash.indexOf('user-content-') > -1 && window.markdownViewer) {
      let text = hash.slice(14);
      window.markdownViewer.scrollToNode({text: text});
    }
  } 

  onContentRendered = (markdownViewer) => {
    this.titlesInfo = markdownViewer.titlesInfo;
  }

  listRelatedFiles = () => {
    // for dir-column-file component(import repoID is undefined)
    if (this.props.repoID && this.props.path) {
      seafileAPI.listRelatedFiles(this.props.repoID, this.props.path).then(res => {
        this.setState({
          relatedFiles: res.data.related_files
        });
      });
    }
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
        // change file url 
        if (Utils.isInternalMarkdownLink(url, repoID)) {
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

  renderMarkdown = () => {
    let isTOCShow = true;
    if (this.props.isTOCShow === false) {
      isTOCShow = false;
    }
    if (this.props.isWiki) {
      return (
        <MarkdownViewer
          showTOC={isTOCShow}
          markdownContent={this.props.markdownContent}
          activeTitleIndex={this.state.activeTitleIndex}
          onContentRendered={this.onContentRendered}
          modifyValueBeforeRender={this.modifyValueBeforeRender}
        />
      );
    }

    return (
      <MarkdownViewer
        showTOC={isTOCShow}
        markdownContent={this.props.markdownContent}
        activeTitleIndex={this.state.activeTitleIndex}
        onContentRendered={this.onContentRendered}
      />
    );
  }

  renderRelatedFiles = () => {
    const relatedFiles = this.state.relatedFiles;
    if (relatedFiles.length > 0) {
      return (
        <div className="sf-releted-files" id="sf-releted-files">
          <div className="sf-releted-files-header">
            <h4>{gettext('related files')}</h4>
          </div>
          {
            relatedFiles.map((relatedFile, index) => {
              let href = siteRoot + 'lib/' + relatedFile.repo_id + '/file' + Utils.encodePath(relatedFile.path);
              return(
                <div className="sf-releted-file" key={index}>
                  <a href={href} target="_blank">
                    <Card body size="sm">
                      <CardTitle>{relatedFile.name}</CardTitle>
                      <CardText>{relatedFile.repo_name}</CardText>
                      <span className="sf-releted-file-arrow"></span>
                    </Card>
                  </a>
                </div>
              );
            })
          }
        </div>
      );
    } else {
      return null;
    }
  }

  render() {
    if (this.props.isFileLoading) {
      return <Loading />;
    }
    return (
      <div ref={this.markdownContainer} className="wiki-page-container" onScroll={this.onScrollHandler.bind(this)}>
        <div className={contentClass}>
          {this.props.children}
          {this.renderMarkdown()}
          {this.props.isWiki && this.renderRelatedFiles()}
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
