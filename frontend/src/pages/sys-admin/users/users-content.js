import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { isPro, username, gettext, multiInstitution, siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import Selector from '../../../components/single-selector';
import OpMenu from '../../../components/dialog/op-menu';
import SysAdminUserSetQuotaDialog from '../../../components/dialog/sysadmin-dialog/set-quota';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import UserLink from '../user-link';
import SysAdminUserDeactivateDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-user-deactivate-dialog';
import IconBtn from '../../../components/icon-btn';

const { availableRoles, availableAdminRoles, institutions } = window.sysadmin.pageOptions;
dayjs.extend(relativeTime);

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
  };

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
  };

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  };

  sortByQuotaUsage = (e) => {
    e.preventDefault();
    this.props.sortByQuotaUsage();
  };

  render() {
    const {
      isAdmin, loading, errorMsg, items, isAllUsersSelected,
      curPerPage, hasNextPage, currentPage
    } = this.props;

    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      let columns = [];

      const colSpaceText = `${gettext('Space Used')} / ${gettext('Quota')}`;
      const colNameText = `${gettext('Name')} / ${gettext('Contact Email')}`;
      const colCreatedText = `${gettext('Created At')} / ${gettext('Last Login')} / ${gettext('Last Access')}`;
      if (isPro) {
        columns.push(
          { width: '20%', text: colNameText },
          { width: '15%', text: gettext('Status') },
          { width: '15%', text: gettext('Role') }
        );
      } else {
        columns.push(
          { width: '30%', text: colNameText },
          { width: '20%', text: gettext('Status') }
        );
      }
      if (multiInstitution && !isAdmin) {
        columns.push(
          { width: '14%', text: colSpaceText },
          { width: '14%', text: gettext('Institution') },
          { width: '14%', text: colCreatedText },
          { width: '5%', text: '' }
        );
      } else {
        columns.push(
          { width: '20%', text: colSpaceText },
          { width: '22%', text: colCreatedText },
          { width: '5%', text: '' }
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
                if (index < this.props.curPerPage) {
                  return (
                    <Item
                      key={index}
                      item={item}
                      isItemFreezed={this.state.isItemFreezed}
                      onFreezedItem={this.onFreezedItem}
                      onUnfreezedItem={this.onUnfreezedItem}
                      toggleItemFreezed={this.toggleItemFreezed}
                      updateUser={this.props.updateUser}
                      deleteUser={this.props.deleteUser}
                      updateAdminRole={this.props.updateAdminRole}
                      revokeAdmin={this.props.revokeAdmin}
                      onUserSelected={this.props.onUserSelected}
                      isAdmin={this.props.isAdmin}
                      isLDAPImported={this.props.isLDAPImported}
                    />
                  );
                }
                return null;
              })}
            </tbody>
          </table>
          {(!this.props.isAdmin && !this.props.isSearchResult) &&
          <Paginator
            gotoPreviousPage={this.getPreviousPage}
            gotoNextPage={this.getNextPage}
            currentPage={currentPage}
            hasNextPage={hasNextPage}
            curPerPage={curPerPage}
            resetPerPage={this.props.resetPerPage}
          />
          }
        </Fragment>
      );

      return (
        <div>
          {items.length ? table : <EmptyTip text={gettext('No users')} />}
        </div>
      );
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool,
  errorMsg: PropTypes.string,
  items: PropTypes.array,
  deleteItem: PropTypes.func,
  isAdmin: PropTypes.bool,
  isLDAPImported: PropTypes.bool,
  isSearchResult: PropTypes.bool,
  sortBy: PropTypes.string,
  sortByQuotaUsage: PropTypes.func,
  getListByPage: PropTypes.func,
  currentPage: PropTypes.number,
  toggleSelectAllUsers: PropTypes.func,
  isAllUsersSelected: PropTypes.bool,
  resetPerPage: PropTypes.func,
  updateUser: PropTypes.func,
  deleteUser: PropTypes.func,
  updateAdminRole: PropTypes.func,
  revokeAdmin: PropTypes.func,
  onUserSelected: PropTypes.func,
  curPerPage: PropTypes.number,
  hasNextPage: PropTypes.bool,
  sortOrder: PropTypes.string
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      highlight: false,
      isSetQuotaDialogOpen: false,
      isDeleteUserDialogOpen: false,
      isResetUserPasswordDialogOpen: false,
      isRevokeAdminDialogOpen: false,
      isConfirmInactiveDialogOpen: false,
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  };

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  };

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  };

  toggleSetQuotaDialog = () => {
    this.setState({ isSetQuotaDialogOpen: !this.state.isSetQuotaDialogOpen });
  };

  toggleDeleteUserDialog = () => {
    this.setState({ isDeleteUserDialogOpen: !this.state.isDeleteUserDialogOpen });
  };

  toggleResetUserPasswordDialog = () => {
    this.setState({ isResetUserPasswordDialogOpen: !this.state.isResetUserPasswordDialogOpen });
  };

  toggleRevokeAdminDialog = () => {
    this.setState({ isRevokeAdminDialogOpen: !this.state.isRevokeAdminDialogOpen });
  };

  toggleConfirmInactiveDialog = (targetItem) => {
    if (targetItem?.value === 'active') {
      return;
    }
    this.setState({ isConfirmInactiveDialogOpen: !this.state.isConfirmInactiveDialogOpen });
  };

  onUserSelected = () => {
    this.props.onUserSelected(this.props.item);
  };

  updateStatus = (roleOption) => {
    const isActive = roleOption.value == 'active';
    if (isActive) {
      toaster.notify(gettext('It may take some time, please wait.'));
    }
    this.props.updateUser(this.props.item.email, 'is_active', isActive);
  };

  setUserInactive = (keepSharing) => {
    this.props.updateUser(this.props.item.email, 'is_active', false, {
      keep_sharing: keepSharing
    });
    this.toggleConfirmInactiveDialog();
  };


  updateRole = (roleOption) => {
    this.props.updateUser(this.props.item.email, 'role', roleOption.value);
  };

  updateAdminRole = (roleOption) => {
    this.props.updateAdminRole(this.props.item.email, roleOption.value);
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
  };

  translateStatus = (status) => {
    switch (status) {
      case 'active':
        return gettext('Active');
      case 'inactive':
        return gettext('Inactive');
    }
  };

  updateInstitution = (instOption) => {
    this.props.updateUser(this.props.item.email, 'institution', instOption.value);
  };

  updateQuota = (value) => {
    this.props.updateUser(this.props.item.email, 'quota_total', value);
  };

  deleteUser = () => {
    toaster.notify(gettext('It may take some time, please wait.'));
    this.props.deleteUser(this.props.item.email, this.props.item.name);
  };

  resetPassword = () => {
    toaster.notify(gettext('It may take some time, please wait.'));
    systemAdminAPI.sysAdminResetUserPassword(this.props.item.email).then(res => {
      toaster.success(res.data.reset_tip);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  revokeAdmin = () => {
    const { item } = this.props;
    this.props.revokeAdmin(item.email, item.name);
  };

  getMenuOperations = () => {
    const {
      isAdmin, isLDAPImported,
      isSearchResult, item
    } = this.props;
    let list = ['Delete'];
    if (!isLDAPImported ||
      (isSearchResult && item.source == 'db')) {
      list.push('Reset Password');
    }
    if (isAdmin) {
      list = ['Revoke Admin'];
    }
    return list;
  };

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
  };

  onMenuItemClick = (operation) => {
    switch (operation) {
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
  };

  render() {
    const { item, isAdmin } = this.props;
    const {
      highlight,
      isOpIconShown,
      isSetQuotaDialogOpen,
      isDeleteUserDialogOpen,
      isResetUserPasswordDialogOpen,
      isRevokeAdminDialogOpen,
      isConfirmInactiveDialogOpen
    } = this.state;

    const itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    const deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', itemName);
    const resetPasswordDialogMsg = gettext('Are you sure you want to reset the password of {placeholder} ?').replace('{placeholder}', itemName);
    const revokeAdminDialogMsg = gettext('Are you sure you want to revoke the admin permission of {placeholder} ?').replace('{placeholder}', itemName);

    // for 'user status'
    const curStatus = item.is_active ? 'active' : 'inactive';
    this.statusOptions = ['active', 'inactive'].map(item => {
      return {
        value: item,
        text: this.translateStatus(item),
        isSelected: item == curStatus
      };
    });
    const currentSelectedStatusOption = this.statusOptions.filter(item => item.isSelected)[0];

    let currentSelectedAdminRoleOption;
    let currentSelectedRoleOption;
    if (isAdmin) {
      const { admin_role: curAdminRole } = item;
      this.adminRoleOptions = availableAdminRoles.map(item => {
        return {
          value: item,
          text: this.translateAdminRole(item),
          isSelected: item == curAdminRole
        };
      });
      currentSelectedAdminRoleOption = this.adminRoleOptions.filter(item => item.isSelected)[0];
    } else {
      const { role: curRole } = item;
      this.roleOptions = availableRoles.map(item => {
        return {
          value: item,
          text: this.translateRole(item),
          isSelected: item == curRole
        };
      });
      currentSelectedRoleOption = this.roleOptions.filter(item => item.isSelected)[0] || { // `|| {...}`: to be compatible with old data(roles not in the present `availableRoles`
        value: curRole,
        text: this.translateRole(curRole),
        isSelected: true
      };
    }

    let currentSelectedInstOption;
    if (multiInstitution && !isAdmin) {
      const { institution: curInstitution } = item;
      this.instOptions = institutions.map(item => {
        return {
          value: item,
          text: item,
          isSelected: item == curInstitution
        };
      });
      currentSelectedInstOption = this.instOptions.filter(item => item.isSelected)[0];
    }

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
            <Selector
              isDropdownToggleShown={highlight}
              currentSelectedOption={currentSelectedStatusOption}
              options={this.statusOptions}
              selectOption={this.updateStatus}
              toggleItemFreezed={this.props.toggleItemFreezed}
              operationBeforeSelect={item.is_active ? this.toggleConfirmInactiveDialog : undefined}
            />
          </td>
          {isPro &&
          <td>
            {isAdmin ?
              <Selector
                isDropdownToggleShown={highlight}
                currentSelectedOption={currentSelectedAdminRoleOption}
                options={this.adminRoleOptions}
                selectOption={this.updateAdminRole}
                toggleItemFreezed={this.props.toggleItemFreezed}
              />
              :
              <Selector
                isDropdownToggleShown={highlight}
                currentSelectedOption={currentSelectedRoleOption}
                options={this.roleOptions}
                selectOption={this.updateRole}
                toggleItemFreezed={this.props.toggleItemFreezed}
              />
            }
          </td>
          }
          <td>
            {`${Utils.bytesToSize(item.quota_usage)} / ${item.quota_total > 0 ? Utils.bytesToSize(item.quota_total) : '--'}`}
            <IconBtn symbol="rename" title={gettext('Edit')} className={`op-icon ml-1 ${isOpIconShown ? '' : 'invisible'}`} onClick={this.toggleSetQuotaDialog} />
          </td>
          {(multiInstitution && !isAdmin) &&
            <td>
              <Selector
                isDropdownToggleShown={highlight && institutions.length > 0}
                currentSelectedOption={currentSelectedInstOption}
                options={this.instOptions}
                selectOption={this.updateInstitution}
                toggleItemFreezed={this.props.toggleItemFreezed}
              />
            </td>
          }
          <td>
            {`${item.create_time ? dayjs(item.create_time).format('YYYY-MM-DD HH:mm') : '--'} /`}
            <br />
            {`${item.last_login ? dayjs(item.last_login).fromNow() : '--'}`}
            <br />
            {`${item.last_access_time ? dayjs(item.last_access_time).fromNow() : '--'}`}
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
        {isConfirmInactiveDialogOpen &&
          <SysAdminUserDeactivateDialog
            toggleDialog={this.toggleConfirmInactiveDialog}
            onSubmit={this.setUserInactive}
          />
        }
      </Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object,
  isItemFreezed: PropTypes.bool,
  isAdmin: PropTypes.bool,
  isLDAPImported: PropTypes.bool,
  onFreezedItem: PropTypes.func,
  onUnfreezedItem: PropTypes.func,
  toggleItemFreezed: PropTypes.func.isRequired,
  updateUser: PropTypes.func,
  deleteUser: PropTypes.func,
  updateAdminRole: PropTypes.func,
  revokeAdmin: PropTypes.func,
  onUserSelected: PropTypes.func,
  isSearchResult: PropTypes.bool,
};

export default Content;
