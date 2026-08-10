import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonGroup } from 'reactstrap';
import IconButton from '../icon-button';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils, isImageRotateable } from '../../utils/utils';
import Icon from '../../components/icon';
import Switch from '../../components/switch';
import ImageZoomer from './image-zoomer';
import Tooltip from '../tooltip';
import CustomDropdown from '../dropdown';

const propTypes = {
  isLocked: PropTypes.bool.isRequired,
  lockedByMe: PropTypes.bool.isRequired,
  onSave: PropTypes.func,
  isSaving: PropTypes.bool,
  needSave: PropTypes.bool,
  toggleLockFile: PropTypes.func.isRequired,
  toggleCommentPanel: PropTypes.func.isRequired,
  toggleDetailsPanel: PropTypes.func.isRequired,
  setImageScale: PropTypes.func,
  rotateImage: PropTypes.func,
  isCommentUpdated: PropTypes.bool,
  isShareEnabled: PropTypes.bool,
  toggleShareDialog: PropTypes.func.isRequired,
  lineWrapping: PropTypes.bool,
  updateLineWrapping: PropTypes.func,
};

const {
  canLockUnlockFile,
  repoID, repoName, parentDir, filePerm, filePath,
  fileType, fileExt,
  canEditFile, err,
  // fileEnc, // for 'edit', not undefined only for some kinds of files (e.g. text file)
  canDownloadFile,
  canRotate,
  fileDownloadURL,
  canEditPDF,
  enableOnlyoffice
} = window.app.pageOptions;

class FileToolbar extends React.Component {

  handleOpenWithOnlyOffice = () => {
    location.href = '?open_with_onlyoffice=true';
  };

  handleOpenWithClient = () => {
    location.href = `seafile://openfile?repo_id=${encodeURIComponent(repoID)}&path=${encodeURIComponent(filePath)}`;
  };

  handleOpenHistory = () => {
    location.href = `${siteRoot}repo/file_revisions/${repoID}/?p=${encodeURIComponent(filePath)}&referer=${encodeURIComponent(location.href)}`;
  };

  handleOpenParentFolder = () => {
    location.href = `${siteRoot}library/${repoID}/${Utils.encodePath(repoName + parentDir)}`;
  };

  handleDownload = () => {
    location.href = '?dl=1';
  };

  toggleLineWrapping = () => {
    this.props.updateLineWrapping(!this.props.lineWrapping);
  };

  getDesktopMenuItems = () => {
    const items = [];
    if (fileExt === 'csv' && enableOnlyoffice) {
      items.push({
        key: 'open-with-onlyoffice',
        label: gettext('Open with OnlyOffice'),
        onClick: this.handleOpenWithOnlyOffice,
      });
    }
    if (filePerm === 'rw') {
      items.push({
        key: 'open-with-client',
        label: gettext('Open with client'),
        onClick: this.handleOpenWithClient,
      });
    }
    if (filePerm === 'rw') {
      items.push({
        key: 'history',
        label: gettext('History'),
        onClick: this.handleOpenHistory,
      });
    }
    if (fileType === 'Text') {
      items.push({
        key: 'line-wrapping',
        label: gettext('Line wrapping'),
        right_slot: <Switch className="txt-line-wrap-menu mr-3" checked={this.props.lineWrapping} onChange={this.toggleLineWrapping} />,
        keepOpen: true,
      });
    }
    if (items.length > 0) {
      items.push('Divider');
    }
    items.push({
      key: 'open-parent-folder',
      label: gettext('Open parent folder'),
      onClick: this.handleOpenParentFolder,
    });
    return items;
  };

  getMobileMenuItems = () => {
    const items = [];
    const { isLocked, lockedByMe, isShareEnabled } = this.props;
    let showLockUnlockBtn;
    let lockUnlockText;
    if (canLockUnlockFile) {
      if (!isLocked) {
        showLockUnlockBtn = true;
        lockUnlockText = gettext('Lock');
      } else if (lockedByMe) {
        showLockUnlockBtn = true;
        lockUnlockText = gettext('Unlock');
      }
    }
    items.push({ key: 'open-parent-folder', label: gettext('Open parent folder'), onClick: this.handleOpenParentFolder });
    if (showLockUnlockBtn) {
      items.push({ key: 'lock-unlock', label: lockUnlockText, onClick: this.props.toggleLockFile });
    }
    if (isShareEnabled) {
      items.push({ key: 'share', label: gettext('Share'), onClick: this.props.toggleShareDialog });
    }
    if (canDownloadFile) {
      items.push({ key: 'download', label: gettext('Download'), onClick: this.handleDownload });
    }
    items.push({ key: 'comment', label: gettext('Comment'), onClick: this.props.toggleCommentPanel });
    items.push({ key: 'details', label: gettext('Details'), onClick: this.props.toggleDetailsPanel });
    if (fileType == 'Text') {
      items.push({ key: 'line-wrapping', label: gettext('Line wrapping'), keepOpen: true, onClick: this.toggleLineWrapping });
    }
    return items;
  };

