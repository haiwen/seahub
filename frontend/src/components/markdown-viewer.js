import React from 'react';
import { processor, processorGetAST } from '../lib/seafile-markdown2html';
import TreeView from './tree-view/tree-view';
import Prism from 'prismjs';
import { translate } from 'react-i18next';

var URL = require('url-parse');

require('../lib/code-hight-package');

class MarkdownViewerContent extends React.Component {

  constructor(props) {
    super(props);
  }

  componentDidUpdate () {
    Prism.highlightAll();
    var links = document.querySelectorAll(".seafile-md-viewer-main-panel a");
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
          <div className="wiki-md-viewer-rendered-content article">Loading...</div>
        ) : (
          <div ref={(mdContent) => {this.mdContentRef = mdContent;} } className="wiki-md-viewer-rendered-content article" dangerouslySetInnerHTML={{ __html: this.props.html }}/>
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
    outlineTreeRoot: null
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
    return (
      <MarkdownViewerContent
        renderingContent={this.state.renderingContent} html={this.state.html}
        onLinkClick={this.props.onLinkClick}
      />
    )
  }
}

export default MarkdownViewer;
