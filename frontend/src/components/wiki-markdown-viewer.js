import React from 'react';
import PropTypes from 'prop-types';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';
import { gettext, repoID, slug, serviceURL } from '../utils/constants';
import Loading from './loading';
import { Utils } from '../utils/utils';

const propTypes = {
  children: PropTypes.object,
  isFileLoading: PropTypes.bool.isRequired,
  markdownContent: PropTypes.string.isRequired,
  latestContributor: PropTypes.string.isRequired,
  lastModified: PropTypes.string.isRequired,
  onLinkClick: PropTypes.func.isRequired,
  filePath: PropTypes.string,
  isPublic: PropTypes.bool,
};

const contentClass = 'wiki-page-content';

class WikiMarkdownViewer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      activeTitleIndex: 0
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
  }

  componentWillReceiveProps() {
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
  }

  componentWillUnmount() {
    // Rebinding events when the component is destroyed
    this.links.forEach(link => {
      link.removeEventListener('click', this.onLinkClick);
    });
  }

  onContentRendered = (markdownViewer) => {
    this.titlesInfo = markdownViewer.titlesInfo;
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

  modifyValueBeforeRender = (value) => {
    value.document.nodes.map(node => {
      let innerNode = node.nodes[0];
      if (innerNode.type == 'image') {
        let imageUrl = innerNode.data.src;

        const re = new RegExp(serviceURL + '/lib/' + repoID +'/file.*raw=1');
        
        // different repo 
        if (!re.test(imageUrl)) {
          return;
        }

        // get image path
        let index = imageUrl.indexOf('/file');
        let index2 = imageUrl.indexOf('?');
        const imagePath = imageUrl.substring(index + 5, index2);
        // change image url
        innerNode.data.src = serviceURL + '/view-image-via-public-wiki/?slug=' + slug + '&file_path=' + this.props.filePath + '&image_path=' + imagePath;
      }

      if (innerNode.type == 'link') {
        let url = innerNode.data.href;
        if (Utils.isInternalMarkdownLink(url, repoID)) {
          let path = Utils.getPathFromInternalMarkdownLink(url, repoID);
          innerNode.data.href = serviceURL + '/wikis/' + slug + path;
        } else if (Utils.isInternalDirLink(url, repoID)) {
          let path = Utils.getPathFromInternalDirLink(url, repoID, slug);
          innerNode.data.href = serviceURL + '/wikis/' + slug + path;
        } 
      }
    });

    return value;
  }

  renderMarkdown = () => {
    if (this.props.isPublic) {
      return (
        <MarkdownViewer
          showTOC={true}
          markdownContent={this.props.markdownContent}
          activeTitleIndex={this.state.activeTitleIndex}
          onContentRendered={this.onContentRendered}
          modifyValueBeforeRender={this.modifyValueBeforeRender}
        />
      )
    }

    return (
      <MarkdownViewer
        showTOC={true}
        markdownContent={this.props.markdownContent}
        activeTitleIndex={this.state.activeTitleIndex}
        onContentRendered={this.onContentRendered}
      />
    )
  }

  render() {
    if (this.props.isFileLoading) {
      return <Loading />
    }
    return (
      <div ref={this.markdownContainer} className="wiki-page-container" onScroll={this.onScrollHandler.bind(this)}>
        <div className={contentClass}>
          {this.props.children}
          {this.renderMarkdown()}
          <p id="wiki-page-last-modified">{gettext('Last modified by')} {this.props.latestContributor}, <span>{this.props.lastModified}</span></p>
        </div>
      </div>
    );
  }
}

const defaultProps = {
  isPublic: false,
}

WikiMarkdownViewer.propTypes = propTypes;
MarkdownViewer.defaultProps = defaultProps;

export default WikiMarkdownViewer;
