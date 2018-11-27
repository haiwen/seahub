import React from 'react';
import PropTypes from 'prop-types';
import { processor, processorGetAST } from '@seafile/seafile-editor/dist/utils/seafile-markdown2html';
import Prism from 'prismjs';
import WikiOutline from './wiki-outline';

var URL = require('url-parse');

const gettext = window.gettext;

require('@seafile/seafile-editor/dist/editor/code-hight-package');

const contentClass = 'wiki-md-viewer-rendered-content';

const contentPropTypes = {
  html: PropTypes.string,
  renderingContent: PropTypes.bool.isRequired,
  onLinkClick: PropTypes.func.isRequired
};

class MarkdownViewerContent extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        { this.props.renderingContent ? (
          <div className={contentClass + ' article'}>Loading...</div>
        ) : (
          <div ref={(mdContent) => {this.mdContentRef = mdContent;} }
            className={contentClass + ' article'}
            dangerouslySetInnerHTML={{ __html: this.props.html }}/>
        )}
      </div>
    );
  }
}

MarkdownViewerContent.propTypes = contentPropTypes;


const viewerPropTypes = {
  isFileLoading: PropTypes.bool.isRequired,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  markdownContent: PropTypes.string,
};

class MarkdownViewer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      renderingContent: true,
      renderingOutline: true,
      html: '',
      outlineTreeRoot: null,
      navItems: [],
      activeId: 0
    };
    this.activeIdFromOutLine = null;
  }

  scrollToNode(node) {
    let url = new URL(window.location.href);
    url.set('hash', 'user-content-' + node.data.id);
    window.location.href = url.toString();
  }

  scrollHandler = (event) => {
    var currentId = '';
    if (!this.activeIdFromOutLine) {
      var target = event.target || event.srcElement;
      var markdownContainer = this.refs.markdownContainer;
      var headingList = markdownContainer.querySelectorAll('[id^="user-content"]');
      var top = target.scrollTop;
      var defaultOffset = markdownContainer.offsetTop;
      for (let i = 0; i < headingList.length; i++) {
        let heading = headingList[i];
        if (heading.tagName === 'H1') {
          continue;
        }
        if (top > heading.offsetTop - defaultOffset) {
          currentId = '#' + heading.getAttribute('id');
        } else {
          break;
        }
      }
    } else {
      currentId = this.activeIdFromOutLine;
      this.activeIdFromOutLine = null;
    }

    if (currentId !== this.state.activeId) {
      this.setState({
        activeId: currentId
      });
    }
  }

  handleNavItemClick = (activeId) => {
    this.activeIdFromOutLine = activeId;
  }

  setContent(markdownContent) {
    let that = this;

    processor.process(markdownContent, function(err, file) {
      that.setState({
        html: String(file),
        renderingContent: false
      });

      setTimeout(() => { 
        // reset the href to jump to the section
        var url = new URL(window.location.href);
        if (url.hash) { 
          window.location.href = window.location.href;
        }
      }, 100);
    });
  }

  componentDidMount() {
    let that = this;

    processor.process(this.props.markdownContent, function(err, file) {
      that.setState({
        html: String(file),
        renderingContent: false,
      });
    });
  }

  componentWillReceiveProps(nextProps) {
    var _this = this;
    this.setContent(nextProps.markdownContent);
    processorGetAST.run(processorGetAST.parse(nextProps.markdownContent)).then((nodeTree) => {
      if (nodeTree && nodeTree.children && nodeTree.children.length) {
        var navItems = _this.formatNodeTree(nodeTree);
        var currentId = navItems.length > 0 ? navItems[0].id : 0;
        _this.setState({
          navItems: navItems,
          activeId: currentId
        });
      }else {
        _this.setState({
          navItems: []
        });
      }
    });
  }

  formatNodeTree(nodeTree) {
    var navItems = [];
    var headingList = nodeTree.children.filter(node => {
      return (node.type === 'heading' && (node.depth === 2 || node.depth === 3));
    });
    for (let i = 0; i < headingList.length; i++) {
      navItems[i] = {};
      navItems[i].id = '#user-content-' + headingList[i].data.id;
      navItems[i].key = i;
      navItems[i].clazz = '';
      navItems[i].depth = headingList[i].depth;
      for (let child of headingList[i].children) {
        if (child.type === 'text') {
          navItems[i].text = child.value;
          break;
        }
      }
    }
    return navItems;
  }

  render() {
    if (this.props.isFileLoading) {
      return (
        <span className="loading-icon loading-tip"></span>
      );
    }
    return (
      <div className="markdown-container" onScroll={this.scrollHandler}>
        <div className="markdown-content" ref="markdownContainer">
          <MarkdownViewerContent
            renderingContent={this.state.renderingContent} html={this.state.html}
          />
          <p id="wiki-page-last-modified">{gettext('Last modified by')} {this.props.latestContributor}, <span>{this.props.lastModified}</span></p>
        </div>
        <div className="markdown-outline">
          <WikiOutline 
            navItems={this.state.navItems} 
            handleNavItemClick={this.handleNavItemClick}
            activeId={this.state.activeId}
          />
        </div>
      </div>
    );
  }
}

MarkdownViewer.propTypes = viewerPropTypes;

export default MarkdownViewer;
