import React from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup } from 'reactstrap';
import IconButton from '../icon-button';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = { 
  isLocked: PropTypes.bool.isRequired,
  lockedByMe: PropTypes.bool.isRequired,
  toggleLockFile: PropTypes.func.isRequired,
  toggleCommentPanel: PropTypes.func.isRequired
};

const { 
  canLockUnlockFile,
  repoID, repoName, parentDir, filePerm, filePath,
  canEditFile, err,
  fileEnc, // for 'edit', not undefined only for some kinds of files (e.g. text file)
  canDownloadFile, enableComment
} = window.app.pageOptions;

class FileToolbar extends React.Component {

  render() {
    const { isLocked, lockedByMe } = this.props; 

    let showLockUnlockBtn = false;
    let lockUnlockText, lockUnlockIcon;
    if (canLockUnlockFile) {
      if (!isLocked) {
        showLockUnlockBtn = true;
        lockUnlockText = gettext('Lock');
        lockUnlockIcon = 'fa fa-lock';
      } else if (lockedByMe) {
        showLockUnlockBtn = true;
        lockUnlockText = gettext('Unlock');
        lockUnlockIcon = 'fa fa-unlock';
      }   
    }   
    return (
      <ButtonGroup className="align-self-center">
        <IconButton
          id="open-parent-folder"
          icon="fa fa-folder-open"
          text={gettext('Open parent folder')}
          tag="a"
          href={`${siteRoot}library/${repoID}/${Utils.encodePath(repoName + parentDir)}`}
        />
        {showLockUnlockBtn && (
          <IconButton
            id="lock-unlock-file"
            icon={lockUnlockIcon}
            text={lockUnlockText}
            onClick={this.props.toggleLockFile}
          />
        )}
        {filePerm == 'rw' && (
          <IconButton
            id="history"
            icon="fa fa-history"
            text={gettext('History')}
            tag="a"
            href={`${siteRoot}repo/file_revisions/${repoID}/?p=${encodeURIComponent(filePath)}&referer=${encodeURIComponent(location.href)}`}
          />
        )}
        {(canEditFile && !err) && (
          <IconButton
            id="edit"
            icon="fa fa-edit"
            text={gettext('Edit')}
            tag="a"
            href={`${siteRoot}repo/${repoID}/file/edit/?p=${encodeURIComponent(filePath)}&file_enc=${encodeURIComponent(fileEnc)}`}
          />
        )}
        {canDownloadFile && (
          <IconButton
            id="download-file"
            icon="fa fa-download"
            text={gettext('Download')}
            tag="a"
            href="?dl=1"
          />
        )}
        {enableComment && (
          <IconButton
            id="comment"
            icon="fa fa-comment"
            text={gettext('Comment')}
            onClick={this.props.toggleCommentPanel}
          />
        )}
      </ButtonGroup>
    );
  }
}

FileToolbar.propTypes = propTypes;

export default FileToolbar;
