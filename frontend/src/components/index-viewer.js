import React from 'react';
import PropTypes from 'prop-types';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';

const viewerPropTypes = {
  onLinkClick: PropTypes.func,
  hasIndex: PropTypes.bool.isRequired,
  indexContent: PropTypes.string,
}

const contentClass = 'wiki-pages-container';

class IndexContentViewer extends React.Component {

  componentDidUpdate () {
    var links = document.querySelectorAll(`.${contentClass} a`);
    links.forEach((li) => {li.addEventListener('click', this.onLinkClick); });
  }

  onLinkClick = (event) => {
    event.preventDefault(); 
    this.props.onLinkClick(event);
  }

  onContentRendered = () => {
    // todo
  }

  render() {
    return (
      <MarkdownViewer
        markdownContent={this.props.indexContent}
        onContentRendered={this.onContentRendered}
      />  
    );
  }

}

IndexContentViewer.propTypes = viewerPropTypes;

export default IndexContentViewer;
