import React from 'react';
import PropTypes from 'prop-types';
import { gettext, canGenerateShareLink, isPro, mediaUrl, canLockUnlockFile } from '../../utils/constants';
import { IconButton, ButtonGroup, CollabUsersButton } from '@seafile/seafile-editor/dist/components/topbar-component/editor-toolbar';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Tooltip } from 'reactstrap';
import FileInfo from '@seafile/seafile-editor/dist/components/topbar-component/file-info';

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

const MoreMenuPropTypes = {
  readOnly: PropTypes.bool.isRequired,
  openDialogs: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  editorMode: PropTypes.string.isRequired,
  isSmallScreen: PropTypes.bool,
  toggleShareLinkDialog: PropTypes.func,
  openParentDirectory: PropTypes.func,
  showFileHistory: PropTypes.bool,
  toggleHistory: PropTypes.func,
};

class MoreMenu extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      tooltipOpen: false,
      dropdownOpen:false
    };
  }

  tooltipToggle = () => {
    this.setState({ tooltipOpen: !this.state.tooltipOpen });
  }

  dropdownToggle = () => {
    this.setState({ dropdownOpen:!this.state.dropdownOpen });
  }

  downloadFile = () => {
    location.href = '?dl=1';
  }

  render() {
    const editorMode = this.props.editorMode;
    const isSmall = this.props.isSmallScreen;
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle} direction="down" className="mx-1">
        <DropdownToggle id="moreButton" aria-label={gettext('More Operations')}>
          <i className="fa fa-ellipsis-v"/>
          <Tooltip toggle={this.tooltipToggle} delay={{show: 0, hide: 0}} target="moreButton" placement='bottom' isOpen={this.state.tooltipOpen}>{gettext('More')}
          </Tooltip>
        </DropdownToggle>
        <DropdownMenu className="drop-list" right={true}>
          {(!this.props.readOnly && editorMode === 'rich') &&
            <DropdownItem onMouseDown={this.props.onEdit.bind(this, 'plain')}>{gettext('Switch to plain text editor')}</DropdownItem>}
          {(!this.props.readOnly && editorMode === 'plain') &&
            <DropdownItem onMouseDown={this.props.onEdit.bind(this, 'rich')}>{gettext('Switch to rich text editor')}</DropdownItem>}
          {!isSmall && this.props.showFileHistory &&
            <DropdownItem onMouseDown={this.props.toggleHistory}>{gettext('History')}</DropdownItem>}
          {(this.props.openDialogs && editorMode === 'rich') &&
            <DropdownItem onMouseDown={this.props.openDialogs.bind(this, 'help')}>{gettext('Help')}</DropdownItem>
          }
          {isSmall && <DropdownItem onMouseDown={this.props.openParentDirectory}>{gettext('Open parent directory')}</DropdownItem>}
          {isSmall && canGenerateShareLink && <DropdownItem onMouseDown={this.props.toggleShareLinkDialog}>{gettext('Share')}</DropdownItem>}
          {(isSmall && this.props.showFileHistory) &&
            <DropdownItem onMouseDown={this.props.toggleHistory}>{gettext('History')}</DropdownItem>
          }
          {isSmall && canDownloadFile &&
            <DropdownItem onClick={this.downloadFile}>{gettext('Download')}</DropdownItem>
          }
        </DropdownMenu>
      </Dropdown>
    );
  }
}

MoreMenu.propTypes = MoreMenuPropTypes;


class MarkdownViewerToolbar extends React.Component {

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
                <IconButton text={gettext('Open parent directory')} id={'parentDirectory'}
                  icon={'fa fa-folder-open'} onMouseDown={this.props.openParentDirectory}/>
                {(canLockUnlockFile && !isLocked) &&
                  <IconButton id="lock-unlock-file" icon='fa fa-lock' text={gettext('Lock')} onMouseDown={this.props.toggleLockFile}/>
                }
                {(canLockUnlockFile && lockedByMe) &&
                  <IconButton id="lock-unlock-file" icon='fa fa-unlock' text={gettext('Unlock')} onMouseDown={this.props.toggleLockFile}/>
                }
                {canGenerateShareLink &&
                  <IconButton id={'shareBtn'} text={gettext('Share')} icon={'fa fa-share-alt'}
                    onMouseDown={this.props.toggleShareLinkDialog}/>
                }
                {saving ?
                  <button type={'button'} aria-label={gettext('Saving...')} className={'btn btn-icon btn-secondary btn-active'}>
                    <i className={'fa fa-spin fa-spinner'}/></button>
                  :
                  <IconButton text={gettext('Save')} id={'saveButton'} icon={'fa fa-save'} disabled={!contentChanged}
                    onMouseDown={window.seafileEditor && window.seafileEditor.onRichEditorSave} isActive={contentChanged}/>
                }
                {canDownloadFile && (
                  <IconButton
                    id="download-file"
                    icon="fa fa-download"
                    text={gettext('Download')}
                    onClick={this.downloadFile}
                  />
                )}
                {this.props.fileInfo.permission == 'rw' &&
                <IconButton
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
                  <IconButton text={gettext('Save')} id={'saveButton'} icon={'fa fa-save'}  disabled={!contentChanged}
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
                  <IconButton id={'saveButton'} text={gettext('Save')} icon={'fa fa-save'} onMouseDown={window.seafileEditor && window.seafileEditor.onPlainEditorSave} disabled={!contentChanged} isActive={contentChanged} />
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
                  <IconButton
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

MarkdownViewerToolbar.propTypes = propTypes;

export default MarkdownViewerToolbar;
