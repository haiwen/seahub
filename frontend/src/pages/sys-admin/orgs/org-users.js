import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext, isEmailConfiguredInSysAdminOrg, sendEmailOnResettingOrgUserPasswd } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import OrgNav from './org-nav';
import MainPanelTopbar from '../main-panel-topbar';
import SysAdminUserStatusEditor from '../../../components/select-editor/sysadmin-user-status-editor';
import SysAdminAddUserDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-user-dialog';
import CommonOperationDialog from '../../../components/dialog/common-operation-dialog';
import CommonWaitingDialog from '../../../components/dialog/common-waiting-dialog';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No users')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="20%">{gettext('Email')}</th>
                <th width="10%">{gettext('Status')}</th>
                <th width="20%">{gettext('Space Used')}</th>
                <th width="30%">{gettext('Created At')}{' / '}{gettext('Last Login')}</th>
                <th width="20%">{gettext('Operations')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  availableRoles={this.props.availableRoles}
                  updateStatus={this.props.updateStatus}
                  deleteUser={this.props.deleteUser}
                />);
              })}
            </tbody>
          </table>
        </Fragment>
      );
      return items.length ? table : emptyTip; 
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      isDeleteDialogOpen: false,
      isResetPasswordDialogOpen: false,
      isResetPasswordWaitingDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseLeave = () => {
    this.setState({isOpIconShown: false});
  }

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  toggleResetPasswordDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isResetPasswordDialogOpen: !this.state.isResetPasswordDialogOpen});
  }

  closeResetPasswordDialog = () => {
    this.setState({isResetPasswordDialogOpen: false});
  }

  toggleResetPasswordWaitingDialog = () => {
    this.setState({isResetPasswordWaitingDialogOpen: !this.state.isResetPasswordWaitingDialogOpen});
  }

  closeResetPasswordWaitingDialog = () => {
    this.setState({isResetPasswordWaitingDialogOpen: false});
  }

  updateStatus= (status) => {
    this.props.updateStatus(this.props.item.email, status);
  }

  deleteUser = () => {
    this.toggleDeleteDialog();
    this.props.deleteUser(this.props.item.org_id, this.props.item.email);
  }

  resetPassword = () => {
    if (isEmailConfiguredInSysAdminOrg && sendEmailOnResettingOrgUserPasswd) {
      this.toggleResetPasswordWaitingDialog();
    }
    seafileAPI.sysAdminResetUserPassword(this.props.item.email).then(res => {
      this.closeResetPasswordWaitingDialog();
      this.closeResetPasswordDialog();
      let msg = '';
      if (isEmailConfiguredInSysAdminOrg) {
        if (sendEmailOnResettingOrgUserPasswd) {
          msg = gettext('Successfully reset password to {placeholder_password}, an email has been sent to {placeholder_user}.');
        } else {
          msg = gettext('Successfully reset password to {placeholder_password} for user {placeholder_user}.');
        }
      } else {
        msg = gettext('Successfully reset password to {placeholder_password} for user {placeholder_user}. But email notification can not be sent, because Email service is not properly configured.');
      }
      msg = msg.replace('{placeholder_password}', res.data.new_password)
        .replace('{placeholder_user}', this.props.item.email);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    }); 
  }

  render() {
    let { item } = this.props;
    let { isOpIconShown, isDeleteDialogOpen, isResetPasswordDialogOpen, isResetPasswordWaitingDialogOpen} = this.state;
    let status = item.active ? 'Active' : 'Inactive';

    let userEmail = '<span class="op-target">' + Utils.HTMLescape(item.email) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?'.replace('{placeholder}', userEmail));
    let resetPasswordDialogMsg = gettext('Are you sure you want to reset the password of {placeholder} ?').replace('{placeholder}', userEmail);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><a href={siteRoot + 'sys/user-info/' + item.email + '/'}>{item.email}</a></td>
          <td>
            <SysAdminUserStatusEditor
              isTextMode={true}
              isEditIconShow={isOpIconShown}
              currentStatus={status}
              statusOptions={['Active', 'Inactive']}
              onStatusChanged={this.updateStatus}
            />
          </td>
          <td>{Utils.bytesToSize(item.quota_usage)}</td>
          <td>
            <span className="item-meta-info">
              {moment(item.ctime).format('YYYY-MM-DD hh:mm:ss')}{' / '}{item.last_login ? moment(item.last_login).fromNow() : '--'}
            </span>
          </td>
          <td>
            {isOpIconShown &&
            <Fragment>
              <a href="#" title={gettext('Remove')} onClick={this.toggleDeleteDialog}>{gettext('Delete')}</a>
              <a href="#" className="ml-2" title={gettext('Reset Password')} onClick={this.toggleResetPasswordDialog}>{gettext('ResetPwd')}</a>
            </Fragment>
            }
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete User')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteDialog}
            executeOperation={this.deleteUser}
            confirmBtnText={gettext('Delete')}
          />
        }
        {isResetPasswordDialogOpen &&
          <CommonOperationDialog
            title={gettext('Password Reset')}
            message={resetPasswordDialogMsg}
            toggle={this.toggleDeleteDialog}
            executeOperation={this.resetPassword}
            confirmBtnText={gettext('Reset')}
          />
        }
        {isResetPasswordWaitingDialogOpen &&
          <CommonWaitingDialog
            toggle={this.toggleResetPasswordWaitingDialog}
            message={gettext('Sending email..., please wait')}
          />
        }
      </Fragment>
    );
  }
}

class OrgUsers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userList: [],
      availableRoles: [],
      isAddUserDialogOpen: false,
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListAllOrgUsers(this.props.orgID).then((res) => {
      this.setState({
        loading: false,
        userList: res.data.users,
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          }); 
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          }); 
        }   
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  toggleAddUserDialog = () => {
    this.setState({isAddUserDialogOpen: !this.state.isAddUserDialogOpen});
  }

  addUser = (newUserInfo) => {
    let { email, name, password } = newUserInfo;
    seafileAPI.sysAdminAddUserOfOrg(this.props.orgID, email, name, password).then(res => {
      let userList = this.state.userList;
      userList.push(res.data);
      this.setState({userList: userList});
      this.toggleAddUserDialog();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteUser = (orgID, email) => {
    seafileAPI.sysAdminDeleteOrgUser(orgID, email).then(res => {
      let newUserList = this.state.userList.filter(item => {
        return item.email != email;
      });
      this.setState({userList: newUserList});
      toaster.success(gettext('Successfully deleted {placeholder}').replace('{placeholder}', email));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateStatus = (email, status) => {
    let active = status === 'Active';
    seafileAPI.sysAdminUpdateOrgUserInfo(this.props.orgID, email, 'active', active).then(res => {
      let newUserList = this.state.userList.map(org => {
        if (org.email === email) {
          org.active = active;
        }
        return org;
      });
      this.setState({userList: newUserList});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let { isAddUserDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddUserDialog}>{gettext('Add user')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgNav currentItem="users" orgID={this.props.orgID} />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.userList}
                updateStatus={this.updateStatus}
                deleteUser={this.deleteUser}
              />
            </div>
          </div>
        </div>
        {isAddUserDialogOpen &&
          <SysAdminAddUserDialog
            toggle={this.toggleAddUserDialog}
            addUser={this.addUser}
          />
        }
      </Fragment>
    );
  }
}

export default OrgUsers;
