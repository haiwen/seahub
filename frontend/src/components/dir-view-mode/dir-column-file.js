import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';
import WikiMarkdownViewer from '../wiki-markdown-viewer';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  hash: PropTypes.string,
  isDraft: PropTypes.bool,
  hasDraft: PropTypes.bool,
  goDraftPage: PropTypes.func.isRequired,
  isFileLoading: PropTypes.bool.isRequired,
  isFileLoadedErr: PropTypes.bool.isRequired,
  filePermission: PropTypes.string,
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
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onOpenFile = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    let newUrl = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path);
    window.open(newUrl, '_blank');
  }

  goDraftPage = (e) => {
    e.preventDefault();
    this.props.goDraftPage();
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
        repoID={this.props.repoID}
        path={this.props.path}
      >
        <Fragment>
          <span className='wiki-open-file position-fixed' onClick={this.onOpenFile}>
            <i className="fas fa-expand-arrows-alt"></i>
          </span>
          {(!this.props.isDraft && this.props.hasDraft) &&
            <div className='seafile-btn-view-review text-center mt-2'>
              <div className='tag tag-green'>
                {gettext('This file is in draft stage.')}
                <span className="ml-2" onClick={this.goDraftPage}>{gettext('View Draft')}</span>
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
