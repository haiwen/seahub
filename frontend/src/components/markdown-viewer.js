import React from 'react';
import { processor, processorGetAST } from '@seafile/seafile-editor/src/lib/seafile-markdown2html';
import TreeView from './tree-view/tree-view';
import Prism from 'prismjs';
import WikiOutline from './wiki-outline';

var URL = require('url-parse');

require('@seafile/seafile-editor/src/lib/code-hight-package');

const contentClass = "wiki-md-viewer-rendered-content";

class MarkdownViewerContent extends React.Component {

  constructor(props) {
    super(props);
  }

  componentDidUpdate () {
    Prism.highlightAll();
    var links = document.querySelectorAll(`.${contentClass} a`);
    links.forEach((li) => {li.addEventListener("click", this.onLinkClick); });
  }

  onLinkClick = (event) => {
    this.props.onLinkClick(event);
    event.preventDefault();
  }

  render() {
    return (
      <div>
        { this.props.renderingContent ? (
          <div className={contentClass + " article"}>Loading...</div>
        ) : (
          <div ref={(mdContent) => {this.mdContentRef = mdContent;} }
            className={contentClass + " article"}
            dangerouslySetInnerHTML={{ __html: this.props.html }}/>
        )}
      </div>
      )
  }
}

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
      })
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
    })
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
        })
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
      navItems[i].id = '#user-content-' + headingList[i].data.id
      navItems[i].key = i;
      navItems[i].clazz = '';
      navItems[i].depth = headingList[i].depth;
      for (let child of headingList[i].children) {
        if (child.type === "text") {
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
      )
    }
    return (
      <div className="markdown-container" onScroll={this.scrollHandler}>
        <div className="markdown-content" ref="markdownContainer">
          <MarkdownViewerContent
            renderingContent={this.state.renderingContent} html={this.state.html}
            onLinkClick={this.props.onLinkClick}
          />
          <p id="wiki-page-last-modified">Last modified by {this.props.latestContributor}, <span>{this.props.lastModified}</span></p>
        </div>
        <div className="markdown-outline">
            <WikiOutline 
              navItems={this.state.navItems} 
              handleNavItemClick={this.handleNavItemClick}
              activeId={this.state.activeId}
            />
        </div>
      </div>
    )
  }
}

export default MarkdownViewer;
