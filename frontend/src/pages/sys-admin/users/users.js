import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import { Button } from 'reactstrap';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { isPro, username, gettext, multiInstitution, siteRoot, loginUrl } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import SysAdminUserStatusEditor from '../../../components/select-editor/sysadmin-user-status-editor';
import SysAdminUserRoleEditor from '../../../components/select-editor/sysadmin-user-role-editor';
import SelectEditor from '../../../components/select-editor/select-editor';
import SysAdminUserSetQuotaDialog from '../../../components/dialog/sysadmin-dialog/set-quota';
import SysAdminImportUserDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-import-user-dialog';
import SysAdminAddUserDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-user-dialog';
import SysAdminBatchAddAdminDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-batch-add-admin-dialog';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import SysAdminUser from '../../../models/sysadmin-user';
import SysAdminAdminUser from '../../../models/sysadmin-admin-user';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import UsersNav from './users-nav';
import OpMenu from './user-op-menu';

const { availableRoles, availableAdminRoles, institutions } = window.sysadmin.pageOptions;

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  }

  render() {
    const { isAdmin, loading, errorMsg, items, pageInfo, isAllUsersSelected, curPerPage, hasNextPage, currentPage } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No users')}</h2>
        </EmptyTip>
      );

      let columns = [];
      const colNameText = `${gettext('Name')} / ${gettext('Contact Email')}`;
      const colSpaceText = `${gettext('Space Used')} / ${gettext('Quota')}`;
      const colCreatedText = `${gettext('Created At')} / ${gettext('Last Login')}`;
      if (isPro) {
        columns.push(
          {width: '20%', text: colNameText},
          {width: '15%', text: gettext('Status')},
          {width: '15%', text: gettext('Role')}
        );
      } else {
        columns.push(
          {width: '30%', text: colNameText},
          {width: '20%', text: gettext('Status')}
        );
      }
      if (multiInstitution && !isAdmin) {
        columns.push(
          {width: '14%', text: colSpaceText},
          {width: '14%', text: gettext('Institution')},
          {width: '14%', text: colCreatedText},
          {width: '5%', text: ''}
        );
      } else {
        columns.push(
          {width: '20%', text: colSpaceText},
          {width: '22%', text: colCreatedText},
          {width: '5%', text: ''}
        );
      }

      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="3%" className="pl-2">
                  <input type="checkbox" className="vam" onChange={this.props.toggleSelectAllUsers} checked={isAllUsersSelected} />
                </th>
                {columns.map((item, index) => {
                  return <th width={item.width} key={index}>{item.text}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                  updateUser={this.props.updateUser}
                  deleteUser={this.props.deleteUser}
                  updateAdminRole={this.props.updateAdminRole}
                  revokeAdmin={this.props.revokeAdmin}
                  onUserSelected={this.props.onUserSelected}
                  isAdmin={this.props.isAdmin}
                  isLDAPImported={this.props.isLDAPImported}
                />);
              })}
            </tbody>
          </table>
          {!this.props.isAdmin &&
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            canResetPerPage={true}
            curPerPage={curPerPage}
            resetPerPage={this.props.resetPerPage}
          />
          }
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
      highlight: false,
      isSetQuotaDialogOpen: false,
      isDeleteUserDialogOpen: false,
      isResetUserPasswordDialogOpen: false,
      isRevokeAdminDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  }

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    } 
  }

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
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

  toggleRevokeAdminDialog = () => {
    this.setState({isRevokeAdminDialogOpen: !this.state.isRevokeAdminDialogOpen});
  }

  onUserSelected = () => {
    this.props.onUserSelected(this.props.item);
  }

  updateStatus= (value) => {
    const isActive = value == 'active';
    if (isActive) {
      toaster.notify(gettext('It may take some time, please wait.'));
    }
    this.props.updateUser(this.props.item.email, 'is_active', isActive);
  }

  updateRole = (value) => {
    this.props.updateUser(this.props.item.email, 'role', value);
  }

  updateAdminRole = (value) => {
    this.props.updateAdminRole(this.props.item.email, value);
  }

  translateAdminRole = (role) => {
    switch (role) {
      case 'default_admin':
        return gettext('Default Admin');
      case 'system_admin':
        return gettext('System Admin');
      case 'daily_admin':
        return gettext('Daily Admin');
      case 'audit_admin':
        return gettext('Audit Admin');
      default:
        return role;
    }   
  }

  updateInstitution = (value) => {
    this.props.updateUser(this.props.item.email, 'institution', value);
  }

  translateInstitution = (inst) => {
    return inst;
  }

  updateQuota = (value) => {
    this.props.updateUser(this.props.item.email, 'quota_total', value);
  }

  deleteUser = () => {
    this.props.deleteUser(this.props.item.email);
  }

  resetPassword = () => {
    seafileAPI.sysAdminResetUserPassword(this.props.item.email).then(res => {
      toaster.success(res.data.reset_tip);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    }); 
  }

  revokeAdmin = () => {
    const { item } = this.props;
    this.props.revokeAdmin(item.email, item.name);
  }

  getMenuOperations = () => {
    const { isAdmin, isLDAPImported } = this.props;
    let list = ['Delete'];
    if (!isLDAPImported) {
      list.push('Reset Password');
    }
    if (isAdmin) {
      list = ['Revoke Admin'];
    }
    return list;
  }

  translateOperations = (item) => {
    let translateResult = ''; 
    switch (item) {
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Reset Password':
        translateResult = gettext('Reset Password');
        break;
      case 'Revoke Admin':
        translateResult = gettext('Revoke Admin');
        break;
    }   

    return translateResult;
  }

  onMenuItemClick = (operation) => {
    switch(operation) {
      case 'Delete':
        this.toggleDeleteUserDialog();
        break;
      case 'Reset Password':
        this.toggleResetUserPasswordDialog();
        break;
      case 'Revoke Admin':
        this.toggleRevokeAdminDialog();
        break;
      default:
        break;
    }
  }

  render() {
    const { item, isAdmin } = this.props;
    const { 
      isOpIconShown, 
      isSetQuotaDialogOpen,
      isDeleteUserDialogOpen,
      isResetUserPasswordDialogOpen,
      isRevokeAdminDialogOpen
    } = this.state;

    const itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    const deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', itemName);
    const resetPasswordDialogMsg = gettext('Are you sure you want to reset the password of {placeholder} ?').replace('{placeholder}', itemName);
    const revokeAdminDialogMsg = gettext('Are you sure you want to revoke the admin permission of {placeholder} ?').replace('{placeholder}', itemName);

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td className="pl-2">
            <input type="checkbox" className="vam" onChange={this.onUserSelected} checked={item.isSelected} />
          </td>
          <td>
            <UserLink email={item.email} name={item.name} />
            {item.contact_email && 
              <Fragment>
                <br />
                {item.contact_email}
              </Fragment>}
            {item.org_id && 
              <Fragment>
                <br />
                <Link to={`${siteRoot}sys/organizations/${item.org_id}/info/`}>({item.org_name})</Link>
              </Fragment>
            }
          </td>
          <td>
            <SysAdminUserStatusEditor 
              isTextMode={true}
              isEditIconShow={isOpIconShown}
              currentStatus={item.is_active ? 'active' : 'inactive'}
              statusOptions={['active', 'inactive']}
              onStatusChanged={this.updateStatus}
            />
          </td>
          {isPro && 
          <td>
            {isAdmin ?
              <SelectEditor
                isTextMode={true}
                isEditIconShow={isOpIconShown}
                options={availableAdminRoles}
                currentOption={item.admin_role}
                onOptionChanged={this.updateAdminRole}
                translateOption={this.translateAdminRole}
              /> :
              <SysAdminUserRoleEditor
                isTextMode={true}
                isEditIconShow={isOpIconShown}
                currentRole={item.role}
                roleOptions={availableRoles}
                onRoleChanged={this.updateRole}
              />
            }
          </td>
          }
          <td>
            {`${Utils.bytesToSize(item.quota_usage)} / ${item.quota_total > 0 ? Utils.bytesToSize(item.quota_total) : '--'}`}
            <span
              title={gettext('Edit')}
              className={`fa fa-pencil-alt attr-action-icon ${isOpIconShown ? '' : 'invisible'}`}
              onClick={this.toggleSetQuotaDialog}>
            </span>
          </td>
          {(multiInstitution && !isAdmin) &&
            <td>
              <SelectEditor
                isTextMode={true}
                isEditIconShow={isOpIconShown && institutions.length > 0}
                options={institutions}
                currentOption={item.institution}
                onOptionChanged={this.updateInstitution}
                translateOption={this.translateInstitution}
              />
            </td>
          }
          <td>
            {`${item.create_time ? moment(item.create_time).format('YYYY-MM-DD HH:mm') : '--'} /`}
            <br />
            {`${item.last_login ? moment(item.last_login).fromNow() : '--'}`}
          </td>
          <td>
            {(item.email != username && isOpIconShown) &&
            <OpMenu
              operations={this.getMenuOperations()}
              translateOperations={this.translateOperations}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
            }
          </td>
        </tr>
        {isSetQuotaDialogOpen &&
          <SysAdminUserSetQuotaDialog
            toggle={this.toggleSetQuotaDialog}
            updateQuota={this.updateQuota}
          />
        }
        {isDeleteUserDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Delete User')}
            message={deleteDialogMsg}
            executeOperation={this.deleteUser}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteUserDialog}
          />
        }
        {isResetUserPasswordDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Reset Password')}
            message={resetPasswordDialogMsg}
            executeOperation={this.resetPassword}
            confirmBtnText={gettext('Reset')}
            toggleDialog={this.toggleResetUserPasswordDialog}
          /> 
        }
        {isRevokeAdminDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Revoke Admin')}
            message={revokeAdminDialogMsg}
            executeOperation={this.revokeAdmin}
            confirmBtnText={gettext('Revoke')}
            toggleDialog={this.toggleRevokeAdminDialog}
          /> 
        }
      </Fragment>
    );
  }
}


