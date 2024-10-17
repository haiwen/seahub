import React from 'react';
import PropTypes from 'prop-types';
import watermark from 'watermark-dom';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteName } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import IconButton from '../icon-button';
import FileInfo from './file-info';
import FileToolbar from './file-toolbar';
import OnlyofficeFileToolbar from './onlyoffice-file-toolbar';
import FileDetails from '../dirent-detail/old-file-details';
import EmbeddedFileDetails from '../dirent-detail/embedded-file-details';
import { CollaboratorsProvider, EnableMetadataProvider } from '../../metadata';

import '../../css/file-view.css';

const propTypes = {
  onSave: PropTypes.func,
  content: PropTypes.object.isRequired,
  isSaving: PropTypes.bool,
  needSave: PropTypes.bool,
  isOnlyofficeFile: PropTypes.bool,
  participants: PropTypes.array,
  onParticipantsChange: PropTypes.func,
};

const { isStarred, isLocked, lockedByMe,
  repoID, filePath, filePerm, enableWatermark, userNickName,
  repoName, parentDir, fileName
} = window.app.pageOptions;

class FileView extends React.Component {

  constructor(props) {
    super(props);
    const storedIsHeaderShown = localStorage.getItem('sf_onlyoffile_file_view_header_shown');
    this.state = {
      isStarred: isStarred,
      isLocked: isLocked,
      lockedByMe: lockedByMe,
      isHeaderShown: (storedIsHeaderShown === null) || (storedIsHeaderShown == 'true'),
      isDetailsPanelOpen: false
    };
  }

  componentDidMount() {
    const fileIcon = Utils.getFileIconUrl(fileName);
    document.getElementById('favicon').href = fileIcon;
  }

  toggleDetailsPanel = () => {
    this.setState({ isDetailsPanelOpen: !this.state.isDetailsPanelOpen });
  };

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
  };

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
  };

  toggleHeader = () => {
    this.setState({
      isHeaderShown: !this.state.isHeaderShown
    }, () => {
      localStorage.setItem('sf_onlyoffile_file_view_header_shown', String(this.state.isHeaderShown));
    });
  };

  render() {
    const { isOnlyofficeFile = false } = this.props;
    const { isDetailsPanelOpen, isHeaderShown } = this.state;
    return (
      <div className="h-100 d-flex flex-column">
        <div className={`file-view-header d-flex justify-content-between align-items-center d-print-none ${isOnlyofficeFile ? (isHeaderShown ? 'onlyoffice-file-view-header-shown' : 'onlyoffice-file-view-header-hidden') : ''}`}>
          <FileInfo
            isStarred={this.state.isStarred}
            isLocked={this.state.isLocked}
            toggleStar={this.toggleStar}
            isOnlyofficeFile={isOnlyofficeFile}
          />
          {isOnlyofficeFile ?
            <OnlyofficeFileToolbar
              toggleDetailsPanel={this.toggleDetailsPanel}
              toggleHeader={this.toggleHeader}
            /> :
            <FileToolbar
              isLocked={this.state.isLocked}
              lockedByMe={this.state.lockedByMe}
              onSave={this.props.onSave}
              isSaving={this.props.isSaving}
              needSave={this.props.needSave}
              toggleLockFile={this.toggleLockFile}
              toggleDetailsPanel={this.toggleDetailsPanel}
            />
          }
        </div>
        <div className={`file-view-body flex-auto d-flex o-hidden ${(isOnlyofficeFile && !isHeaderShown) ? 'position-relative' : ''}`}>
          {(isOnlyofficeFile && !isHeaderShown) &&
            <IconButton
              id="unfold-onlyoffice-file-view-header"
              icon='double-arrow-down'
              text={gettext('Unfold')}
              onClick={this.toggleHeader}
            />
          }
          {this.props.content}
          {isDetailsPanelOpen && (
            <>
              {isOnlyofficeFile ?
                <EnableMetadataProvider repoID={repoID} >
                  <CollaboratorsProvider repoID={repoID}>
                    <EmbeddedFileDetails
                      repoID={repoID}
                      path={filePath}
                      dirent={{ 'name': fileName, type: 'file' }}
                      repoInfo={{ permission: filePerm }}
                      onClose={this.toggleDetailsPanel}
                    />
                  </CollaboratorsProvider>
                </EnableMetadataProvider>
                :
                <FileDetails
                  repoID={repoID}
                  repoName={repoName}
                  path={parentDir}
                  dirent={{ 'name': fileName, type: 'file' }}
                  togglePanel={this.toggleDetailsPanel}
                />
              }
            </>
          )}
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