  renderCustomTrigger = (isOpen) => {
    return (
      <>
        <Icon symbol="more-level" />
        {!isOpen && (
          <Tooltip target="more-operations" placement='bottom'>
            {gettext('More operations')}
          </Tooltip>
        )}
      </>
    );
  };

  render() {
    const { isLocked, lockedByMe, isCommentUpdated, isShareEnabled } = this.props;
    let showLockUnlockBtn = false;
    let lockUnlockText;
    let lockUnlockIcon;
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
    const shortcutMain = Utils.isMac() ? '⌘ + ' : 'Ctrl + ';

    return (
      <Fragment>
        <div className="d-none d-md-flex justify-content-between align-items-center flex-shrink-0 ml-4">
          {(fileType == 'Image' && !err) && (
            <>
              <ImageZoomer
                setImageScale={this.props.setImageScale}
                setDefaultPageFitScale={this.props.setDefaultPageFitScale}
              />
              <IconButton
                id="rotate-image"
                icon="rotate"
                text={gettext('Rotate')}
                onClick={this.props.rotateImage}
                disabled={isLocked || !canRotate || !isImageRotateable(fileExt)}
              />
            </>
          )}
          {fileType == 'PDF' && (
            <IconButton
              id="seafile-pdf-find"
              icon="search"
              text={gettext('Find')}
              shortcut={[shortcutMain + 'F']}
            />
          )}
          {(fileType == 'PDF' && canDownloadFile) && (
            <IconButton
              id="seafile-pdf-print"
              icon="print"
              text={gettext('Print')}
            />
          )}
          {(fileType == 'PDF' && canEditPDF) && (
            <IconButton
              id="seafile-pdf-edit"
              icon="edit"
              text={gettext('Edit')}
              href={'?open_with_onlyoffice=true'}
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
          {(canEditFile && fileType != 'SDoc' && !err) &&
            (this.props.isSaving ?
              <Button type='button' aria-label={gettext('Saving...')} className={'file-toolbar-btn border-0 p-0 bg-transparent'}>
                <Icon symbol="spinner" />
              </Button>
              :
              (this.props.needSave ?
                <IconButton
                  text={gettext('Save')}
                  id='save-file'
                  icon='save'
                  onClick={this.props.onSave}
                />
                :
                <Button type='button' disabled={true} className='file-toolbar-btn disabled border-0 p-0 bg-transparent'>
                  <Icon symbol="save" />
                </Button>
              ))}
          {canDownloadFile && (
            <IconButton
              id="download-file"
              icon="download"
              text={gettext('Download')}
              href={fileDownloadURL || '?dl=1'}
            />
          )}
          <IconButton
            id="file-details"
            icon='info'
            text={gettext('Details')}
            onClick={this.props.toggleDetailsPanel}
          />
          <span className="position-relative">
            <IconButton
              id="file-comment"
              icon="comment"
              text={gettext('Comment')}
              onClick={this.props.toggleCommentPanel}
            />
            {isCommentUpdated && <span className='comment-tip'></span>}
          </span>
          {isShareEnabled && (
            <IconButton
              id="share-file"
              icon='share'
              text={gettext('Share')}
              onClick={this.props.toggleShareDialog}
            />
          )}
          <CustomDropdown
            target="more-operations"
            items={this.getDesktopMenuItems()}
            trigger={this.renderCustomTrigger}
            triggerClassName="file-toolbar-btn"
            menuPortal={false}
          />
        </div>
        <CustomDropdown
          target="file-toolbar-mobile-more"
          items={this.getMobileMenuItems()}
          className="d-block d-md-none flex-shrink-0 ml-4"
          trigger={
            <ButtonGroup>
              {(canEditFile && fileType !== 'SDoc' && !err) &&
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
              <span className="mx-1"><Icon symbol="more-level" /></span>
            </ButtonGroup>
          }
          menuPortal={false}
        />
      </Fragment>
    );
  }
}

FileToolbar.propTypes = propTypes;

export default FileToolbar;
