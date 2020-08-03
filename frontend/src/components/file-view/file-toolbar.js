import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { ButtonGroup, Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import IconButton from '../icon-button';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import ModalPortal from '../modal-portal';
import ShareDialog from '../dialog/share-dialog';

const propTypes = { 
  isLocked: PropTypes.bool.isRequired,
  lockedByMe: PropTypes.bool.isRequired,
  onSave: PropTypes.func,
  isSaving: PropTypes.bool,
  needSave: PropTypes.bool,
  toggleLockFile: PropTypes.func.isRequired,
  toggleCommentPanel: PropTypes.func.isRequired
};

const { 
  canLockUnlockFile, canGenerateShareLink,
  repoID, repoName, repoEncrypted, parentDir, filePerm, filePath,
  fileName,
  canEditFile, err,
  fileEnc, // for 'edit', not undefined only for some kinds of files (e.g. text file)
  canDownloadFile, enableComment
} = window.app.pageOptions;

class FileToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
      isShareDialogOpen: false
    };
  }

  toggleShareDialog = () => {
    this.setState({isShareDialogOpen: !this.state.isShareDialogOpen});
  }

  toggle = () => {
    this.setState({
      dropdownOpen: !this.state.dropdownOpen
    });
  }

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

    let showShareBtn = false;
    if (repoEncrypted) {
      showShareBtn = true; // for internal link
    } else if (filePerm == 'rw' || filePerm == 'r') {
      showShareBtn = true;
    }

    return (
      <Fragment>
        <ButtonGroup className="d-none d-md-block">
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
          {showShareBtn && (
            <IconButton
              id="share-file"
              icon='fa fa-share-alt'
              text={gettext('Share')}
              onClick={this.toggleShareDialog}
            />
          )}
          {filePerm == 'rw' && (
            <IconButton
              id="history"
              icon="fa fa-history"
              text={gettext('History')}
              tag="a"
              href={`${siteRoot}repo/file_revisions/${repoID}/?p=${encodeURIComponent(filePath)}`}
            />
          )}
          {(canEditFile && !err) && 
            ( this.props.isSaving ? 
              <button type={'button'} className={'btn btn-icon btn-secondary btn-active'}>
                <i className={'fa fa-spin fa-spinner'}/></button> :
              (
                this.props.needSave ?
                  <IconButton
                    text={gettext('Save')}
                    id={'saveButton'}
                    icon={'fa fa-save'}
                    // button imported in this file does not have functionalities of
                    // isActive as button imported in markdowneditor has
                    //isActive={!isContentChanged}
                    onClick={this.props.onSave}
                  /> :
                  <button type={'button'} className={'btn btn-icon btn-secondary btn-active'} disabled>
                    <i className={'fa fa-save'}/></button>
              )
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
              icon="fa fa-comments"
              text={gettext('Comment')}
              onClick={this.props.toggleCommentPanel}
            />
          )}
        </ButtonGroup>

        <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle} className="d-block d-md-none">
          <ButtonGroup >
            {(canEditFile && !err) &&
                ( this.props.isSaving ?
                  <button type={'button'} className={'btn btn-icon btn-secondary btn-active'}>
                    <i className={'fa fa-spin fa-spinner'}/></button> :
                  (
                    this.props.needSave ?
                      <IconButton
                        text={gettext('Save')}
                        id={'saveButton'}
                        icon={'fa fa-save'}
                        // button imported in this file does not have functionalities of
                        // isActive as button imported in markdowneditor has
                        //isActive={!isContentChanged}
                        onClick={this.props.onSave}
                      /> :
                      <button type={'button'} className={'btn btn-icon btn-secondary btn-active'} disabled>
                        <i className={'fa fa-save'}/></button>
                  )
                )}
          </ButtonGroup>

          <DropdownToggle className="sf2-icon-more mx-1">
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
            {enableComment && (
              <DropdownItem onClick={this.props.toggleCommentPanel}>
                {gettext('Comment')}
              </DropdownItem>
            )}
          </DropdownMenu>
        </Dropdown>

        {this.state.isShareDialogOpen &&
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
        }
      </Fragment>
    );
  }
}

FileToolbar.propTypes = propTypes;

export default FileToolbar;
