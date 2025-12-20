import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import copy from 'copy-to-clipboard';
import { Button, Input, InputGroup } from 'reactstrap';
import { gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault, canSendShareLinkEmail } from '../../utils/constants';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';
import { shareLinkAPI } from '../../utils/share-link-api';
import { Utils } from '../../utils/utils';
import ShareLink from '../../models/share-link';
import toaster from '../toast';
import SendLink from '../send-link';
import SharedLink from '../shared-link';
import SetLinkExpiration from '../set-link-expiration';
import ShareLinkScopeEditor from '../select-editor/share-link-scope-editor';
import SelectEditor from '../select-editor/select-editor';
import BackIcon from '../../components/back-icon';
import Icon from '../icon';

const propTypes = {
  sharedLinkInfo: PropTypes.object.isRequired,
  permissionOptions: PropTypes.array.isRequired,
  defaultExpireDays: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  showLinkDetails: PropTypes.func.isRequired,
  updateLink: PropTypes.func.isRequired,
  deleteLink: PropTypes.func.isRequired,
  closeShareDialog: PropTypes.func.isRequired,
  setMode: PropTypes.func,
};

class LinkDetails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      storedPasswordVisible: false,
      isEditingExpiration: false,
      expType: 'by-days',
      expireDays: this.props.defaultExpireDays,
      expDate: null,
      isLinkDeleteDialogOpen: false,
      isSendLinkShown: false
    };
  }

  onCopySharedLink = () => {
    const { sharedLinkInfo } = this.props;
    copy(sharedLinkInfo.link);
    toaster.success(gettext('Share link is copied to the clipboard.'));
  };

  onCopyDownloadLink = () => {
    const { sharedLinkInfo } = this.props;
    copy(`${sharedLinkInfo.download_link}?op=view`);
    toaster.success(gettext('Direct download link is copied to the clipboard.'));
  };

  toggleStoredPasswordVisible = () => {
    this.setState({
      storedPasswordVisible: !this.state.storedPasswordVisible
    });
  };

  editingExpirationToggle = () => {
    this.setState({ isEditingExpiration: !this.state.isEditingExpiration });
  };

  setExpType = (e) => {
    this.setState({
      expType: e.target.value
    });
  };

  onExpDateChanged = (value) => {
    this.setState({
      expDate: value
    });
  };

  onExpireDaysChanged = (e) => {
    let day = e.target.value.trim();
    this.setState({ expireDays: day });
  };

  updateExpiration = () => {
    const { sharedLinkInfo } = this.props;
    const { expType, expireDays, expDate } = this.state;
    let expirationTime = '';
    if (expType === 'by-days') {
      expirationTime = dayjs().add(parseInt(expireDays), 'days').format();
    } else {
      expirationTime = expDate.format();
    }
    shareLinkAPI.updateShareLink(sharedLinkInfo.token, '', expirationTime).then((res) => {
      this.setState({
        isEditingExpiration: false
      });
      this.props.updateLink(new ShareLink(res.data));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  changePerm = (permOption) => {
    const { sharedLinkInfo } = this.props;
    const { permissionDetails } = Utils.getShareLinkPermissionObject(permOption);
    shareLinkAPI.updateShareLink(sharedLinkInfo.token, JSON.stringify(permissionDetails)).then((res) => {
      this.props.updateLink(new ShareLink(res.data));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleLinkDeleteDialog = () => {
    this.setState({ isLinkDeleteDialogOpen: !this.state.isLinkDeleteDialogOpen });
  };

  toggleSendLink = () => {
    this.setState({ isSendLinkShown: !this.state.isSendLinkShown });
  };

  deleteLink = () => {
    const { sharedLinkInfo } = this.props;
    const { token } = sharedLinkInfo;
    this.props.deleteLink(token);
  };

  goBack = () => {
    this.props.showLinkDetails(null);
  };

  changeScope = (scope) => {
    const { sharedLinkInfo } = this.props;
    const { token } = sharedLinkInfo;
    shareLinkAPI.updateShareLink(token, '', '', scope).then((res) => {
      this.props.updateLink(new ShareLink(res.data));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onUserAuth = () => {
    this.props.setMode('linkAuthenticatedUsers');
  };

  onEmailAuth = () => {
    this.props.setMode('linkAuthenticatedEmails');
  };

  getPermissionText = (perm) => {
    return Utils.getShareLinkPermissionObject(perm).text;
  };

  render() {
    const { sharedLinkInfo, permissionOptions } = this.props;
    const { user_scope: currentScope } = sharedLinkInfo;
    const currentPermission = Utils.getShareLinkPermissionStr(sharedLinkInfo.permissions);
    return (
      <div>
        <div className="d-flex align-items-center pb-2 border-bottom">
          <h6 className="font-weight-normal m-0 d-flex align-items-center">
            <BackIcon onClick={this.goBack} />
            {gettext('Link')}
          </h6>
        </div>
        <dl>
          <dt className="text-secondary font-weight-normal">{gettext('Link')}</dt>
          <dd>
            <SharedLink
              link={sharedLinkInfo.link}
              linkExpired={sharedLinkInfo.is_expired}
              copyLink={this.onCopySharedLink}
            />
          </dd>
          {!sharedLinkInfo.is_dir && sharedLinkInfo.permissions.can_download && sharedLinkInfo.show_download_link && ( // just for file
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Direct download link')}</dt>
              <dd>
                <SharedLink
                  link={`${sharedLinkInfo.download_link}?op=view`}
                  linkExpired={sharedLinkInfo.is_expired}
                  copyLink={this.onCopyDownloadLink}
                />
              </dd>
            </>
          )}
          {sharedLinkInfo.password && (
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Password')}</dt>
              <dd>
                <InputGroup className="share-link-details-item">
                  {this.state.storedPasswordVisible ?
                    <Input type="text" readOnly={true} value={sharedLinkInfo.password} /> :
                    <Input type="text" readOnly={true} value={'***************'} />
                  }
                  <Button
                    aria-label={this.state.storedPasswordVisible ? gettext('Hide') : gettext('Show')}
                    onClick={this.toggleStoredPasswordVisible}
                    className="link-operation-icon eye-icon"
                  >
                    <Icon symbol={this.state.storedPasswordVisible ? 'eye' : 'eye-slash'} />
                  </Button>
                </InputGroup>
              </dd>
            </>
          )}
          {sharedLinkInfo.expire_date && (
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Expiration date')}</dt>
              <dd>
                {this.state.isEditingExpiration ? (
                  <div className="ml-4">
                    <SetLinkExpiration
                      minDays={shareLinkExpireDaysMin}
                      maxDays={shareLinkExpireDaysMax}
                      defaultDays={shareLinkExpireDaysDefault}
                      expType={this.state.expType}
                      setExpType={this.setExpType}
                      expireDays={this.state.expireDays}
                      onExpireDaysChanged={this.onExpireDaysChanged}
                      expDate={this.state.expDate}
                      onExpDateChanged={this.onExpDateChanged}
                    />
                    <div className={this.state.expType === 'by-days' ? 'mt-2' : 'mt-3'}>
                      <button className="btn btn-primary mr-2" onClick={this.updateExpiration}>{gettext('Update')}</button>
                      <button className="btn btn-secondary" onClick={this.editingExpirationToggle}>{gettext('Cancel')}</button>
                    </div>
                  </div>
                ) : (
                  <InputGroup className="share-link-details-item">
                    <Input type="text" readOnly={true} value={dayjs(sharedLinkInfo.expire_date).format('YYYY-MM-DD HH:mm:ss')} />
                    <Button
                      aria-label={gettext('Edit')}
                      title={gettext('Edit')}
                      className="link-operation-icon"
                      onClick={this.editingExpirationToggle}
                    >
                      <Icon symbol="rename" />
                    </Button>
                  </InputGroup>
                )}
              </dd>
            </>
          )}
          {sharedLinkInfo.permissions && (
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Permission')}</dt>
              <dd>
                <div className="share-link-details-item">
                  <SelectEditor
                    isTextMode={false}
                    isEditIconShow={false}
                    options={permissionOptions}
                    currentOption={currentPermission}
                    onOptionChanged={this.changePerm}
                    translateOption={this.getPermissionText}
                  />
                </div>
              </dd>
            </>
          )}
          <>
            <dt className="text-secondary font-weight-normal">{gettext('Access scope')}</dt>
            <dd className="d-flex align-items-center flex-wrap">
              <div className="share-link-details-item mr-2">
                <ShareLinkScopeEditor
                  isTextMode={false}
                  isEditIconShow={false}
                  currentScope={currentScope}
                  onScopeChanged={this.changeScope}
                />
              </div>
              {currentScope === 'specific_users' &&
              <Button color="primary" outline={true} className="border-0 p-0 link-authenticated-op" onClick={this.onUserAuth}>{gettext('Authenticated users')}</Button>
              }
              {currentScope === 'specific_emails' &&
              <Button color="primary" outline={true} className="border-0 p-0 link-authenticated-op" onClick={this.onEmailAuth}>{gettext('Authenticated emails')}</Button>
              }
            </dd>
          </>
        </dl>
        {(canSendShareLinkEmail && !this.state.isSendLinkShown) &&
        <Button onClick={this.toggleSendLink} className='mr-2'>{gettext('Send')}</Button>
        }
        {this.state.isSendLinkShown &&
          <SendLink
            linkType='shareLink'
            token={sharedLinkInfo.token}
            toggleSendLink={this.toggleSendLink}
            closeShareDialog={this.props.closeShareDialog}
          />
        }
        {(!this.state.isSendLinkShown) &&
        <Button onClick={this.toggleLinkDeleteDialog}>{gettext('Delete')}</Button>
        }
        {this.state.isLinkDeleteDialogOpen &&
        <CommonOperationConfirmationDialog
          title={gettext('Delete share link')}
          message={gettext('Are you sure you want to delete the share link?')}
          executeOperation={this.deleteLink}
          confirmBtnText={gettext('Delete')}
          toggleDialog={this.toggleLinkDeleteDialog}
        />
        }
      </div>
    );
  }
}

LinkDetails.propTypes = propTypes;

export default LinkDetails;
