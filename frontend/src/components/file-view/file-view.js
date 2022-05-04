import React from 'react';
import PropTypes from 'prop-types';
import watermark from 'watermark-dom';
import { seafileAPI } from '../../utils/seafile-api';
import { siteName } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import FileInfo from './file-info';
import FileToolbar from './file-toolbar';
import CommentPanel from './comment-panel';
import FileDetails from '../dirent-detail/file-details';

import '../../css/file-view.css';

const propTypes = {
  onSave: PropTypes.func,
  content: PropTypes.object.isRequired,
  isSaving: PropTypes.bool,
  needSave: PropTypes.bool,
  participants: PropTypes.array,
  onParticipantsChange: PropTypes.func,
};

const { isStarred, isLocked, lockedByMe,
  repoID, filePath, enableWatermark, userNickName,
  repoName, parentDir, fileName
} = window.app.pageOptions;


class FileView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isStarred: isStarred,
      isLocked: isLocked,
      lockedByMe: lockedByMe,
      isCommentPanelOpen: false,
      isDetailsPanelOpen: false
    };
  }

  toggleDetailsPanel = () => {
    this.setState({isDetailsPanelOpen: !this.state.isDetailsPanelOpen});
  }

  toggleCommentPanel = () => {
    this.setState({
      isCommentPanelOpen: !this.state.isCommentPanelOpen
    });
  }

  toggleStar = () => {
    if (this.state.isStarred) {
      seafileAPI.unstarItem(repoID, filePath).then((res) => {
        this.setState({
          isStarred: false
        });
      }).catch((error) => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
    } else {
      seafileAPI.starItem(repoID, filePath).then((res) => {
        this.setState({
          isStarred: true
        });
      }).catch((error) => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
    }
  }

  toggleLockFile = () => {
    if (this.state.isLocked) {
      seafileAPI.unlockfile(repoID, filePath).then((res) => {
        this.setState({
          isLocked: false,
          lockedByMe: false
        });
      }).catch((error) => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
    } else {
      seafileAPI.lockfile(repoID, filePath).then((res) => {
        this.setState({
          isLocked: true,
          lockedByMe: true
        });
      }).catch((error) => {
        const errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
      });
    }
  }

  render() {
    const { isDetailsPanelOpen } = this.state;
    return (
      <div className="h-100 d-flex flex-column">
        <div className="file-view-header d-flex justify-content-between align-items-center">
          <FileInfo
            isStarred={this.state.isStarred}
            isLocked={this.state.isLocked}
            toggleStar={this.toggleStar}
          />
          <FileToolbar
            isLocked={this.state.isLocked}
            lockedByMe={this.state.lockedByMe}
            onSave={this.props.onSave}
            isSaving={this.props.isSaving}
            needSave={this.props.needSave}
            toggleLockFile={this.toggleLockFile}
            toggleCommentPanel={this.toggleCommentPanel}
            toggleDetailsPanel={this.toggleDetailsPanel}
          />
        </div>
        <div className="file-view-body flex-auto d-flex o-hidden">
          {this.props.content}
          {this.state.isCommentPanelOpen &&
            <CommentPanel
              toggleCommentPanel={this.toggleCommentPanel}
              participants={this.props.participants}
              onParticipantsChange={this.props.onParticipantsChange}
            />
          }
          {isDetailsPanelOpen &&
          <FileDetails
            repoID={repoID}
            repoName={repoName}
            path={parentDir}
            dirent={{'name': fileName, type: 'file'}}
            togglePanel={this.toggleDetailsPanel}
          />
          }
        </div>
      </div>
    );
  }
}

if (enableWatermark) {
  watermark.init({
    watermark_txt: `${siteName} ${userNickName}`,
    watermark_alpha: 0.075
  });
}

FileView.propTypes = propTypes;

export default FileView;
