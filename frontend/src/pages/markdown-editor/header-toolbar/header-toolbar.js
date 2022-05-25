import React from 'react';
import PropTypes from 'prop-types';
import { gettext, canGenerateShareLink, isPro, mediaUrl, canLockUnlockFile } from '../../../utils/constants';
import ButtonGroup from './button-group';
import ButtonItem from './button-item';
import CollabUsersButton from './collab-users-button';
import MoreMenu from './more-menu';
import FileInfo from './file-info';

import '../css/header-toolbar.css';

const { seafileCollabServer } = window.app.config;
const { canDownloadFile } = window.app.pageOptions;

const propTypes = {
  isDocs: PropTypes.bool.isRequired,
  hasDraft: PropTypes.bool.isRequired,
  isDraft: PropTypes.bool.isRequired,
  editorApi: PropTypes.object.isRequired,
  collabUsers: PropTypes.array.isRequired,
  fileInfo: PropTypes.object.isRequired,
  toggleShareLinkDialog: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  toggleNewDraft: PropTypes.func.isRequired,
  toggleStar: PropTypes.func.isRequired,
  openParentDirectory: PropTypes.func.isRequired,
  openDialogs: PropTypes.func.isRequired,
  showFileHistory: PropTypes.bool.isRequired,
  toggleHistory: PropTypes.func.isRequired,
  editorMode: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  contentChanged: PropTypes.bool.isRequired,
  saving: PropTypes.bool.isRequired,
  showDraftSaved: PropTypes.bool.isRequired,
  isLocked: PropTypes.bool.isRequired,
  lockedByMe: PropTypes.bool.isRequired,
  toggleLockFile: PropTypes.func.isRequired,
};

class HeaderToolbar extends React.Component {

  constructor(props) {
    super(props);
  }

  downloadFile = () => {
    location.href = '?dl=1';
  }

  openFileViaClient = () => {
    const { repoID, path } = this.props.fileInfo;
    location.href = `seafile://openfile?repo_id=${encodeURIComponent(repoID)}&path=${encodeURIComponent(path)}`;
  }

