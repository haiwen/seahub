import React from 'react';
import PropTypes from 'prop-types';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';

const gettext = window.gettext;

const viewerPropTypes = {
  readmeContent: PropTypes.string.isRequired,
  isReadmeLoading: PropTypes.bool.isRequired,
  onContentRendered: PropTypes.func.isRequired,
  showReadme: PropTypes.func.isRequired,
  filePath: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
};

const contentClass = 'readme-content';

class ReadmeContentViewer extends React.Component {

  componentDidUpdate () {
    var links = document.querySelectorAll(`.${contentClass} a`);
    links.forEach((li) => {li.addEventListener('click', this.onLinkClick); });
  }

  onLinkClick = (event) => {
    event.preventDefault(); 
    this.props.onLinkClick(event);
  }

  componentDidMount () {
    this.props.showReadme(this.props.filePath, this.props.fileName)
  }

  render() {
    if (this.props.isReadmeLoading) {
      return (
        <span className="loading-icon loading-tip"></span>
      );
    }

    return (
      <div className="readme-content">
        <div className="readme-header h4">
          {gettext('README.markdown')}
        </div>
        <div className="readme-paragraph">
          <MarkdownViewer
            markdownContent={this.props.readmeContent}
            onContentRendered={this.props.onContentRendered}
          />
        </div>
      </div>
    );
  }
}

ReadmeContentViewer.propTypes = viewerPropTypes;

export default ReadmeContentViewer;
