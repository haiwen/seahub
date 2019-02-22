import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
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
  isFileLoadedErr: PropTypes.bool.isRequired,
  filePermission: PropTypes.bool,
  content: PropTypes.string,
  lastModified: PropTypes.string,
  latestContributor: PropTypes.string,
  onLinkClick: PropTypes.func.isRequired,
};

class DirColumnFile extends React.Component {

  componentDidMount() {
    if (this.props.hash) {
      let hash = this.props.hash;
      setTimeout(function() {
        window.location.hash = hash;
      }, 500);
    }
  }

  onEditClick = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    let url = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path) + '?mode=edit';
    window.open(url);
  }

  onNewDraft = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    seafileAPI.createDraft(repoID, path).then(res => {
      window.location.href = siteRoot + 'lib/' + res.data.origin_repo_id + '/file' + res.data.draft_file_path + '?mode=edit';
    });
  }

  goDraftPage = (e) => {
    e.preventDefault();
    this.props.goDraftPage();
  }
  
  goReviewPage = (e) => {
    e.preventDefault();
    this.props.goReviewPage();
  }

  render() {
    if (this.props.isFileLoadedErr) {
      return (
        <div className="message err-tip">{gettext('File does not exist.')}</div>
      );
    }
    return (
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
    );
  }
}

DirColumnFile.propTypes = propTypes;

export default DirColumnFile;
