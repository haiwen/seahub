import React from 'react';
import PropTypes from 'prop-types';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';
import { gettext } from '../utils/constants';
import Loading from './loading';

const propTypes = {
  children: PropTypes.object,
  isFileLoading: PropTypes.bool.isRequired,
  markdownContent: PropTypes.string.isRequired,
  latestContributor: PropTypes.string.isRequired,
  lastModified: PropTypes.string.isRequired,
  onLinkClick: PropTypes.func.isRequired
};

const contentClass = 'markdown-content';

class WikiMarkdownViewer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      activeTitleIndex: 0
    };
    this.markdownContainer = React.createRef();
    this.links = null;
    this.titlesInfo = [];
  }

  componentDidUpdate() {
    if (this.links) {
      this.links = document.querySelectorAll(`.${contentClass} a`);
      this.links.forEach(link => {
        link.addEventListener('click', this.onLinkClick);
      });
    }
  }

  componentWillUnmount() {
    if (this.links) {
      this.links.forEach(link => {
        link.removeEventListener('click', this.onLinkClick);
      });
    }
  }

  onContentRendered = (markdownViewer) => {
    this.titlesInfo = markdownViewer.titlesInfo;
  }

  onLinkClick = (event) => {
    event.preventDefault(); 
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

  render() {
    if (this.props.isFileLoading) {
      return <Loading />
    }
    return (
      <div ref={this.markdownContainer} className="markdown-container" onScroll={this.onScrollHandler.bind(this)}>
        <div className="markdown-content">
          {this.props.children}
          <MarkdownViewer
            showTOC={true}
            markdownContent={this.props.markdownContent}
            activeTitleIndex={this.state.activeTitleIndex}
            onContentRendered={this.onContentRendered}
          />
          <p id="wiki-page-last-modified">{gettext('Last modified by')} {this.props.latestContributor}, <span>{this.props.lastModified}</span></p>
        </div>
      </div>
    );
  }
}

WikiMarkdownViewer.propTypes = propTypes;

export default WikiMarkdownViewer;
