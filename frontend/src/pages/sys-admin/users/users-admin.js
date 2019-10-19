import React, { Component, Fragment } from 'react';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, isEmailConfiguredInSysAdmin, sendEmailOnResettingUserPasswd, siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import { username, availableAdminRoles } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import SysAdminAdminUser from '../../../models/sysadmin-admin-user';
import SysAdminUserStatusEditor from '../../../components/select-editor/sysadmin-user-status-editor';
import SysAdminUserRoleEditor from '../../../components/select-editor/sysadmin-user-roles-editor';
import SysAdminUserSetQuotaDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-user-set-quota-dialog';
import SysAdminBatchAddAdminDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-batch-add-admin-dialog';
import CommonOperationDialog from '../../../components/dialog/common-operation-dialog';
import CommonWaitingDialog from '../../../components/dialog/common-waiting-dialog';
import UsersNav from './users-nav';
import MainPanelTopbar from '../main-panel-topbar';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
    };
  }

  render() {
    const { loading, errorMsg, items, isAllUsersSelected } = this.props;
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
                <th width="3%">
                  <input type="checkbox" className="vam" onChange={this.props.toggleSelectAllUsers} checked={isAllUsersSelected}/>
                </th>
                <th width="15%">{'ID'}{' / '}{gettext('Name')}{' / '}{gettext('Contact Email')}</th>
                <th width="10%">{gettext('Status')}</th>
                <th width="25%">{gettext('Role')}</th>
                <th width="19%">{gettext('Space Used')}{' / '}{gettext('Quota')}</th>
                <th width="19%">{gettext('Create At')}{' / '}{gettext('Last Login')}</th>
                <th width="10%">{/*Operations*/}</th>
              </tr>
            </thead>
            {items && 
              <tbody>
                {items.map((item, index) => {
                  return (<Item 
                    key={index} 
                    item={item} 
                    deleteUser={this.props.deleteUser}
                    onUserSelected={this.props.onUserSelected}
                    revokeAdmin={this.props.revokeAdmin}
                  />);
                })}
              </tbody>
            }
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
      status: this.props.item.is_active ? 'Active' : 'Inactive',
      role: this.props.item.admin_role,
      quota_total: this.props.item.quota_total,
      isActivateWaitingDialogOpen: false,
      isSetQuotaDialogOpen: false,
      isDeleteUserDialogOpen: false,
      isResetUserPasswordDialogOpen: false,
      isResetUserPasswordWaitingDialogOpen: false,
      isRevokeAdminDialogOpen: false
    };
  }

  componentWillReceiveProps () {
    // we set quota_total as state in constructor, so if value changed from props,
    // it is necessary to update state, keep state value equal to props
    this.setState({quota_total: this.props.item.quota_total});
  }

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  }

  toggleActivateWaitingDialog = () => {
    this.setState({isActivateWaitingDialogOpen: !this.state.isActivateWaitingDialogOpen});
  }

  closeActivateWaitingDialog = () => {
    this.setState({isActivateWaitingDialogOpen: false});
  }

  toggleSetQuotaDialog = () => {
    this.setState({isSetQuotaDialogOpen: !this.state.isSetQuotaDialogOpen});
  }

  toggleDeleteUserDialog = () => {
    this.setState({isDeleteUserDialogOpen: !this.state.isDeleteUserDialogOpen});
  }

  toggleResetUserPasswordDialog = () => {
    this.setState({isResetUserPasswordDialogOpen: !this.state.isResetUserPasswordDialogOpen});
  }

  closeResetUserPasswordDialog = () => {
    this.setState({isResetUserPasswordDialogOpen: false});
  }

  toggleResetUserPasswordWaitingDialog = () => {
    this.setState({isResetUserPasswordWaitingDialogOpen: !this.state.isResetUserPasswordWaitingDialogOpen});
  }

  closeResetUserPasswordWaitingDialog = () => {
    this.setState({isResetUserPasswordWaitingDialogOpen: false});
  }

  toggleRevokeAdminDialog = () => {
    this.setState({isRevokeAdminDialogOpen: !this.state.isRevokeAdminDialogOpen});
  }

  onUserSelected = () => {
    this.props.onUserSelected(this.props.item);
  }

  updateStatus = (status) => {
    if (status == 'Active') {
      this.toggleActivateWaitingDialog();
    }
    seafileAPI.sysAdminUpdateUserInfo('is_active', status == 'Active', this.props.item.email).then(res => {
      this.setState({
        status: status
      });
      this.closeActivateWaitingDialog();
      toaster.success(status == 'Active' ? gettext('Edit succeeded, an email has been sent.') : gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateRole = (role) => {
    seafileAPI.sysAdminUpdateAdminRole(this.props.item.email, role).then(res => {
      this.setState({
        role: role
      });
      toaster.success(gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateQuota = (quota) => {
    seafileAPI.sysAdminUpdateUserInfo('quota_total', quota, this.props.item.email).then(res => {
      this.setState({
        quota_total: res.data.quota_total
      });
      this.toggleSetQuotaDialog();
      toaster.success(gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    }); 
  }

  deleteUser = () => {
    this.props.deleteUser(this.props.item.email);
    this.toggleDeleteUserDialog();
  }

  resetPassword = () => {
    if (isEmailConfiguredInSysAdmin && sendEmailOnResettingUserPasswd) {
      this.toggleResetUserPasswordWaitingDialog();
    }
    seafileAPI.sysAdminResetUserPassword(this.props.item.email).then(res => {
      this.closeResetUserPasswordWaitingDialog();
      this.closeResetUserPasswordDialog();
      let msg = '';
      if (isEmailConfiguredInSysAdmin) {
        if (sendEmailOnResettingUserPasswd) {
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

  revokeAdmin = () => {
    this.props.revokeAdmin(this.props.item.email);
    this.toggleRevokeAdminDialog();
  }

  render() {
    let { status, role, quota_total, isOpIconShown, isActivateWaitingDialogOpen, isSetQuotaDialogOpen,
      isDeleteUserDialogOpen, isResetUserPasswordDialogOpen, isResetUserPasswordWaitingDialogOpen,
      isRevokeAdminDialogOpen } = this.state;
    let {item} = this.props;
    let iconVisibility = this.state.isOpIconShown ? '' : ' invisible'; 
    let pencilIconClassName = 'fa fa-pencil-alt attr-action-icon' + iconVisibility;

    let email = '<span class="op-target">' + Utils.HTMLescape(item.email) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?'.replace('{placeholder}', email));
    let resetPwdDialogMsg = gettext('Are you sure you want to reset the password of {placeholder} ?').replace('{placeholder}', email);
    let revokeDialogMsg = gettext('Are you sure you want to revoke the admin permission of {placeholder} ?').replace('{placeholder}', email);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td className={`pl10 ${this.state.isDragTipShow ? 'tr-drag-effect' : ''}`}>
            <input type="checkbox" className="vam" onChange={this.onUserSelected} checked={item.isSelected}/>
          </td>
          <td>
            <div><a href={siteRoot + 'sys/user-info/' + item.email + '/'}>{item.name}</a></div>
            <div>{item.email}</div>
          </td>
          <td>
            <SysAdminUserStatusEditor 
              isTextMode={true}
              isEditIconShow={isOpIconShown}
              currentStatus={status}
              statusOptions={['Active', 'Inactive']}
              onStatusChanged={this.updateStatus}
            />
          </td>
          <td>
            <SysAdminUserRoleEditor
              isTextMode={true}
              isEditIconShow={isOpIconShown}
              currentRole={role}
              roleOptions={availableAdminRoles}
              onRoleChanged={this.updateRole}
            />
          </td>
          <td>{Utils.bytesToSize(item.quota_usage)}{' / '}
            {quota_total >= 0 ? Utils.bytesToSize(quota_total) : '--'}
            <a href="#" title={gettext('Edit Quota')} onClick={this.toggleSetQuotaDialog}>
              <span style={{wdith:'14px', height:'14px'}} className={pencilIconClassName}></span>
            </a>
          </td>
          <td>
            <div>{moment(item.create_time).format('YYYY-MM-DD HH:mm') }{' /'}</div>
            <div>{moment(item.last_login).fromNow()}</div>
          </td>
          <td>
            {item.email != username && isOpIconShown &&
            <Fragment>
              <a href="#" title={gettext('Remove')} onClick={this.toggleDeleteUserDialog}>{gettext('Delete')}</a>
              <br/>
              <a href="#" title={gettext('Reset Password')} onClick={this.toggleResetUserPasswordDialog}>{gettext('ResetPwd')}</a>
              <br/>
              <a href="#" title={gettext('Revoke Admin')} onClick={this.toggleRevokeAdminDialog}>{gettext('Revoke Admin')}</a>
            </Fragment>
            }
          </td>
        </tr>
        {isActivateWaitingDialogOpen &&
          <CommonWaitingDialog
            toggle={this.toggleActivateWaitingDialog}
            message={gettext('Activating..., please wait')}
          />
        }
        {isSetQuotaDialogOpen &&
          <SysAdminUserSetQuotaDialog
            toggle={this.toggleSetQuotaDialog}
            onQuotaChanged={this.updateQuota}
          />
        }
        {isDeleteUserDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete User')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteUserDialog}
            executeOperation={this.deleteUser}
            confirmBtnText={gettext('Delete')}
          />
        }
        {isResetUserPasswordDialogOpen &&
          <CommonOperationDialog
            title={gettext('Password Reset')}
            message={resetPwdDialogMsg}
            toggle={this.toggleResetUserPasswordDialog}
            executeOperation={this.resetPassword}
            confirmBtnText={gettext('Reset')}
          /> 
        }
        {isResetUserPasswordWaitingDialogOpen &&
          <CommonWaitingDialog
            toggle={this.toggleResetUserPasswordWaitingDialog}
            message={gettext('Sending email..., please wait')}
          />
        }
        {isRevokeAdminDialogOpen &&
          <CommonOperationDialog
            title={gettext('Revoke Admin')}
            message={revokeDialogMsg}
            toggle={this.toggleRevokeAdminDialog}
            executeOperation={this.revokeAdmin}
            confirmBtnText={gettext('Revoke')}
          /> 
        }
      </Fragment>
    );
  }
}

class UsersAdmin extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userList: {},
      hasUserSelected: false,
      selectedUserList: [],
      isAllUsersSelected: false,
      isBatchAddAdminDialogOpen: false,
      isBatchSetQuotaDialogOpen: false,
      isBatchDeleteUserDialogOpen: false
    };
  }

  componentDidMount () {
    this.getUsersList();   // init enter the first page
  }

  toggleBatchSetQuotaDialog = () => {
    this.setState({isBatchSetQuotaDialogOpen: !this.state.isBatchSetQuotaDialogOpen});
  }

  toggleBatchDeleteUserDialog = () => {
    this.setState({isBatchDeleteUserDialogOpen: !this.state.isBatchDeleteUserDialogOpen});
  }

  toggleBatchAddAdminDialog = () => {
    this.setState({isBatchAddAdminDialogOpen: !this.state.isBatchAddAdminDialogOpen});
  }

  onUserSelected = (item) => {
    let hasUserSelected = false;
    let selectedUserList = [];
    // traverse all users, toggle its selected status
    let users = this.state.userList.map(user => {
      // toggle status
      if (user.email === item.email) {
        user.isSelected = !user.isSelected;
      }
      // update selectedUserList
      // if current user is now selected, push it to selectedUserList
      // if current user is now not selected, drop it from selectedUserList
      if (user.isSelected == true) {
        hasUserSelected = true;
        selectedUserList.push(user);
      } else {
        selectedUserList = selectedUserList.filter(thisuser => {
          return thisuser.email != user.email;
        });
      }
      return user;
    });
    // finally update state
    this.setState({
      userList: users,
      hasUserSelected: hasUserSelected,
      selectedUserList: selectedUserList,
    });
  }

  toggleSelectAllUsers = () => {
    if (this.state.isAllUsersSelected) {
      // if previous state is allSelected, toggle to not select
      let users = this.state.userList.map(user => {
        user.isSelected = false;
        return user;
      });
      this.setState({
        userList: users,
        hasUserSelected: false,
        isAllUsersSelected: false,
        selectedUserList: [],
      });
    } else {
      // if previous state is not allSelected, toggle to selectAll
      let users = this.state.userList.map(user => {
        user.isSelected = true;
        return user;
      });
      this.setState({
        userList: users,
        hasUserSelected: true,
        isAllUsersSelected: true,
        selectedUserList: users,
      });
    }
  }

  getUsersList = () => {
    seafileAPI.sysAdminListAllAdminUsers().then(res => {
      let users = res.data.admin_user_list.map(user => {return new SysAdminAdminUser(user);});
      this.setState({
        userList: users,
        loading: false
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
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

  deleteUser = (email) => {
    seafileAPI.sysAdminDeleteUser(email).then(res => {
      let newUserList = this.state.userList.filter(item => {
        return item.email != email;
      });
      this.setState({userList: newUserList});
      toaster.success(gettext('Successfully deleted {placeholder}'.replace('{placeholder}', email)));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  setUserQuotaInBatch = (quotaTotal) => {
    let emails = this.state.selectedUserList.map(user => {
      return user.email;
    });
    seafileAPI.sysAdminSetUserQuotaInBatch(emails, quotaTotal).then(res => {
      let oldUserList = this.state.userList;
      let newUserList = oldUserList.map(oldUser => {
        res.data.success.map(resultUser => {
          if (oldUser.email == resultUser.email) {
            oldUser.quota_total = resultUser.quota_total;
          }
        });
        return oldUser;
      });
      this.setState({userList: newUserList});
      this.toggleBatchSetQuotaDialog();
      toaster.success(gettext('Edit success.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteUserInBatch = () => {
    let emails = this.state.selectedUserList.map(user => {
      return user.email;
    });
    seafileAPI.sysAdminDeleteUserInBatch(emails).then(res => {
      let oldUserList = this.state.userList;
      let newUserList =  oldUserList.filter(oldUser => {
        return !res.data.success.some(deletedUser =>{
          return deletedUser.email == oldUser.email;
        });
      });
      this.setState({
        userList: newUserList,
        hasUserSelected: false
      });
      this.toggleBatchDeleteUserDialog();
      toaster.success(gettext('success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  addAdminInBatch = (emailString) => {
    seafileAPI.sysAdminAddAdminInBatch(emailString).then(res => {
      let users = res.data.new_admin_user_list.map(user => {return new SysAdminAdminUser(user);});
      let oldUserList = this.state.userList;
      let newUserList = oldUserList.concat(users);
      this.setState({
        userList: newUserList
      });
      this.toggleBatchAddAdminDialog();
      toaster.success(gettext('success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  revokeAdmin = (email) => {
    seafileAPI.sysAdminUpdateUserInfo('is_staff', false, email).then(res => {
      let newUserList = this.state.userList.filter(item => {
        return item.email != email;
      }); 
      toaster.success(gettext('Successfully revoke the admin permission of {placeholder}'.replace('{placeholder}', email)));
      this.setState({
        userList: newUserList,
        hasUserSelected: false
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    let { hasUserSelected, isBatchDeleteUserDialogOpen, isBatchSetQuotaDialogOpen, isBatchAddAdminDialogOpen } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          {hasUserSelected ? 
            <Fragment>
              <Button className="btn btn-secondary operation-item" onClick={this.toggleBatchSetQuotaDialog}>{gettext('Set quota')}</Button>
              <Button className="btn btn-secondary operation-item" onClick={this.toggleBatchDeleteUserDialog}>{gettext('Delete users')}</Button>
            </Fragment>
            :
            <Fragment>
              <Button className="btn btn-secondary operation-item" onClick={this.toggleBatchAddAdminDialog}>{gettext('Add Admin')}</Button>
            </Fragment>
          }
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <UsersNav currentItem="admin" />
            <div className="cur-view-content">
              <Content
                resetPerPage={this.resetPerPage}
                deleteUser={this.deleteUser}
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.userList}
                revokeAdmin={this.revokeAdmin}
                onUserSelected={this.onUserSelected}
                isAllUsersSelected={this.isAllUsersSelected}
                toggleSelectAllUsers={this.toggleSelectAllUsers}
                getListByPage={this.getUsersListByPage}
              />
            </div>
          </div>
        </div>
        {isBatchSetQuotaDialogOpen &&
          <SysAdminUserSetQuotaDialog
            toggle={this.toggleBatchSetQuotaDialog}
            onQuotaChanged={this.setUserQuotaInBatch}
          />
        }
        {isBatchDeleteUserDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete User')}
            message={gettext('Are you sure you want to delete the selected user(s) ?')}
            toggle={this.toggleBatchDeleteUserDialog}
            executeOperation={this.deleteUserInBatch}
            confirmBtnText={gettext('Delete')}
          />
        }
        {isBatchAddAdminDialogOpen &&
          <SysAdminBatchAddAdminDialog
            toggle={this.toggleBatchAddAdminDialog}
            addAdminInBatch={this.addAdminInBatch}
          />
        }
      </Fragment>
    );
  }
}

export default UsersAdmin;