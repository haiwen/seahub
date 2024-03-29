import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot } from '../../utils/constants';
import SeafileMarkdownViewer from '../seafile-markdown-viewer';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  hash: PropTypes.string,
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
  };

  onOpenFile = (e) => {
    e.preventDefault();
    let { path, repoID } = this.props;
    let newUrl = siteRoot + 'lib/' + repoID + '/file' + Utils.encodePath(path);
    window.open(newUrl, '_blank');
  };

  render() {
    if (this.props.isFileLoadedErr) {
      return (
        <div className="message err-tip">{gettext('File does not exist.')}</div>
      );
    }
    return (
      <SeafileMarkdownViewer
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
        </Fragment>
      </SeafileMarkdownViewer>
    );
  }
}

DirColumnFile.propTypes = propTypes;

export default DirColumnFile;
