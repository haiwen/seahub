import React, { Component, Fragment } from 'react';
import { navigate } from '@gatsbyjs/reach-router';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { isPro, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import SysAdminUserSetQuotaDialog from '../../../components/dialog/sysadmin-dialog/set-quota';
import SysAdminImportUserDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-import-user-dialog';
import SysAdminAddUserDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-user-dialog';
import SysAdminBatchAddAdminDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-batch-add-admin-dialog';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import SysAdminUser from '../../../models/sysadmin-user';
import SysAdminAdminUser from '../../../models/sysadmin-admin-user';
import UsersFilterBar from './users-filter-bar';
import Content from './users-content';

const { availableRoles } = window.sysadmin.pageOptions;

const propTypes = {
  isAdmin: PropTypes.bool,
  isLDAPImported: PropTypes.bool
};

class Users extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userList: [],
      hasNextPage: false,
      selectedUserList: [],
      isAllUsersSelected: false,
      is_active: '',
      role: ''
    };
  }

  componentDidMount() {
    if (this.props.isAdmin) {
      this.getUserList();
    } else {
      this.initUserListFromURL();
    }
  }

  componentDidUpdate(prevProps) {
    const { isAdmin, sortBy, sortOrder, currentPage, perPage } = this.props;
    if (prevProps.isAdmin !== isAdmin) {
      this.setState({ loading: true }, () => {
        if (isAdmin) {
          this.getUserList();
        } else {
          this.initUserListFromURL();
        }
      });
    }

    if (prevProps.sortBy !== sortBy ||
      prevProps.sortOrder !== sortOrder ||
      prevProps.currentPage !== currentPage) {
      this.updateURLSearchParams({
        'page': currentPage,
        'per_page': perPage,
        'order_by': sortBy,
        'direction': sortOrder
      });
      this.getUsersListByPage(currentPage);
    }
  }

  initUserListFromURL = () => {
    const urlParams = new URL(window.location).searchParams;
    const {
      is_active,
      role
    } = this.state;
    this.setState({
      is_active: urlParams.get('is_active') || is_active,
      role: urlParams.get('role') || role
    }, () => {
      this.getUsersListByPage(this.state.currentPage);
    });
  };

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
        selectedUserList = selectedUserList.filter(thisUser => {
          return thisUser.email != user.email;
        });
      }
      return user;
    });
    // finally update state
    this.setState({
      userList: users,
      selectedUserList: selectedUserList,
    });
    this.props.onHasUserSelected(hasUserSelected);
  };

  toggleSelectAllUsers = () => {
    if (this.state.isAllUsersSelected) {
      // if previous state is allSelected, toggle to not select
      let users = this.state.userList.map(user => {
        user.isSelected = false;
        return user;
      });
      this.setState({
        userList: users,
        isAllUsersSelected: false,
        selectedUserList: [],
      });
      this.props.onHasUserSelected(false);
    } else {
      // if previous state is not allSelected, toggle to selectAll
      let users = this.state.userList.map(user => {
        user.isSelected = true;
        return user;
      });
      this.setState({
        userList: users,
        isAllUsersSelected: true,
        selectedUserList: users
      });
      this.props.onHasUserSelected(true);
    }
  };

  getUserList = () => {
  // get admins
    systemAdminAPI.sysAdminListAdmins().then(res => {
      let users = res.data.admin_user_list.map(user => {
        return new SysAdminAdminUser(user);
      });
      this.setState({
        userList: users,
        loading: false
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  getUsersListByPage = (page) => {
    const { is_active, role } = this.state;
    const { perPage, sortBy, sortOrder, isLDAPImported } = this.props;
    systemAdminAPI.sysAdminListUsers(page, perPage, isLDAPImported, sortBy, sortOrder, is_active, role).then(res => {
      let users = res.data.data.map(user => {return new SysAdminUser(user);});
      this.setState({
        userList: users,
        loading: false,
        hasNextPage: Utils.hasNextPage(page, perPage, res.data.total_count),
        currentPage: page
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  updateURLSearchParams = (obj) => {
    let url = new URL(location.href);
    let searchParams = new URLSearchParams(url.search);
    for (const key in obj) {
      searchParams.set(key, obj[key]);
    }
    url.search = searchParams.toString();
    navigate(url.toString());
  };

  // is_active: '1', '0', '' (active, inactive, all)
  onStatusChange = (is_active) => {
    this.setState({
      is_active: is_active,
      currentPage: 1
    }, () => {
      const { currentPage, perPage } = this.props;
      this.updateURLSearchParams({
        'page': currentPage,
        'per_page': perPage,
        'is_active': is_active
      });
      this.getUsersListByPage(currentPage);
    });
  };

  onRoleChange = (role) => {
    this.setState({
      role: role,
      currentPage: 1
    }, () => {
      const { currentPage, perPage } = this.props;
      this.updateURLSearchParams({
        'page': currentPage,
        'per_page': perPage,
        'role': role
      });
      this.getUsersListByPage(currentPage);
    });
  };

  deleteUser = (email, username) => {
    systemAdminAPI.sysAdminDeleteUser(email).then(res => {
      let newUserList = this.state.userList.filter(item => {
        return item.email != email;
      });
      this.setState({ userList: newUserList });
      let msg = gettext('Deleted user %s');
      msg = msg.replace('%s', username);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  setUserQuotaInBatch = (quotaTotal) => {
    let emails = this.state.selectedUserList.map(user => {
      return user.email;
    });
    systemAdminAPI.sysAdminSetUserQuotaInBatch(emails, quotaTotal).then(res => {
      let userList = this.state.userList.map(item => {
        res.data.success.forEach(resultUser => {
          if (item.email == resultUser.email) {
            item.quota_total = resultUser.quota_total;
          }
        });
        return item;
      });
      this.setState({ userList: userList });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteUserInBatch = () => {
    let emails = this.state.selectedUserList.map(user => {
      return user.email;
    });
    systemAdminAPI.sysAdminDeleteUserInBatch(emails).then(res => {
      if (res.data.success.length) {
        let oldUserList = this.state.userList;
        let newUserList = oldUserList.filter(oldUser => {
          return !res.data.success.some(deletedUser => {
            return deletedUser.email == oldUser.email;
          });
        });
        this.setState({
          userList: newUserList
        });
        this.props.onHasUserSelected(emails.length != res.data.success.length);
        const length = res.data.success.length;
        const msg = length == 1 ?
          gettext('Successfully deleted 1 user.') :
          gettext('Successfully deleted {user_number_placeholder} users.')
            .replace('{user_number_placeholder}', length);
        toaster.success(msg);
      }
      res.data.failed.forEach(item => {
        const msg = `${item.email}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  importUserInBatch = (file) => {
    toaster.notify(gettext('It may take some time, please wait.'));
    systemAdminAPI.sysAdminImportUserViaFile(file).then((res) => {
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
      res.data.failed.forEach(item => {
        const msg = `${item.email}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMsg = Utils.getErrorMsg(error);
      toaster.danger(errMsg);
    });
  };

  addUser = (data) => {
    toaster.notify(gettext('It may take some time, please wait.'));
    const { email, name, role, password } = data;
    systemAdminAPI.sysAdminAddUser(email, name, role, password).then((res) => {
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
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getUsersListByPage(1);
    });
  };

  updateUser = (email, key, value, options = {}) => {
    systemAdminAPI.sysAdminUpdateUser(email, key, value, options).then(res => {
      let newUserList = this.state.userList.map(item => {
        if (item.email == email) {
          item[key] = res.data[key];
        }
        return item;
      });
      this.setState({ userList: newUserList });
      const msg = (key == 'is_active' && value) ?
        res.data.update_status_tip : gettext('Edit succeeded');
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateAdminRole = (email, role) => {
    systemAdminAPI.sysAdminUpdateAdminRole(email, role).then(res => {
      let newUserList = this.state.userList.map(item => {
        if (item.email == email) {
          item.admin_role = res.data.role;
        }
        return item;
      });
      this.setState({ userList: newUserList });
      toaster.success(gettext('Edit succeeded'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  revokeAdmin = (email, name) => {
    systemAdminAPI.sysAdminUpdateUser(email, 'is_staff', false).then(res => {
      let userList = this.state.userList.filter(item => {
        return item.email != email;
      });
      this.setState({
        userList: userList
      });
      toaster.success(gettext('Successfully revoked the admin permission of {placeholder}.').replace('{placeholder}', name));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  getCurrentNavItem = () => {
    const { isAdmin, isLDAPImported } = this.props;
    let item = 'database';
    if (isAdmin) {
      item = 'admin';
    } else if (isLDAPImported) {
      item = 'ldap-imported';
    }
    return item;
  };

  addAdminInBatch = (emails) => {
    systemAdminAPI.sysAdminAddAdminInBatch(emails).then(res => {
      let users = res.data.success.map(user => {
        return new SysAdminAdminUser(user);
      });
      this.setState({
        userList: users.concat(this.state.userList)
      });
      res.data.failed.forEach(item => {
        const msg = `${item.email}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const {
      curTab,
      isAdmin,
      isLDAPImported,
      isImportUserDialogOpen,
      isAddUserDialogOpen,
      isBatchDeleteUserDialogOpen,
      isBatchSetQuotaDialogOpen,
      isBatchAddAdminDialogOpen
    } = this.props;
    const { is_active, role, } = this.state;

    return (
      <>
        <div className="cur-view-content">
          {curTab == 'database' &&
          <UsersFilterBar
            isActive={is_active}
            role={role}
            onStatusChange={this.onStatusChange}
            onRoleChange={this.onRoleChange}
          />
          }
          <Content
            isAdmin={isAdmin}
            isLDAPImported={isLDAPImported}
            loading={this.state.loading}
            errorMsg={this.state.errorMsg}
            items={this.state.userList}
            sortBy={this.state.sortBy}
            sortOrder={this.state.sortOrder}
            sortByQuotaUsage={this.sortByQuotaUsage}
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
        {isImportUserDialogOpen &&
        <SysAdminImportUserDialog
          toggle={this.props.toggleImportUserDialog}
          importUserInBatch={this.importUserInBatch}
        />
        }
        {isAddUserDialogOpen &&
          <SysAdminAddUserDialog
            dialogTitle={gettext('Add User')}
            showRole={isPro}
            availableRoles={availableRoles}
            addUser={this.addUser}
            toggleDialog={this.props.toggleAddUserDialog}
          />
        }
        {isBatchSetQuotaDialogOpen &&
          <SysAdminUserSetQuotaDialog
            toggle={this.props.toggleBatchSetQuotaDialog}
            updateQuota={this.setUserQuotaInBatch}
          />
        }
        {isBatchDeleteUserDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Delete Users')}
            message={gettext('Are you sure you want to delete the selected user(s) ?')}
            executeOperation={this.deleteUserInBatch}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.props.toggleBatchDeleteUserDialog}
          />
        }
        {isBatchAddAdminDialogOpen &&
          <SysAdminBatchAddAdminDialog
            addAdminInBatch={this.addAdminInBatch}
            toggle={this.toggleBatchAddAdminDialog}
          />
        }
      </>
    );
  }
}

Users.propTypes = propTypes;

export default Users;
