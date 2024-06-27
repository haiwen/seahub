import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup, ButtonDropdown, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import IconButton from '../icon-button';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import ModalPortal from '../modal-portal';
import ShareDialog from '../dialog/share-dialog';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';

const propTypes = {
  isLocked: PropTypes.bool.isRequired,
  lockedByMe: PropTypes.bool.isRequired,
  onSave: PropTypes.func,
  isSaving: PropTypes.bool,
  needSave: PropTypes.bool,
  toggleLockFile: PropTypes.func.isRequired,
  toggleDetailsPanel: PropTypes.func.isRequired
};

const {
  canLockUnlockFile,
  repoID, repoName, repoEncrypted, parentDir, filePerm, filePath,
  fileType,
  fileName,
  canEditFile, err,
  // fileEnc, // for 'edit', not undefined only for some kinds of files (e.g. text file)
  canDownloadFile,
} = window.app.pageOptions;

class FileToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      dropdownOpen: false,
      moreDropdownOpen: false,
      isShareDialogOpen: false,
    };
  }

  async componentDidMount() {
    if (filePerm && filePerm.startsWith('custom-')) {
      this.isCustomPermission = true;
      const permissionID = filePerm.split('-')[1];
      try {
        const permissionRes = await seafileAPI.getCustomPermission(repoID, permissionID);
        this.customPermission = permissionRes.data.permission;
        // share dialog need a global custom_permission
        window.custom_permission = this.customPermission;
        this.setState({isLoading: false});
      } catch(error) {
        let errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
        this.setState({isLoading: false});
      }
    } else {
      this.setState({isLoading: false});
    }
  }

  toggleShareDialog = () => {
    this.setState({isShareDialogOpen: !this.state.isShareDialogOpen});
  };

  toggleMoreOpMenu = () => {
    this.setState({
      moreDropdownOpen: !this.state.moreDropdownOpen
    });
  };

  toggle = () => {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen
    });
  };

  render() {
    if (this.state.isLoading) {
      return null;
    }

    const { isLocked, lockedByMe } = this.props;
    const { moreDropdownOpen } = this.state;
    let showLockUnlockBtn = false;
    let lockUnlockText, lockUnlockIcon;
    if (canLockUnlockFile) {
      if (!isLocked) {
        showLockUnlockBtn = true;
        lockUnlockText = gettext('Lock');
        lockUnlockIcon = 'sf3-font sf3-font-lock';
      } else if (lockedByMe) {
        showLockUnlockBtn = true;
        lockUnlockText = gettext('Unlock');
        lockUnlockIcon = 'sf3-font sf3-font-unlock';
      }
    }

    let showShareBtn = false;
    if (repoEncrypted) {
      showShareBtn = true; // for internal link
    } else if (filePerm == 'rw' || filePerm == 'r') {
      showShareBtn = true;
    }

    const { isCustomPermission, customPermission } = this;
    if (isCustomPermission) {
      const { download_external_link } = customPermission.permission;
      showShareBtn = download_external_link;
    }

    return (
      <Fragment>
        <ButtonGroup className="d-none d-md-block flex-shrink-0 ml-4">
          {fileType == 'PDF' && (
            <IconButton
              id="seafile-pdf-print"
              icon="sf3-font sf3-font-print"
              text={gettext('Print')}
            />
          )}
          <IconButton
            id="open-parent-folder"
            icon="sf3-font sf3-font-folder-open"
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
          {showShareBtn && (
            <IconButton
              id="share-file"
              icon='sf3-font sf3-font-share'
              text={gettext('Share')}
              onClick={this.toggleShareDialog}
            />
          )}

          {(canEditFile && fileType != 'SDoc' && !err) &&
            (this.props.isSaving ?
              <button type='button' aria-label={gettext('Saving...')} className={'btn btn-icon btn-secondary btn-active'}>
                <i className='sf3-font sf3-font-spinner'/>
              </button>
              :
              (this.props.needSave ?
                <IconButton
                  text={gettext('Save')}
                  id={'saveButton'}
                  icon='sf3-font sf3-font-save'
                  onClick={this.props.onSave}
                />
                :
                <button type='button' className='btn btn-icon btn-secondary btn-active' disabled>
                  <i className='sf3-font sf3-font-save'/>
                </button>
              ))}
          {canDownloadFile && (
            <IconButton
              id="download-file"
              icon="sf3-font sf3-font-download1"
              text={gettext('Download')}
              tag="a"
              href="?dl=1"
            />
          )}
          <IconButton
            id="file-details"
            icon='sf3-font sf3-font-info1'
            text={gettext('Details')}
            onClick={this.props.toggleDetailsPanel}
          />
          {filePerm == 'rw' && (
            <IconButton
              id="open-via-client"
              icon="sf3-font sf3-font-desktop"
              text={gettext('Open via Client')}
              tag="a"
              href={`seafile://openfile?repo_id=${encodeURIComponent(repoID)}&path=${encodeURIComponent(filePath)}`}
            />
          )}
          <ButtonDropdown isOpen={moreDropdownOpen} toggle={this.toggleMoreOpMenu}>
            <DropdownToggle className="file-toolbar-more-operations" aria-label={gettext('More operations')}>
              <span className="sf3-font sf3-font-more-vertical"></span>
            </DropdownToggle>
            <DropdownMenu right={true}>
              {filePerm == 'rw' && (
                <a href={`${siteRoot}repo/file_revisions/${repoID}/?p=${encodeURIComponent(filePath)}&referer=${encodeURIComponent(location.href)}`} className="dropdown-item">
                  {gettext('History')}
                </a>
              )}
            </DropdownMenu>
          </ButtonDropdown>
        </ButtonGroup>

        <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle} className="d-block d-md-none flex-shrink-0 ml-4">
          <ButtonGroup >
            {(canEditFile && fileType != 'SDoc' && !err) &&
                (this.props.isSaving ?
                  <button type='button' aria-label={gettext('Saving...')} className={'btn btn-icon btn-secondary btn-active'}>
                    <i className='sf3-font sf3-font-spinner'/>
                  </button>
                  :
                  (this.props.needSave ?
                    <IconButton
                      text={gettext('Save')}
                      id={'saveButton'}
                      icon='sf3-font sf3-font-save'
                      onClick={this.props.onSave}
                    />
                    :
                    <button type='button' className={'btn btn-icon btn-secondary btn-active'} disabled>
                      <i className={'sf3-font sf3-font-save'}/>
                    </button>
                  ))}
          </ButtonGroup>

          <DropdownToggle className="sf2-icon-more mx-1" aria-label={gettext('More operations')}></DropdownToggle>
          <DropdownMenu right={true}>
            <DropdownItem>
              <a href={`${siteRoot}library/${repoID}/${Utils.encodePath(repoName + parentDir)}`} className="text-inherit">
                {gettext('Open parent folder')}
              </a>
            </DropdownItem>
            {showLockUnlockBtn && (
              <DropdownItem onClick={this.props.toggleLockFile}>
                {lockUnlockText}
              </DropdownItem>
            )}
            {showShareBtn && (
              <DropdownItem onClick={this.toggleShareDialog}>
                {gettext('Share')}
              </DropdownItem>
            )}
            {filePerm == 'rw' && (
              <DropdownItem>
                <a href={`${siteRoot}repo/file_revisions/${repoID}/?p=${encodeURIComponent(filePath)}&referer=${encodeURIComponent(location.href)}`} className="text-inherit">
                  {gettext('History')}
                </a>
              </DropdownItem>
            )}
            {canDownloadFile && (
              <DropdownItem>
                <a href="?dl=1" className="text-inherit">
                  {gettext('Download')}
                </a>
              </DropdownItem>
            )}
            <DropdownItem onClick={this.props.toggleDetailsPanel}>{gettext('Details')}</DropdownItem>
          </DropdownMenu>
        </Dropdown>

        {this.state.isShareDialogOpen && (
          <ModalPortal>
            <ShareDialog
              itemType='file'
              itemName={fileName}
              itemPath={filePath}
              userPerm={filePerm}
              repoID={repoID}
              repoEncrypted={repoEncrypted}
              toggleDialog={this.toggleShareDialog}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

FileToolbar.propTypes = propTypes;

export default FileToolbar;
