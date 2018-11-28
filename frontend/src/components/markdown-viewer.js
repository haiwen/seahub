import React from 'react';
import PropTypes from 'prop-types';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';

const gettext = window.gettext;

const viewerPropTypes = {
  isFileLoading: PropTypes.bool.isRequired,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  markdownContent: PropTypes.string,
};

class MarkdownContentViewer extends React.Component {

  render() {
    if (this.props.isFileLoading) {
      return (
        <span className="loading-icon loading-tip"></span>
      );
    }
    return (
        <div className="markdown-content">
          <MarkdownViewer markdownContent={this.props.markdownContent} showTOC={true}/>
          <p id="wiki-page-last-modified">{gettext('Last modified by')} {this.props.latestContributor}, <span>{this.props.lastModified}</span></p>
        </div>
    );
  }
}

MarkdownContentViewer.propTypes = viewerPropTypes;

export default MarkdownContentViewer;
