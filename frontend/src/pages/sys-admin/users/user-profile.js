import React, { Component, Fragment } from 'react';
import { Input, Button } from 'reactstrap';
import { gettext, enableTwoFactorAuth } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import PropTypes from 'prop-types';
import Loading from '../../../components/loading';
import SysAdminUserSetNameDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-user-set-name-dialog';
import SysAdminUserSetContactEmailDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-user-set-contact-email-dialog';
import SysAdminUserSetLoginIDDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-user-set-loginid-dialog';
import SysAdminUserSetReferenceIDDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-user-set-referenceid-dialog';
import SysAdminUserSetQuotaDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-user-set-quota-dialog';
import '../../../css/system-info.css';

const { avatarURL } = window.app.config;

const propTypes = {
  email: PropTypes.string.isRequired,
  userInfo: PropTypes.object.isRequired,
  onNameChanged: PropTypes.func.isRequired,
  onContactEmailChanged: PropTypes.func.isRequired,
  onLoginIDChanged: PropTypes.func.isRequired,
  onReferenceIDChanged: PropTypes.func.isRequired,
  onQuotaChanged: PropTypes.func.isRequired
};

class UserProfile extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userInfo: {},
      isSetUserNameDialogOpen: false,
      isSetUserLoginIDDialogOpen: false,
      isSetUserContactEmailDialogOpen: false,
      isSetUserReferenceIDDialogOpen: false,
      isSetUserQuotaDialogOpen: false
    };
  }

  toggleSetUserNameDialog = () => {
    this.setState({isSetUserNameDialogOpen: !this.state.isSetUserNameDialogOpen});
  }

  toggleSetUserLoginIDDialog = () => {
    this.setState({isSetUserLoginIDDialogOpen: !this.state.isSetUserLoginIDDialogOpen});
  }

  toggleSetUserContactEmailDialog = () => {
    this.setState({isSetUserContactEmailDialogOpen: !this.state.isSetUserContactEmailDialogOpen});
  }

  toggleSetUserReferenceIDDialog = () => {
    this.setState({isSetUserReferenceIDDialogOpen: !this.state.isSetUserReferenceIDDialogOpen});
  }

  toggleSetUserQuotaDialog = () => {
    this.setState({isSetUserQuotaDialogOpen: !this.state.isSetUserQuotaDialogOpen});
  }

  onNameChanged = (name) => {
    this.props.onNameChanged(name);
    this.toggleSetUserNameDialog();
  }

  onLoginIDChanged = (loginID) => {
    this.props.onLoginIDChanged(loginID);
    this.toggleSetUserLoginIDDialog();
  }

  onContactEmailChanged = (contactEmail) => {
    this.props.onContactEmailChanged(contactEmail);
    this.toggleSetUserContactEmailDialog();
  }

  onReferenceIDChanged = (referenceID) => {
    this.props.onReferenceIDChanged(referenceID);
    this.toggleSetUserReferenceIDDialog();
  }

  onQuotaChanged = (quota) => {
    this.props.onQuotaChanged(quota);
    this.toggleSetUserQuotaDialog();
  }

  toggleForce2FA = (is_force_2fa) => {
    this.props.toggleForce2FA(is_force_2fa);
  }

  deleteVerified2FADevices = () => {
    this.props.deleteVerified2FADevices();
  }

  render() {
    let { errorMsg, isSetUserContactEmailDialogOpen, isSetUserLoginIDDialogOpen,
      isSetUserNameDialogOpen, isSetUserQuotaDialogOpen, isSetUserReferenceIDDialogOpen } = this.state;
    let { email, name, login_id, contact_email, reference_id, quota_usage, quota_total, is_force_2fa,
      has_default_device } = this.props.userInfo;

    if (!this.props.userInfo) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      return (
        <Fragment>
          <div className="info-item">
            <h4 className="info-item-heading">{gettext('Avatar')}</h4>
            <img src={avatarURL} width="80" height="80" alt="" className="user-avatar" />
          </div>
          <div className="info-item">
            <h4 className="info-item-heading">{gettext('Email')}</h4>
            <span>{email}</span>
          </div>
          <div className="info-item">
            <h4 className="info-item-heading">{gettext('Name')}</h4>
            <span>{name ? name : '--'}</span>
            <span onClick={this.toggleSetUserNameDialog} title={gettext('Edit')} style={{wdith:'14px', height:'14px'}} className="fa fa-pencil-alt attr-action-icon"></span>
          </div>
          <div className="info-item">
            <h4 className="info-item-heading">{gettext('Login ID')}</h4>
            <span>{login_id ? login_id : '--'}</span>
            <span onClick={this.toggleSetUserLoginIDDialog} title={gettext('Edit')} style={{wdith:'14px', height:'14px'}} className="fa fa-pencil-alt attr-action-icon"></span>
          </div>
          <div className="info-item">
            <h4 className="info-item-heading">{gettext('Contact Email')}</h4>
            <span>{contact_email ? contact_email : '--'}</span>
            <span onClick={this.toggleSetUserContactEmailDialog} title={gettext('Edit')} style={{wdith:'14px', height:'14px'}} className="fa fa-pencil-alt attr-action-icon"></span>
          </div>
          <div className="info-item">
            <h4 className="info-item-heading">{gettext('Reference ID')}</h4>
            <span>{reference_id ? reference_id : '--'}</span>
            <span onClick={this.toggleSetUserReferenceIDDialog} title={gettext('Edit')} style={{wdith:'14px', height:'14px'}} className="fa fa-pencil-alt attr-action-icon"></span>
          </div>
          <div className="info-item">
            <h4 className="info-item-heading">{gettext('Space Used')}{' / '}{gettext('Quota')}</h4>
            {Utils.bytesToSize(quota_usage)}{' / '}
            {quota_total >= 0 ? Utils.bytesToSize(quota_total) : '--'}
            <span onClick={this.toggleSetUserQuotaDialog} title={gettext('Edit Quota')} style={{wdith:'14px', height:'14px'}} className="fa fa-pencil-alt attr-action-icon"></span>
          </div>
          {enableTwoFactorAuth &&
          <div className="info-item">
            <h4 className="info-item-heading">{gettext('Two-Factor Authentication')}</h4>
            <Button color="primary" disabled={!has_default_device} onClick={this.deleteVerified2FADevices}>{gettext('Disable Two-Factor Authentication')}</Button>
            <br/>
            <label><Input className="ml-0" type="checkbox" onChange={() => {this.toggleForce2FA(!is_force_2fa)}} checked={is_force_2fa ? true : false} />{gettext('Force Two-Factor Authentication')}</label>
          </div>
          }
          {isSetUserNameDialogOpen &&
            <SysAdminUserSetNameDialog
              toggle={this.toggleSetUserNameDialog}
              onNameChanged={this.onNameChanged}
            />
          }
          {isSetUserContactEmailDialogOpen &&
            <SysAdminUserSetContactEmailDialog
              toggle={this.toggleSetUserContactEmailDialog}
              onContactEmailChanged={this.onContactEmailChanged}
            />
          }
          {isSetUserLoginIDDialogOpen &&
            <SysAdminUserSetLoginIDDialog
              toggle={this.toggleSetUserLoginIDDialog}
              onLoginIDChanged={this.onLoginIDChanged}
            />
          }
          {isSetUserReferenceIDDialogOpen &&
            <SysAdminUserSetReferenceIDDialog
              toggle={this.toggleSetUserReferenceIDDialog}
              onReferenceIDChanged={this.onReferenceIDChanged}
            />
          }
          {isSetUserQuotaDialogOpen &&
            <SysAdminUserSetQuotaDialog
              toggle={this.toggleSetUserQuotaDialog}
              onQuotaChanged={this.onQuotaChanged}
            />
          }
        </Fragment>
      );
    }
  }
}

UserProfile.propTypes = propTypes;

export default UserProfile;