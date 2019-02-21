import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import WikiMarkdownViewer from '../wiki-markdown-viewer';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  hash: PropTypes.string,
  isDraft: PropTypes.bool,
  hasDraft: PropTypes.bool,
  goDraftPage: PropTypes.func.isRequired,
  reviewStatus: PropTypes.any,
  goReviewPage: PropTypes.func.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  filePermission: PropTypes.bool,
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
};

class DirColumnFile extends React.Component {

  render() {
    return (
      <div className="cur-view-content">
        <WikiMarkdownViewer
          isTOCShow={false}
          isFileLoading={this.props.isFileLoading}
          markdownContent={this.props.content}
          lastModified = {this.props.lastModified}
          latestContributor={this.props.latestContributor}
          onLinkClick={this.props.onLinkClick}
        >
          <Fragment>
            {this.props.reviewStatus === 'open' &&
              <div className='seafile-btn-view-review text-center'>
                <div className='tag tag-green'> 
                  {gettext('This file is in review stage')}
                  <span className="ml-2" onClick={this.goReviewPage}>{gettext('View Review')}</span>
                </div>
              </div>
            }
            {(this.props.reviewStatus !== 'open' && !this.props.isDraft && this.props.hasDraft) &&
              <div className='seafile-btn-view-review text-center'>
                <div className='tag tag-green'>
                  {gettext('This file is in draft stage.')}
                  <span className="ml-2" onClick={this.goDraftPage}>{gettext('Edit Draft')}</span>
                </div>
              </div>
            }
          </Fragment>
        </WikiMarkdownViewer>
      </div>
    );
  }
}

DirColumnFile.propTypes = propTypes;

export default DirColumnFile;
