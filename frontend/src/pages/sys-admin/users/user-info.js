import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Label, Input, Button } from 'reactstrap';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext, isPro } from '../../../utils/constants';
import toaster from '../../../components/toast';
import Loading from '../../../components/loading';
import EditIcon from '../../../components/edit-icon';
import SysAdminSetQuotaDialog from '../../../components/dialog/sysadmin-dialog/set-quota';
import SysAdminSetUploadDownloadRateLimitDialog from '../../../components/dialog/sysadmin-dialog/set-upload-download-rate-limit';
import SysAdminUpdateUserDialog from '../../../components/dialog/sysadmin-dialog/update-user';
import Selector from '../../../components/single-selector';
import { eventBus } from '../../../components/common/event-bus';
import { EVENT_BUS_TYPE } from '../../../components/common/event-bus-type';

const { twoFactorAuthEnabled, availableRoles } = window.sysadmin.pageOptions;

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      currentKey: '',
      dialogTitle: '',
      isSetQuotaDialogOpen: false,
      isSetUserUploadRateLimitDialogOpen: false,
      isSetUserDownloadRateLimitDialogOpen: false,
      isUpdateUserDialogOpen: false,
      highlight: false
    };
  }

  toggleSetQuotaDialog = () => {
    this.setState({ isSetQuotaDialogOpen: !this.state.isSetQuotaDialogOpen });
  };

  toggleSetUserUploadRateLimitDialog = () => {
    this.setState({ isSetUserUploadRateLimitDialogOpen: !this.state.isSetUserUploadRateLimitDialogOpen });
  };

  toggleSetUserDownloadRateLimitDialog = () => {
    this.setState({ isSetUserDownloadRateLimitDialogOpen: !this.state.isSetUserDownloadRateLimitDialogOpen });
  };

  updateQuota = (value) => {
    this.props.updateUser('quota_total', value);
  };

  updateUploadDownloadRateLimit = (uploadOrDownload, value) => {
    if (uploadOrDownload == 'upload') {
      this.props.updateUser('upload_rate_limit', value);
    }
    if (uploadOrDownload == 'download') {
      this.props.updateUser('download_rate_limit', value);
    }
  };

  toggleDialog = (key, dialogTitle) => {
    this.setState({
      currentKey: key,
      dialogTitle: dialogTitle,
      isUpdateUserDialogOpen: !this.state.isUpdateUserDialogOpen
    });
  };

  toggleSetNameDialog = () => {
    this.toggleDialog('name', gettext('Set Name'));
  };

  toggleSetUserLoginIDDialog = () => {
    this.toggleDialog('login_id', gettext('Set Login ID'));
  };

  toggleSetUserContactEmailDialog = () => {
    this.toggleDialog('contact_email', gettext('Set Contact Email'));
  };

  updateValue = (value) => {
    this.props.updateUser(this.state.currentKey, value);
  };

  toggleUpdateUserDialog = () => {
    this.toggleDialog('', '');
  };

  render() {
    const { loading, errorMsg } = this.props;
    const { highlight } = this.state;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const user = this.props.userInfo;
      const {
        currentKey, dialogTitle,
        isSetQuotaDialogOpen, isUpdateUserDialogOpen,
        isSetUserUploadRateLimitDialogOpen, isSetUserDownloadRateLimitDialogOpen
      } = this.state;
      return (
        <>
          <dl className="m-0">
            <dt className="info-item-heading">{gettext('Avatar')}</dt>
            <dd className="info-item-content">
              <img src={user.avatar_url} alt={user.name} width="80" className="rounded" />
            </dd>

            <dt className="info-item-heading">{gettext('User ID')}</dt>
            <dd className="info-item-content">{user.email}</dd>

            {user.org_name &&
              <>
                <dt className="info-item-heading">{gettext('Organization')}</dt>
                <dd className="info-item-content">{user.org_name}</dd>
              </>
            }

            <dt className="info-item-heading">{gettext('Name')}</dt>
            <dd className="info-item-content">
              {user.name || '--'}
              <EditIcon onClick={this.toggleSetNameDialog} />
            </dd>

            <dt className="info-item-heading">{gettext('Login ID')}</dt>
            <dd className="info-item-content">
              {user.login_id || '--'}
              <EditIcon onClick={this.toggleSetUserLoginIDDialog} />
            </dd>

            <dt className="info-item-heading">{gettext('Contact Email')}</dt>
            <dd className="info-item-content">
              {user.contact_email || '--'}
              <EditIcon onClick={this.toggleSetUserContactEmailDialog} />
            </dd>

            <dt className="info-item-heading">{gettext('Role')}</dt>
            <dd className="info-item-content">
              <Selector
                isDropdownToggleShown={highlight}
                currentSelectedOption={this.props.currentSelectedRoleOption}
                options={this.props.roleOptions}
                selectOption={this.props.updateRole}
                toggleItemFreezed={this.props.toggleItemFreezed}
              />
            </dd>

            <dt className="info-item-heading">{gettext('Space Used / Quota')}</dt>
            <dd className="info-item-content">
              {`${Utils.bytesToSize(user.quota_usage)} / ${user.quota_total > 0 ? Utils.bytesToSize(user.quota_total) : '--'}`}
              <EditIcon onClick={this.toggleSetQuotaDialog} />
            </dd>
            {isPro &&
              <>
                <dt className="info-item-heading">{gettext('Upload Rate Limit')}</dt>
                <dd className="info-item-content">
                  {user.upload_rate_limit > 0 ? user.upload_rate_limit + ' kB/s' : '--'}
                  <EditIcon onClick={this.toggleSetUserUploadRateLimitDialog} />
                </dd>
                <dt className="info-item-heading">{gettext('Download Rate Limit')}</dt>
                <dd className="info-item-content">
                  {user.download_rate_limit > 0 ? user.download_rate_limit + ' kB/s' : '--'}
                  <EditIcon onClick={this.toggleSetUserDownloadRateLimitDialog} />
                </dd>
              </>
            }
            {twoFactorAuthEnabled &&
              <>
                <dt className="info-item-heading">{gettext('Two-Factor Authentication')}</dt>
                <dd className="info-item-content">
                  {user.has_default_device ?
                    <FormGroup>
                      <p className="mb-1">{gettext('Status: enabled')}</p>
                      <Button onClick={this.props.disable2FA}>{gettext('Disable Two-Factor Authentication')}</Button>
                    </FormGroup> :
                    <FormGroup>
                      <Button disabled={true}>{gettext('Disable Two-Factor Authentication')}</Button>
                    </FormGroup>
                  }
                  <FormGroup check>
                    <Label check>
                      <Input type="checkbox" checked={user.is_force_2fa} onChange={this.props.toggleForce2fa} />
                      <span>{gettext('Force Two-Factor Authentication')}</span>
                    </Label>
                  </FormGroup>
                </dd>
              </>
            }
          </dl>
          {isSetQuotaDialogOpen &&
          <SysAdminSetQuotaDialog
            updateQuota={this.updateQuota}
            toggle={this.toggleSetQuotaDialog}
          />
          }
          {(isPro && isSetUserUploadRateLimitDialogOpen) &&
          <SysAdminSetUploadDownloadRateLimitDialog
            uploadOrDownload="upload"
            updateUploadDownloadRateLimit={this.updateUploadDownloadRateLimit}
            toggle={this.toggleSetUserUploadRateLimitDialog}
          />
          }
          {(isPro && isSetUserDownloadRateLimitDialogOpen) &&
          <SysAdminSetUploadDownloadRateLimitDialog
            uploadOrDownload="download"
            updateUploadDownloadRateLimit={this.updateUploadDownloadRateLimit}
            toggle={this.toggleSetUserDownloadRateLimitDialog}
          />
          }
          {isUpdateUserDialogOpen &&
          <SysAdminUpdateUserDialog
            dialogTitle={dialogTitle}
            value={user[currentKey]}
            updateValue={this.updateValue}
            toggleDialog={this.toggleUpdateUserDialog}
          />
          }
        </>
      );
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  updateUser: PropTypes.func.isRequired,
  userInfo: PropTypes.object.isRequired,
  disable2FA: PropTypes.func.isRequired,
  toggleForce2fa: PropTypes.func.isRequired,
  email: PropTypes.string,
};

