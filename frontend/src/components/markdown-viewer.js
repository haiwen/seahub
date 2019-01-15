import React from 'react';
import PropTypes from 'prop-types';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';

const gettext = window.gettext;

const viewerPropTypes = {
  isFileLoading: PropTypes.bool.isRequired,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  markdownContent: PropTypes.string,
  onContentRendered: PropTypes.func.isRequired,
  activeTitleIndex: PropTypes.number,
  onLinkClick: PropTypes.func,
  reviewStatus: PropTypes.string,
  goReviewPage: PropTypes.func,
  isDraft: PropTypes.bool,
  hasDraft: PropTypes.bool,
  goDraftPage: PropTypes.func,
};

const contentClass = 'markdown-content';

class MarkdownContentViewer extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showReviewTip: false,
      showDraftTip: false,
    };
  }

  componentDidUpdate () {
    var links = document.querySelectorAll(`.${contentClass} a`);
    links.forEach((li) => {li.addEventListener('click', this.onLinkClick); });
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

  render() {
    if (this.props.isFileLoading) {
      return (
        <span className="loading-icon loading-tip"></span>
      );
    }
    return (
      <div className="markdown-content">
        {this.props.reviewStatus === 'open' &&
          <div className='seafile-btn-view-review text-center'>
            <div className='tag tag-green'> 
              {gettext('This file is in review stage')}
              <a className="ml-2" onMouseDown={this.props.goReviewPage}>{gettext('View Review')}</a>
            </div>
          </div>
        }

        {(!this.props.isDraft && this.props.hasDraft && this.props.reviewStatus !== 'open') &&
          <div className='seafile-btn-view-review text-center'>
            <div className='tag tag-green'>
              {gettext('This file is in draft stage.')}
              <a className="ml-2" onMouseDown={this.props.goDraftPage}>{gettext('Edit Draft')}</a>
            </div>
          </div>
        }

        <MarkdownViewer markdownContent={this.props.markdownContent} showTOC={true}
          activeTitleIndex={this.props.activeTitleIndex}
          onContentRendered={this.props.onContentRendered}
        />
        <p id="wiki-page-last-modified">{gettext('Last modified by')} {this.props.latestContributor}, <span>{this.props.lastModified}</span></p>
      </div>
    );
  }
}

MarkdownContentViewer.propTypes = viewerPropTypes;

export default MarkdownContentViewer;