  render() {
    let { contentChanged, saving, isLocked, lockedByMe } = this.props;
    let canPublishDraft = this.props.fileInfo.permission == 'rw';
    let canCreateDraft = canPublishDraft && (!this.props.hasDraft && !this.props.isDraft && this.props.isDocs);

    if (this.props.editorMode === 'rich') {
      return (
        <div className="sf-md-viewer-topbar">
          <div className="sf-md-viewer-topbar-first d-flex justify-content-between">
            <FileInfo
              toggleStar={this.props.toggleStar}
              editorApi={this.props.editorApi}
              fileInfo={this.props.fileInfo}
              showDraftSaved={this.props.showDraftSaved}
              isLocked={isLocked}
              isPro={isPro}
              mediaUrl={mediaUrl}
              isStarred={this.props.fileInfo.isStarred}
            />
            {(this.props.hasDraft && !this.props.isDraft) &&
              <div className='seafile-btn-view-review'>
                <div className='tag tag-green'>{gettext('This file is in draft stage.')}
                  <a className="ml-2" onMouseDown={this.props.editorApi.goDraftPage}>{gettext('View Draft')}</a></div>
              </div>
            }
            <div className="topbar-btn-container">
              {canCreateDraft &&
                <button onMouseDown={this.props.toggleNewDraft} className="btn btn-success btn-new-draft">
                  {gettext('New Draft')}</button>
              }
              {this.props.isDraft &&
                <div>
                  <button type="button" className="btn btn-success seafile-btn-add-review"
                    onMouseDown={this.props.editorApi.goDraftPage}>{gettext('Start review')}</button>
                  {canPublishDraft &&
                    <button type="button" className="btn btn-success seafile-btn-add-review"
                      onMouseDown={this.props.editorApi.publishDraftFile}>{gettext('Publish')}</button>
                  }
                </div>
              }
              {(seafileCollabServer && this.props.collabUsers.length > 0) &&
                <CollabUsersButton
                  className="collab-users-dropdown"
                  users={this.props.collabUsers}
                  id="usersButton"
                />
              }
              <ButtonGroup>
                <ButtonItem text={gettext('Open parent directory')} id={'parentDirectory'}
                  icon={'fa fa-folder-open'} onMouseDown={this.props.openParentDirectory}/>
                {(canLockUnlockFile && !isLocked) &&
                  <ButtonItem id="lock-unlock-file" icon='fa fa-lock' text={gettext('Lock')} onMouseDown={this.props.toggleLockFile}/>
                }
                {(canLockUnlockFile && lockedByMe) &&
                  <ButtonItem id="lock-unlock-file" icon='fa fa-unlock' text={gettext('Unlock')} onMouseDown={this.props.toggleLockFile}/>
                }
                {canGenerateShareLink &&
                  <ButtonItem id={'shareBtn'} text={gettext('Share')} icon={'fa fa-share-alt'}
                    onMouseDown={this.props.toggleShareLinkDialog}/>
                }
                {saving ?
                  <button type={'button'} aria-label={gettext('Saving...')} className={'btn btn-icon btn-secondary btn-active'}>
                    <i className={'fa fa-spin fa-spinner'}/></button>
                  :
                  <ButtonItem text={gettext('Save')} id={'saveButton'} icon={'fa fa-save'} disabled={!contentChanged}
                    onMouseDown={window.seafileEditor && window.seafileEditor.onRichEditorSave} isActive={contentChanged}/>
                }
                {canDownloadFile && (
                  <ButtonItem
                    id="download-file"
                    icon="fa fa-download"
                    text={gettext('Download')}
                    onClick={this.downloadFile}
                  />
                )}
                {this.props.fileInfo.permission == 'rw' &&
                <ButtonItem
                  id="open-via-client"
                  icon="sf3-font sf3-font-desktop"
                  text={gettext('Open via Client')}
                  onClick={this.openFileViaClient}
                />
                }
              </ButtonGroup>
              <MoreMenu
                readOnly={this.props.readOnly}
                openDialogs={this.props.openDialogs}
                editorMode={this.props.editorMode}
                onEdit={this.props.onEdit}
                showFileHistory={this.props.showFileHistory}
                toggleHistory={this.props.toggleHistory}
                isSmallScreen={false}
              />
            </div>
          </div>
          <div className="sf-md-viewer-topbar-first-narrow d-flex justify-content-between">
            <FileInfo
              toggleStar={this.props.toggleStar}
              editorApi={this.props.editorApi}
              fileInfo={this.props.fileInfo}
              showDraftSaved={this.props.showDraftSaved}
            />
            <div className="topbar-btn-container">
              <ButtonGroup>
                {saving ?
                  <button type={'button'} aria-label={gettext('Saving...')} className={'btn btn-icon btn-secondary btn-active'}>
                    <i className={'fa fa-spin fa-spinner'}/></button>
                  :
                  <ButtonItem text={gettext('Save')} id={'saveButton'} icon={'fa fa-save'}  disabled={!contentChanged}
                    onMouseDown={window.seafileEditor && window.seafileEditor.onRichEditorSave} isActive={contentChanged}/>
                }
              </ButtonGroup>
              <MoreMenu
                readOnly={this.props.readOnly}
                openDialogs={this.props.openDialogs}
                editorMode={this.props.editorMode}
                onEdit={this.props.onEdit}
                toggleShareLinkDialog={this.props.toggleShareLinkDialog}
                openParentDirectory={this.props.openParentDirectory}
                showFileHistory={this.props.showFileHistory}
                toggleHistory={this.props.toggleHistory}
                isSmallScreen={true}
              />
            </div>
          </div>
        </div>
      );
    } else if (this.props.editorMode === 'plain') {
      return (
        <div className="sf-md-viewer-topbar">
          <div className="sf-md-viewer-topbar-first d-flex justify-content-between">
            <FileInfo toggleStar={this.props.toggleStar} editorApi={this.props.editorApi}
              fileInfo={this.props.fileInfo}/>
            <div className="topbar-btn-container">
              {(seafileCollabServer && this.props.collabUsers.length > 0) &&
                <CollabUsersButton
                  className="collab-users-dropdown"
                  users={this.props.collabUsers}
                  id="usersButton"
                />
              }
              <ButtonGroup>
                { saving ?
                  <button type={'button'} className={'btn btn-icon btn-secondary btn-active'}>
                    <i className={'fa fa-spin fa-spinner'}/></button>
                  :
                  <ButtonItem id={'saveButton'} text={gettext('Save')} icon={'fa fa-save'} onMouseDown={window.seafileEditor && window.seafileEditor.onPlainEditorSave} disabled={!contentChanged} isActive={contentChanged} />
                }
              </ButtonGroup>
              <MoreMenu
                readOnly={this.props.readOnly}
                openDialogs={this.props.openDialogs}
                editorMode={this.props.editorMode}
                onEdit={this.props.onEdit}
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
                    <i className={'fa fa-spin fa-spinner'}/></button>
                  :
                  <ButtonItem
                    id={'saveButton'}
                    text={gettext('Save')}
                    icon={'fa fa-save'}
                    onMouseDown={window.seafileEditor && window.seafileEditor.onPlainEditorSave}
                    disabled={!contentChanged}
                    isActive={contentChanged}
                  />
                }
              </ButtonGroup>
              <MoreMenu
                readOnly={this.props.readOnly}
                openDialogs={this.props.openDialogs}
                editorMode={this.props.editorMode}
                onEdit={this.props.onEdit}
                isSmallScreen={false}
              />
            </div>
          </div>

        </div>
      );
    }
  }
}

HeaderToolbar.propTypes = propTypes;

export default HeaderToolbar;