class Users extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userList: [],
      totalItemCount: 0,
      hasNextPage: false,
      currentPage: 1,
      perPage: 25,
      hasUserSelected: false,
      selectedUserList: [],
      isAllUsersSelected: false,
      isImportUserDialogOpen: false,
      isAddUserDialogOpen: false,
      isBatchSetQuotaDialogOpen: false,
      isBatchDeleteUserDialogOpen: false,
      isBatchAddAdminDialogOpen: false
    };
  }

  componentDidMount () {
    if (this.props.isAdmin) { // 'Admin' page
      this.getUserList(); // no pagination
    } else {
      this.getUsersListByPage(1);
    }
  }

  toggleImportUserDialog = () => {
    this.setState({isImportUserDialogOpen: !this.state.isImportUserDialogOpen});
  }

  toggleAddUserDialog = () => {
    this.setState({isAddUserDialogOpen: !this.state.isAddUserDialogOpen});
  }

  toggleBatchSetQuotaDialog = () => {
    this.setState({isBatchSetQuotaDialogOpen: !this.state.isBatchSetQuotaDialogOpen});
  }

  toggleBatchDeleteUserDialog = () => {
    this.setState({isBatchDeleteUserDialogOpen: !this.state.isBatchDeleteUserDialogOpen});
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
        selectedUserList: users
      });
    }
  }

  getUserList = () => {
  // get admins
    seafileAPI.sysAdminListAdmins().then(res => {
      let users = res.data.admin_user_list.map(user => {
        return new SysAdminAdminUser(user);
      });
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

  getUsersListByPage = (page) => {
    let { perPage } = this.state;
    seafileAPI.sysAdminListUsers(page, perPage, this.props.isLDAPImported).then(res => {
      let users = res.data.data.map(user => {return new SysAdminUser(user);});
      this.setState({
        userList: users,
        loading: false,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.total_count),
        currentPage: page
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
      toaster.success(gettext('Successfully deleted 1 item.'));
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
      let userList = this.state.userList.map(item => {
        res.data.success.map(resultUser => {
          if (item.email == resultUser.email) {
            item.quota_total = resultUser.quota_total;
          }
        });
        return item;
      });
      this.setState({userList: userList});
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
      if (res.data.success.length) {
        let oldUserList = this.state.userList;
        let newUserList = oldUserList.filter(oldUser => {
          return !res.data.success.some(deletedUser =>{
            return deletedUser.email == oldUser.email;
          });
        });
        this.setState({
          userList: newUserList,
          hasUserSelected: emails.length != res.data.success.length
        });
        const length = res.data.success.length;
        const msg = length == 1 ?
          gettext('Successfully deleted 1 user.') :
          gettext('Successfully deleted {user_number_placeholder} users.')
            .replace('{user_number_placeholder}', length);
        toaster.success(msg);
      }
      res.data.failed.map(item => {
        const msg = `${item.email}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  importUserInBatch = (file) => {
    toaster.notify(gettext('It may take some time, please wait.'));
    seafileAPI.sysAdminImportUserViaFile(file).then((res) => {
      if (res.data.success.length) {
        const users = res.data.success.map(item => {
          if (item.institution == undefined) {
            item.institution = '';
          }
          return new SysAdminUser(item);
        });
        this.setState({
          userList: users.concat(this.state.userList) 
        });
      }
      res.data.failed.map(item => {
        const msg = `${item.email}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMsg = Utils.getErrorMsg(error);
      toaster.danger(errMsg);
    });
  }

  addUser = (data) => {
    toaster.notify(gettext('It may take some time, please wait.'));
    const { email, name, role, password } = data;
    seafileAPI.sysAdminAddUser(email, name, role, password).then((res) => {
      let userList = this.state.userList;
      userList.unshift(res.data);
      this.setState({
        userList: userList
      });
      toaster.success(res.data.add_user_tip);
    }).catch((error) => {
      let errMsg = Utils.getErrorMsg(error);
      toaster.danger(errMsg);
    });
  }

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getUsersListByPage(1);
    });
  }

  updateUser = (email, key, value) => {
    seafileAPI.sysAdminUpdateUser(email, key, value).then(res => {
      let newUserList = this.state.userList.map(item => {
        if (item.email == email) {
          item[key]= res.data[key];
        }
        return item;
      });
      this.setState({userList: newUserList});
      const msg = (key == 'is_active' && value) ? 
        res.data.update_status_tip : gettext('Edit succeeded');
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateAdminRole = (email, role) => {
    seafileAPI.sysAdminUpdateAdminRole(email, role).then(res => {
      let newUserList = this.state.userList.map(item => {
        if (item.email == email) {
          item.admin_role = res.data.role;
        }
        return item;
      });
      this.setState({userList: newUserList});
      toaster.success(gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  revokeAdmin = (email, name) => {
    seafileAPI.sysAdminUpdateUser(email, 'is_staff', false).then(res => {
      let userList = this.state.userList.filter(item => {
        return item.email != email;
      }); 
      this.setState({
        userList: userList
      });
      toaster.success(gettext('Successfully revoked the admin permission of {placeholder}'.replace('{placeholder}', name)));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  getOperationsForAll = () => {
    const { isAdmin, isLDAPImported } = this.props;

    if (isAdmin) {
      return <Button className="btn btn-secondary operation-item" onClick={this.toggleBatchAddAdminDialog}>{gettext('Add Admin')}</Button>;
    }

    if (isLDAPImported) {
      return <a className="btn btn-secondary operation-item" href={`${siteRoot}sys/useradmin/export-excel/`}>{gettext('Export Excel')}</a>;
    }

    // 'database'
    return (
      <Fragment>
        <Button className="btn btn-secondary operation-item" onClick={this.toggleImportUserDialog}>{gettext('Import Users')}</Button>
        <Button className="btn btn-secondary operation-item" onClick={this.toggleAddUserDialog}>{gettext('Add User')}</Button>
        <a className="btn btn-secondary operation-item" href={`${siteRoot}sys/useradmin/export-excel/`}>{gettext('Export Excel')}</a>
      </Fragment>
    );
  }

  getCurrentNavItem = () => {
    const { isAdmin, isLDAPImported } = this.props;
    let item = 'database';
    if (isAdmin) {
      item = 'admin';
    } else if (isLDAPImported) {
      item = 'ldap-imported';
    }
    return item;
  }

  toggleBatchAddAdminDialog = () => {
    this.setState({isBatchAddAdminDialogOpen: !this.state.isBatchAddAdminDialogOpen});
  }  

  addAdminInBatch = (emails) => {
    seafileAPI.sysAdminAddAdminInBatch(emails).then(res => {
      let users = res.data.success.map(user => {
        return new SysAdminAdminUser(user);
      });
      this.setState({
        userList: users.concat(this.state.userList) 
      });
      res.data.failed.map(item => {
        const msg = `${item.email}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    const { isAdmin, isLDAPImported } = this.props;
    const {
      hasUserSelected, 
      isImportUserDialogOpen,
      isAddUserDialogOpen, 
      isBatchDeleteUserDialogOpen, 
      isBatchSetQuotaDialogOpen,
      isBatchAddAdminDialogOpen
    } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar>
          {hasUserSelected ?
            <Fragment>
              <Button className="btn btn-secondary operation-item" onClick={this.toggleBatchSetQuotaDialog}>{gettext('Set Quota')}</Button>
              <Button className="btn btn-secondary operation-item" onClick={this.toggleBatchDeleteUserDialog}>{gettext('Delete Users')}</Button>
            </Fragment>
            : this.getOperationsForAll()
          }
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <UsersNav currentItem={this.getCurrentNavItem()} />
            <div className="cur-view-content">
              <Content
                isAdmin={isAdmin}
                isLDAPImported={isLDAPImported}
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.userList}
                currentPage={this.state.currentPage}
                hasNextPage={this.state.hasNextPage}
                curPerPage={this.state.perPage}
                resetPerPage={this.resetPerPage}
                getListByPage={this.getUsersListByPage}
                updateUser={this.updateUser}
                deleteUser={this.deleteUser}
                updateAdminRole={this.updateAdminRole}
                revokeAdmin={this.revokeAdmin}
                onUserSelected={this.onUserSelected}
                isAllUsersSelected={this.isAllUsersSelected}
                toggleSelectAllUsers={this.toggleSelectAllUsers}
              />
            </div>
          </div>
        </div>
        {isImportUserDialogOpen &&
        <SysAdminImportUserDialog
          toggle={this.toggleImportUserDialog}
          importUserInBatch={this.importUserInBatch}
        />
        }
        {isAddUserDialogOpen &&
          <SysAdminAddUserDialog
            dialogTitle={gettext('Add User')}
            showRole={isPro}
            availableRoles={availableRoles}
            addUser={this.addUser}
            toggleDialog={this.toggleAddUserDialog}
          />
        }
        {isBatchSetQuotaDialogOpen &&
          <SysAdminUserSetQuotaDialog
            toggle={this.toggleBatchSetQuotaDialog}
            updateQuota={this.setUserQuotaInBatch}
          />
        }
        {isBatchDeleteUserDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Delete Users')}
            message={gettext('Are you sure you want to delete the selected user(s) ?')}
            executeOperation={this.deleteUserInBatch}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleBatchDeleteUserDialog}
          />
        }
        {isBatchAddAdminDialogOpen &&
          <SysAdminBatchAddAdminDialog
            addAdminInBatch={this.addAdminInBatch}
            toggle={this.toggleBatchAddAdminDialog}
          />
        }
      </Fragment>
    );
  }
}

export default Users;