class User extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userInfo: {}
    };
  }

  componentDidMount() {
    // avatar size: 160
    const email = decodeURIComponent(this.props.email);
    systemAdminAPI.sysAdminGetUser(email).then((res) => {
      this.setState({
        loading: false,
        userInfo: res.data
      });
      eventBus.dispatch(EVENT_BUS_TYPE.SYNC_USERNAME, res.data.name);
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  updateUser = (key, value) => {
    const email = this.state.userInfo.email;
    systemAdminAPI.sysAdminUpdateUser(email, key, value).then(res => {
      let userInfo = this.state.userInfo;
      userInfo[key] = res.data[key];
      this.setState({
        userInfo: userInfo
      });
      eventBus.dispatch(EVENT_BUS_TYPE.SYNC_USERNAME, res.data.name);
      toaster.success(gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };


  updateRole = (roleOption) => {
    this.updateUser('role', roleOption.value);
  };

  disable2FA = () => {
    const email = this.state.userInfo.email;
    systemAdminAPI.sysAdminDeleteTwoFactorAuth(email).then(res => {
      let userInfo = this.state.userInfo;
      userInfo.has_default_device = false;
      this.setState({
        userInfo: userInfo
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleForce2fa = (e) => {
    const email = this.state.userInfo.email;
    const checked = e.target.checked;
    systemAdminAPI.sysAdminSetForceTwoFactorAuth(email, checked).then(res => {
      let userInfo = this.state.userInfo;
      userInfo.is_force_2fa = checked;
      this.setState({
        userInfo: userInfo
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  translateRole = (role) => {
    switch (role) {
      case 'default':
        return gettext('Default');
      case 'guest':
        return gettext('Guest');
      default:
        return role;
    }
  };

  render() {
    const { userInfo } = this.state;
    let currentSelectedRoleOption;
    const { role: curRole } = userInfo;
    this.roleOptions = availableRoles.map(item => {
      return {
        value: item,
        text: this.translateRole(item),
        isSelected: item == curRole
      };
    });
    currentSelectedRoleOption = this.roleOptions.filter(item => item.isSelected)[0] || {
      value: curRole,
      text: this.translateRole(curRole),
      isSelected: true
    };

    return (
      <>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                userInfo={this.state.userInfo}
                roleOptions={this.roleOptions}
                currentSelectedRoleOption={currentSelectedRoleOption}
                updateRole={this.updateRole}
                updateUser={this.updateUser}
                disable2FA={this.disable2FA}
                toggleForce2fa={this.toggleForce2fa}
              />
            </div>
          </div>
        </div>
      </>
    );
  }
}

User.propTypes = {
  email: PropTypes.string,
};

export default User;
