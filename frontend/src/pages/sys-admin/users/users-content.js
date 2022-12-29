import React, { Component, Fragment } from 'react';
import moment from 'moment';
import { Link } from '@gatsbyjs/reach-router';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { isPro, username, gettext, multiInstitution, siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Paginator from '../../../components/paginator';
import SysAdminUserStatusEditor from '../../../components/select-editor/sysadmin-user-status-editor';
import SysAdminUserRoleEditor from '../../../components/select-editor/sysadmin-user-role-editor';
import SelectEditor from '../../../components/select-editor/select-editor';
import OpMenu from '../../../components/dialog/op-menu';
import SysAdminUserSetQuotaDialog from '../../../components/dialog/sysadmin-dialog/set-quota';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import UserLink from '../user-link';

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

  sortByQuotaUsage = (e) => {
    e.preventDefault();
    this.props.sortByQuotaUsage();
  }

  render() {
    const {
      isAdmin, loading, errorMsg, items, isAllUsersSelected,
      curPerPage, hasNextPage, currentPage,
      sortBy, sortOrder
    } = this.props;
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

      let sortIcon;
      if (sortBy == '') {
        // initial sort icon
        sortIcon = <span className="fas fa-sort"></span>;
      } else {
        sortIcon = <span className={`fas ${sortOrder == 'asc' ? 'fa-caret-up' : 'fa-caret-down'}`}></span>;
      }
      const spaceText = gettext('Space Used');
      const spaceEl =
        sortBy != undefined ? // only offer 'sort' for 'DB' & 'LDAPImported' users
        <a className="d-inline-block table-sort-op" href="#" onClick={this.sortByQuotaUsage}>{spaceText} {sortIcon}</a> :
          spaceText;
      const colSpaceText = <Fragment>{spaceEl}{` / ${gettext('Quota')}`}</Fragment>;

      const colNameText = `${gettext('Name')} / ${gettext('Contact Email')}`;
      const colCreatedText = `${gettext('Created At')} / ${gettext('Last Login')} / ${gettext('Last Access')}`;
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
    toaster.notify(gettext('It may take some time, please wait.'));
    this.props.deleteUser(this.props.item.email);
  }

  resetPassword = () => {
    toaster.notify(gettext('It may take some time, please wait.'));
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
            <br />
            {`${item.last_access_time ? moment(item.last_access_time).fromNow() : '--'}`}
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

export default Content;
