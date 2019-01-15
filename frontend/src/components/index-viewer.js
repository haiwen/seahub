import React from 'react';
import PropTypes from 'prop-types';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';

const viewerPropTypes = {
  onLinkClick: PropTypes.func,
  onContentRendered: PropTypes.func.isRequired,
  indexContent: PropTypes.string,
};

class IndexContentViewer extends React.Component {

  onLinkClick = (event) => {
    event.preventDefault();
    this.props.onLinkClick(event);
  }

  render() {
    return (
      <div className="markdown-content">
        <MarkdownViewer
          markdownContent={this.props.indexContent}
          onContentRendered={this.props.onContentRendered}
        />
      </div>
    );
  }

}

IndexContentViewer.propTypes = viewerPropTypes;

export default IndexContentViewer;
