import React, { Suspense } from 'react';
import PropTypes from 'prop-types';
import watermark from 'watermark-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../_i18n/i18n-sdoc-editor';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteName } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import IconButton from '../icon-button';
import FileInfo from './file-info';
import FileToolbar from './file-toolbar';
import OnlyofficeFileToolbar from './onlyoffice-file-toolbar';
import EmbeddedFileDetails from '../dirent-detail/embedded-file-details';
import { MetadataStatusProvider } from '../../hooks';
import { CollaboratorsProvider } from '../../metadata';
import { TagsProvider } from '../../tag/hooks';
import Loading from '../loading';

import '../../css/file-view.css';

const propTypes = {
  onSave: PropTypes.func,
  content: PropTypes.object.isRequired,
  isSaving: PropTypes.bool,
  needSave: PropTypes.bool,
  isOnlyofficeFile: PropTypes.bool,
  setImageScale: PropTypes.func,
};

const { isStarred, isLocked, lockedByMe,
  repoID, filePath, filePerm, enableWatermark, userNickName,
  fileName, repoEncrypted, isRepoAdmin, fileType
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
    const repoInfo = {
      permission: filePerm,
      encrypted: repoEncrypted,
      is_admin: isRepoAdmin,
    };
    return (
      <I18nextProvider i18n={ i18n }>
        <Suspense fallback={<Loading />}>
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
                  setImageScale={this.props.setImageScale}
                />
              }
            </div>
            <div className={`file-view-body flex-auto d-flex ${fileType == 'PDF' ? '' : 'o-hidden'} ${(isOnlyofficeFile && !isHeaderShown) ? 'position-relative' : ''}`}>
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
                <MetadataStatusProvider repoID={repoID} repoInfo={repoInfo}>
                  <CollaboratorsProvider repoID={repoID}>
                    <TagsProvider repoID={repoID} repoInfo={repoInfo}>
                      <EmbeddedFileDetails
                        repoID={repoID}
                        path={filePath}
                        dirent={{ 'name': fileName, type: 'file' }}
                        repoInfo={repoInfo}
                        onClose={this.toggleDetailsPanel}
                      />
                    </TagsProvider>
                  </CollaboratorsProvider>
                </MetadataStatusProvider>
              )}
            </div>
          </div>
        </Suspense>
      </I18nextProvider>
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
