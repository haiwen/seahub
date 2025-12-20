import React from 'react';
import PropTypes from 'prop-types';
import { EXTERNAL_EVENTS, EventBus } from '@seafile/seafile-editor';
import { gettext, canGenerateShareLink, isPro, mediaUrl, canLockUnlockFile } from '../../../utils/constants';
import ButtonGroup from './button-group';
import MoreMenu from './more-menu';
import FileInfo from './file-info';
import Icon from '../../../components/icon';
import IconButton from '../../../components/icon-button';
import EmbeddedFileDetails from '../../../components/dirent-detail/embedded-file-details';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import Dirent from '../../../../src/models/dirent';

import '../css/header-toolbar.css';

const { canDownloadFile, repoID, filePath, isRepoAdmin } = window.app.pageOptions;

const propTypes = {
  editorApi: PropTypes.object.isRequired,
  collabUsers: PropTypes.array.isRequired,
  fileInfo: PropTypes.object.isRequired,
  toggleShareLinkDialog: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  toggleStar: PropTypes.func.isRequired,
  openDialogs: PropTypes.func.isRequired,
  showFileHistory: PropTypes.bool.isRequired,
  toggleHistory: PropTypes.func.isRequired,
  editorMode: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  contentChanged: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
  onSaveEditorContent: PropTypes.func.isRequired,
  isLocked: PropTypes.bool.isRequired,
  lockedByMe: PropTypes.bool.isRequired,
  toggleLockFile: PropTypes.func.isRequired,
};

class HeaderToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.dirPath = filePath.substring(0, filePath.lastIndexOf('/') || 0) || '/';
    this.isFileInfoShow = false;
    this.currentDirent = null;
    this.helpInfoToggleSubscribe = null;
  }

  downloadFile = () => {
    location.href = '?dl=1';
  };

  openParentDirectory = () => {
    const { editorApi } = this.props;
    window.location.href = editorApi.getParentDictionaryUrl();
  };

  componentDidMount() {
    this.getDirentList();

    const eventBus = EventBus.getInstance();
    this.helpInfoToggleSubscribe = eventBus.subscribe(EXTERNAL_EVENTS.ON_HELP_INFO_TOGGLE, this.handleHelpClick);
  }

  componentWillUnmount() {
    this.helpInfoToggleSubscribe && this.helpInfoToggleSubscribe();
  }

  handleHelpClick = () => {
    this.isFileInfoShow = false;
  };

  getDirentList = () => {
    return seafileAPI.listDir(repoID, this.dirPath, { 'with_thumbnail': true }).then(res => {
      const direntList = res.data.dirent_list || [];
      for (let i = 0; i < direntList.length; i++) {
        const item = direntList[i];
        const dirent = new Dirent(item);
        if (Utils.joinPath(item.parent_dir, item.name) === filePath) {
          this.currentDirent = dirent;
          break;
        }
      }
    }).catch((err) => {
      Utils.getErrorMsg(err, true);
    });
  };

  onArticleInfoToggle = () => {
    const repoInfo = { permission: this.currentDirent.permission, is_admin: isRepoAdmin, };
    const eventBus = EventBus.getInstance();

    eventBus.dispatch(EXTERNAL_EVENTS.ON_ARTICLE_INFO_TOGGLE, this.isFileInfoShow ? null : {
      component: (props) => {
        return (<EmbeddedFileDetails {...props} />);
      },
      props: {
        repoID: repoID,
        repoInfo: repoInfo,
        dirent: this.currentDirent,
        path: filePath,
        onClose: this.onArticleInfoToggle,
        width: 300,
        component: {
          headerComponent: {
            closeIcon: (<Icon symbol="md-close" className="detail-control-icon" />)
          }
        }
      }
    });
    this.isFileInfoShow = !this.isFileInfoShow;
  };

  render() {
    let { contentChanged, saving, isLocked, lockedByMe } = this.props;

    if (this.props.editorMode === 'rich') {
      return (
        <div className="sf-md-viewer-topbar">
          <div className="sf-md-viewer-topbar-first d-flex justify-content-between mw-100">
            <FileInfo
              toggleStar={this.props.toggleStar}
              editorApi={this.props.editorApi}
              fileInfo={this.props.fileInfo}
              isLocked={isLocked}
              isPro={isPro}
              mediaUrl={mediaUrl}
              isStarred={this.props.fileInfo.isStarred}
            />
            <div className="topbar-btn-container">
              <ButtonGroup>
                {(canLockUnlockFile && !isLocked) && (
                  <IconButton
                    id="lock-unlock-file"
                    icon='lock'
                    text={gettext('Lock')}
                    onClick={this.props.toggleLockFile}
                  />
                )}
                {(canLockUnlockFile && lockedByMe) && (
                  <IconButton
                    id="lock-unlock-file"
                    icon='unlock'
                    text={gettext('Unlock')}
                    onClick={this.props.toggleLockFile}
                  />
                )}
                {canGenerateShareLink && (
                  <IconButton
                    id='shareBtn'
                    text={gettext('Share')}
                    icon='share'
                    onClick={this.props.toggleShareLinkDialog}
                  />
                )}
                {saving ?
                  <button type={'button'} aria-label={gettext('Saving...')} className={'btn btn-icon btn-secondary btn-active'}>
                    <Icon symbol="spinner" />
                  </button>
                  :
                  <IconButton
                    text={gettext('Save')}
                    id={'saveButton'}
                    icon='save'
                    disabled={!contentChanged}
                    onClick={this.props.onSaveEditorContent}
                  />
                }
                {canDownloadFile && (
                  <IconButton
                    id="download-file"
                    icon="download"
                    text={gettext('Download')}
                    onClick={this.downloadFile}
                  />
                )}
                <IconButton
                  id="file-info"
                  text={gettext('Info')}
                  icon='info'
                  onClick={this.onArticleInfoToggle}
                />
              </ButtonGroup>
              <MoreMenu
                readOnly={this.props.readOnly}
                openDialogs={this.props.openDialogs}
                editorMode={this.props.editorMode}
                onEdit={this.props.onEdit}
                showFileHistory={this.props.showFileHistory}
                toggleHistory={this.props.toggleHistory}
                openParentDirectory={this.openParentDirectory}
                isSmallScreen={false}
              />
            </div>
          </div>
          <div className="sf-md-viewer-topbar-first-narrow d-flex justify-content-between">
            <FileInfo
              toggleStar={this.props.toggleStar}
              editorApi={this.props.editorApi}
              fileInfo={this.props.fileInfo}
            />
            <div className="topbar-btn-container">
              <ButtonGroup>
                {saving ?
                  <button type={'button'} aria-label={gettext('Saving...')} className={'btn btn-icon btn-secondary btn-active'}>
                    <Icon symbol="spinner" />
                  </button>
                  :
                  <IconButton
                    text={gettext('Save')}
                    id={'saveButton'}
                    icon='save'
                    disabled={!contentChanged}
                    onClick={this.props.onSaveEditorContent}
                  />
                }
              </ButtonGroup>
              <MoreMenu
                readOnly={this.props.readOnly}
                openDialogs={this.props.openDialogs}
                editorMode={this.props.editorMode}
                onEdit={this.props.onEdit}
                toggleShareLinkDialog={this.props.toggleShareLinkDialog}
                openParentDirectory={this.openParentDirectory}
                showFileHistory={this.props.showFileHistory}
                toggleHistory={this.props.toggleHistory}
                isSmallScreen={true}
              />
            </div>
          </div>
        </div>
      );
    }

    if (this.props.editorMode === 'plain') {
      return (
        <div className="sf-md-viewer-topbar">
          <div className="sf-md-viewer-topbar-first d-flex justify-content-between">
            <FileInfo toggleStar={this.props.toggleStar} editorApi={this.props.editorApi}
              fileInfo={this.props.fileInfo}/>
            <div className="topbar-btn-container">
              <ButtonGroup>
                {saving ?
                  <button type={'button'} className={'btn btn-icon btn-secondary btn-active'}>
                    <Icon symbol="spinner" />
                  </button>
                  :
                  <IconButton
                    id={'saveButton'}
                    text={gettext('Save')}
                    icon='save'
                    onClick={this.props.onSaveEditorContent}
                    disabled={!contentChanged}
                  />
                }
              </ButtonGroup>
              <MoreMenu
                readOnly={this.props.readOnly}
                openDialogs={this.props.openDialogs}
                editorMode={this.props.editorMode}
                onEdit={this.props.onEdit}
                openParentDirectory={this.openParentDirectory}
                isSmallScreen={false}
              />
            </div>
          </div>
          <div className="sf-md-viewer-topbar-first-narrow d-flex justify-content-between">
            <FileInfo toggleStar={this.props.toggleStar} editorApi={this.props.editorApi}
              fileInfo={this.props.fileInfo}/>
            <div className="topbar-btn-container">
              <ButtonGroup>
                {saving ?
                  <button type={'button'} className={'btn btn-icon btn-secondary btn-active'}>
                    <Icon symbol="spinner" />
                  </button>
                  :
                  <IconButton
                    id={'saveButton'}
                    text={gettext('Save')}
                    icon='save'
                    onMouseDown={this.props.onSaveEditorContent}
                    disabled={!contentChanged}
                  />
                }
              </ButtonGroup>
              <MoreMenu
                readOnly={this.props.readOnly}
                openDialogs={this.props.openDialogs}
                editorMode={this.props.editorMode}
                onEdit={this.props.onEdit}
                openParentDirectory={this.openParentDirectory}
                isSmallScreen={false}
              />
            </div>
          </div>
        </div>
      );
    }

    return null;
  }
}

HeaderToolbar.propTypes = propTypes;

export default HeaderToolbar;
