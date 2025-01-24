import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import IconButton from '../icon-button';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import ModalPortal from '../modal-portal';
import ShareDialog from '../dialog/share-dialog';
import { seafileAPI } from '../../utils/seafile-api';
import toaster from '../toast';
import Icon from '../../components/icon';
import ImageZoomer from './image-zoomer';

const propTypes = {
  isLocked: PropTypes.bool.isRequired,
  lockedByMe: PropTypes.bool.isRequired,
  onSave: PropTypes.func,
  isSaving: PropTypes.bool,
  needSave: PropTypes.bool,
  toggleLockFile: PropTypes.func.isRequired,
  toggleDetailsPanel: PropTypes.func.isRequired,
  setImageScale: PropTypes.func,
  rotateImage: PropTypes.func
};

const {
  canLockUnlockFile,
  repoID, repoName, repoEncrypted, parentDir, filePerm, filePath,
  fileType,
  fileName,
  canEditFile, err,
  // fileEnc, // for 'edit', not undefined only for some kinds of files (e.g. text file)
  canDownloadFile,
  fileDownloadURL,
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
        this.setState({ isLoading: false });
      } catch (error) {
        let errorMsg = Utils.getErrorMsg(error);
        toaster.danger(errorMsg);
        this.setState({ isLoading: false });
      }
    } else {
      this.setState({ isLoading: false });
    }
  }

  toggleShareDialog = () => {
    this.setState({ isShareDialogOpen: !this.state.isShareDialogOpen });
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

    const { moreDropdownOpen } = this.state;

    const { isLocked, lockedByMe } = this.props;
    let showLockUnlockBtn = false;
    let lockUnlockText; let lockUnlockIcon;
    if (canLockUnlockFile) {
      if (!isLocked) {
        showLockUnlockBtn = true;
        lockUnlockText = gettext('Lock');
        lockUnlockIcon = 'lock';
      } else if (lockedByMe) {
        showLockUnlockBtn = true;
        lockUnlockText = gettext('Unlock');
        lockUnlockIcon = 'unlock';
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

    const shortcutMain = Utils.isMac() ? '⌘ + ' : 'Ctrl + ';

    return (
      <Fragment>
        <div className="d-none d-md-flex justify-content-between align-items-center flex-shrink-0 ml-4">
          {fileType == 'Image' && (
            <>
              <ImageZoomer setImageScale={this.props.setImageScale} />
              <IconButton
                id="rotate-image"
                icon="rotate"
                text={gettext('Rotate')}
                onClick={this.props.rotateImage}
              />
            </>
          )}
          {fileType == 'PDF' && (
            <IconButton
              id="seafile-pdf-find"
              icon="search"
              text={`${gettext('Find')}(${shortcutMain}F)`}
            />
          )}
          {(fileType == 'PDF' && canDownloadFile) && (
            <IconButton
              id="seafile-pdf-print"
              icon="print"
              text={gettext('Print')}
            />
          )}
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
              icon='share'
              text={gettext('Share')}
              onClick={this.toggleShareDialog}
            />
          )}

          {(canEditFile && fileType != 'SDoc' && !err) &&
            (this.props.isSaving ?
              <div type='button' aria-label={gettext('Saving...')} className={'file-toolbar-btn'}>
                <Icon symbol="spinner" />
              </div>
              :
              (this.props.needSave ?
                <IconButton
                  text={gettext('Save')}
                  id='save-file'
                  icon='save'
                  onClick={this.props.onSave}
                />
                :
                <div type='button' className='file-toolbar-btn disabled'>
                  <Icon symbol="save" />
                </div>
              ))}
          {canDownloadFile && (
            <IconButton
              id="download-file"
              icon="download"
              text={gettext('Download')}
              href={fileDownloadURL}
            />
          )}
          <IconButton
            id="file-details"
            icon='info'
            text={gettext('Details')}
            onClick={this.props.toggleDetailsPanel}
          />
          {filePerm == 'rw' && (
            <IconButton
              id="open-via-client"
              icon="client"
              text={gettext('Open via Client')}
              href={`seafile://openfile?repo_id=${encodeURIComponent(repoID)}&path=${encodeURIComponent(filePath)}`}
            />
          )}
          <Dropdown isOpen={moreDropdownOpen} toggle={this.toggleMoreOpMenu}>
            <DropdownToggle
              className="file-toolbar-btn"
              aria-label={gettext('More operations')}
              title={gettext('More operations')}
              tag="div"
            >
              <Icon symbol="more-vertical" />
            </DropdownToggle>
            <DropdownMenu right={true}>
              {filePerm == 'rw' && (
                <a href={`${siteRoot}repo/file_revisions/${repoID}/?p=${encodeURIComponent(filePath)}&referer=${encodeURIComponent(location.href)}`} className="dropdown-item">
                  {gettext('History')}
                </a>
              )}
              <a href={`${siteRoot}library/${repoID}/${Utils.encodePath(repoName + parentDir)}`} className="dropdown-item">
                {gettext('Open parent folder')}
              </a>
            </DropdownMenu>
          </Dropdown>
        </div>

        <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle} className="d-block d-md-none flex-shrink-0 ml-4">
          <ButtonGroup >
            {(canEditFile && fileType != 'SDoc' && !err) &&
                (this.props.isSaving ?
                  <button type='button' aria-label={gettext('Saving...')} className={'btn btn-icon btn-secondary'}>
                    <Icon symbol="spinner" />
                  </button>
                  :
                  (this.props.needSave ?
                    <IconButton
                      text={gettext('Save')}
                      id="save-file"
                      icon='save'
                      onClick={this.props.onSave}
                    />
                    :
                    <button type='button' className={'btn btn-icon btn-secondary'} disabled>
                      <Icon symbol="save" />
                    </button>
                  ))}
          </ButtonGroup>

          <DropdownToggle className="mx-1" aria-label={gettext('More operations')}>
            <Icon symbol="more-vertical" />
          </DropdownToggle>
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
