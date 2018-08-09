import React from 'react';
import { processor } from '@seafile/seafile-editor/src/lib/seafile-markdown2html';
import TreeView from './tree-view/tree-view';
import Prism from 'prismjs';

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

  state = {
    renderingContent: true,
    renderingOutline: true,
    html: '',
    outlineTreeRoot: null,
    loading: true
  }

  scrollToNode(node) {
    let url = new URL(window.location.href);
    url.set('hash', 'user-content-' + node.data.id);
    window.location.href = url.toString();
  }

  setContent(markdownContent) {
    let that = this;

    processor.process(markdownContent, function(err, file) {
      that.setState({
        html: String(file),
        renderingContent: false
      });
    })
  }

  componentWillReceiveProps(nextProps) {
    this.setContent(nextProps.markdownContent);
    this.setState({
      loading: false
    })
  }

  componentDidMount() {
    let that = this;

    processor.process(this.props.markdownContent, function(err, file) {
      that.setState({
        html: String(file),
        renderingContent: false
      });

    });
  }


  render() {
    if (this.state.loading) {
      return (
        <span className="loading-icon loading-tip"></span>
      )
    } else {
      return (
        <MarkdownViewerContent
          renderingContent={this.state.renderingContent} html={this.state.html}
          onLinkClick={this.props.onLinkClick}
        />
      )
    }
  }
}

export default MarkdownViewer;
