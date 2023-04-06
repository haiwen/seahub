import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import copy from 'copy-to-clipboard';
import { Button } from 'reactstrap';
import { isPro, gettext, shareLinkExpireDaysMin, shareLinkExpireDaysMax, shareLinkExpireDaysDefault, canSendShareLinkEmail } from '../../utils/constants';
import ShareLinkPermissionEditor from '../../components/select-editor/share-link-permission-editor';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import ShareLink from '../../models/share-link';
import toaster from '../toast';
import SendLink from '../send-link';
import SharedLink from '../shared-link';
import SetLinkExpiration from '../set-link-expiration';

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
  closeShareDialog: PropTypes.func.isRequired
};

class LinkDetails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      storedPasswordVisible: false,
      isEditingExpiration: false,
      isExpirationEditIconShow: false,
      expType: 'by-days',
      expireDays: this.props.defaultExpireDays,
      expDate: null,
      isOpIconShown: false,
      isNoticeMessageShow: false,
      isSendLinkShown: false
    };
  }

  onCopySharedLink = () => {
    const { sharedLinkInfo } = this.props;
    copy(sharedLinkInfo.link);
    toaster.success(gettext('Share link is copied to the clipboard.'));
  }

  onCopyDownloadLink = () => {
    const { sharedLinkInfo } = this.props;
    copy(`${sharedLinkInfo.link}?dl=1`);
    toaster.success(gettext('Direct download link is copied to the clipboard.'));
  }

  toggleStoredPasswordVisible = () => {
    this.setState({
      storedPasswordVisible: !this.state.storedPasswordVisible
    });
  }

  handleMouseOverExpirationEditIcon = () => {
    this.setState({isExpirationEditIconShow: true});
  }

  handleMouseOutExpirationEditIcon = () => {
    this.setState({isExpirationEditIconShow: false});
  }

  editingExpirationToggle = () => {
    this.setState({isEditingExpiration: !this.state.isEditingExpiration});
  }

  setExpType = (e) => {
    this.setState({
      expType: e.target.value
    });
  }

  onExpDateChanged = (value) => {
    this.setState({
      expDate: value
    });
  }

  onExpireDaysChanged = (e) => {
    let day = e.target.value.trim();
    this.setState({expireDays: day});
  }

  updateExpiration = () => {
    const { sharedLinkInfo } = this.props;
    const { expType, expireDays, expDate } = this.state;
    let expirationTime = '';
    if (expType == 'by-days') {
      expirationTime = moment().add(parseInt(expireDays), 'days').format();
    } else {
      expirationTime = expDate.format();
    }
    seafileAPI.updateShareLink(sharedLinkInfo.token, '', expirationTime).then((res) => {
      this.setState({
        isEditingExpiration: false
      });
      this.props.updateLink(new ShareLink(res.data));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  }

  changePerm = (permission) => {
    const { sharedLinkInfo } = this.props;
    const { permissionDetails } = Utils.getShareLinkPermissionObject(permission);
    seafileAPI.updateShareLink(sharedLinkInfo.token, JSON.stringify(permissionDetails)).then((res) => {
      this.props.updateLink(new ShareLink(res.data));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onNoticeMessageToggle = () => {
    this.setState({isNoticeMessageShow: !this.state.isNoticeMessageShow});
  }

  toggleSendLink = () => {
    this.setState({ isSendLinkShown: !this.state.isSendLinkShown });
  }

  goBack = () => {
    this.props.showLinkDetails(null);
  }

  render() {
    const { sharedLinkInfo, permissionOptions } = this.props;
    const { isOpIconShown } = this.state;
    const currentPermission = Utils.getShareLinkPermissionStr(sharedLinkInfo.permissions);
    return (
      <div>
        <button className="fa fa-arrow-left back-icon border-0 bg-transparent text-secondary p-0" onClick={this.goBack} title={gettext('Back')} aria-label={gettext('Back')}></button>
        <dl>
          <dt className="text-secondary font-weight-normal">{gettext('Link:')}</dt>
          <dd>
            <SharedLink
              link={sharedLinkInfo.link}
              linkExpired={sharedLinkInfo.is_expired}
              copyLink={this.onCopySharedLink}
            />
          </dd>
          {!sharedLinkInfo.is_dir && sharedLinkInfo.permissions.can_download && ( // just for file
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Direct Download Link:')}</dt>
              <dd>
                <SharedLink
                  link={`${sharedLinkInfo.link}?dl=1`}
                  linkExpired={sharedLinkInfo.is_expired}
                  copyLink={this.onCopyDownloadLink}
                />
              </dd>
            </>
          )}
          {sharedLinkInfo.password && (
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Password:')}</dt>
              <dd className="d-flex">
                <div className="d-flex align-items-center">
                  <input id="stored-password" className="border-0 mr-1" type="text" value={this.state.storedPasswordVisible ? sharedLinkInfo.password : '****************************************'} readOnly={true} size={Math.max(sharedLinkInfo.password.length, 10)} />
                  <span tabIndex="0" role="button" aria-label={this.state.storedPasswordVisible ? gettext('Hide') : gettext('Show')} onKeyDown={this.onIconKeyDown} onClick={this.toggleStoredPasswordVisible} className={`eye-icon fas ${this.state.storedPasswordVisible ? 'fa-eye': 'fa-eye-slash'}`}></span>
                </div>
              </dd>
            </>
          )}
          {sharedLinkInfo.expire_date && (
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Expiration Date:')}</dt>
              {!this.state.isEditingExpiration &&
              <dd style={{width:'250px'}} onMouseEnter={this.handleMouseOverExpirationEditIcon} onMouseLeave={this.handleMouseOutExpirationEditIcon}>
                {moment(sharedLinkInfo.expire_date).format('YYYY-MM-DD HH:mm:ss')}
                {this.state.isExpirationEditIconShow && (
                  <a href="#"
                    role="button"
                    aria-label={gettext('Edit')}
                    title={gettext('Edit')}
                    className="fa fa-pencil-alt attr-action-icon"
                    onClick={this.editingExpirationToggle}>
                  </a>
                )}
              </dd>
              }
              {this.state.isEditingExpiration &&
              <dd>
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
                  <div className={this.state.expType == 'by-days' ? 'mt-2' : 'mt-3'}>
                    <button className="btn btn-primary mr-2" onClick={this.updateExpiration}>{gettext('Update')}</button>
                    <button className="btn btn-secondary" onClick={this.editingExpirationToggle}>{gettext('Cancel')}</button>
                  </div>
                </div>
              </dd>
              }
            </>
          )}
          {(isPro && sharedLinkInfo.permissions) && (
            <>
              <dt className="text-secondary font-weight-normal">{gettext('Permission:')}</dt>
              <dd style={{width:'250px'}} onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
                <ShareLinkPermissionEditor
                  isTextMode={true}
                  isEditIconShow={isOpIconShown && !sharedLinkInfo.is_expired}
                  currentPermission={currentPermission}
                  permissionOptions={permissionOptions}
                  onPermissionChanged={this.changePerm}
                />
              </dd>
            </>
          )}
        </dl>
        {(canSendShareLinkEmail && !this.state.isSendLinkShown && !this.state.isNoticeMessageShow) &&
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
        {(!this.state.isSendLinkShown && !this.state.isNoticeMessageShow) &&
        <Button onClick={this.onNoticeMessageToggle}>{gettext('Delete')}</Button>
        }
        {this.state.isNoticeMessageShow &&
        <div className="alert alert-warning">
          <h4 className="alert-heading">{gettext('Are you sure you want to delete the share link?')}</h4>
          <p className="mb-4">{gettext('If the share link is deleted, no one will be able to access it any more.')}</p>
          <button className="btn btn-primary" onClick={this.props.deleteLink}>{gettext('Delete')}</button>{' '}
          <button className="btn btn-secondary" onClick={this.onNoticeMessageToggle}>{gettext('Cancel')}</button>
        </div>
        }
      </div>
    );
  }
}

LinkDetails.propTypes = propTypes;

export default LinkDetails;
