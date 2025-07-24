import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext, username } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Selector from '../../../components/single-selector';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import OpMenu from '../../../components/dialog/op-menu';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import OrgNav from './org-nav';
import SysAdminUserDeactivateDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-user-deactivate-dialog';

dayjs.extend(relativeTime);

class Content extends React.Component {

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

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No admins')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="25%">{gettext('Name')}</th>
                <th width="15%">{gettext('Status')}</th>
                <th width="25%">{gettext('Space Used')}</th>
                <th width="30%">{gettext('Created At')}{' / '}{gettext('Last Login')}</th>
                <th width="5%">{/* Operations */}</th>
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
                  toggleItemFreezed={this.toggleItemFreezed}
                  updateStatus={this.props.updateStatus}
                  updateMembership={this.props.updateMembership}
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

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  updateStatus: PropTypes.func.isRequired,
  updateMembership: PropTypes.func.isRequired,
  deleteUser: PropTypes.func.isRequired,
};

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      highlight: false,
      isDeleteDialogOpen: false,
      isResetPasswordDialogOpen: false
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

  onMenuItemClick = (operation) => {
    switch (operation) {
      case 'Delete':
        this.toggleDeleteDialog();
        break;
      case 'Reset Password':
        this.toggleResetPasswordDialog();
        break;
      case 'Revoke Admin':
        this.props.updateMembership(this.props.item.email, 'Member');
        break;
      default:
        break;
    }
  };

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({ isDeleteDialogOpen: !this.state.isDeleteDialogOpen });
  };

  toggleResetPasswordDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({ isResetPasswordDialogOpen: !this.state.isResetPasswordDialogOpen });
  };

  toggleConfirmInactiveDialog = (targetItem) => {
    if (targetItem?.value === 'active') {
      return;
    }
    this.setState({ isConfirmInactiveDialogOpen: !this.state.isConfirmInactiveDialogOpen });
  };

  updateStatus = (statusOption) => {
    this.props.updateStatus(this.props.item.email, statusOption.value);
  };

  setUserInactive = (keepSharing) => {
    this.props.updateStatus(this.props.item.email, 'inactive', { keepSharing: keepSharing });
  };

  updateMembership = (membershipOption) => {
    this.props.updateMembership(this.props.item.email, membershipOption.value);
  };

  deleteUser = () => {
    const { item } = this.props;
    this.props.deleteUser(item.org_id, item.email);
  };

  resetPassword = () => {
    systemAdminAPI.sysAdminResetUserPassword(this.props.item.email).then(res => {
      toaster.success(res.data.reset_tip);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
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

  translateStatus = (status) => {
    switch (status) {
      case 'active':
        return gettext('Active');
      case 'inactive':
        return gettext('Inactive');
    }
  };


  render() {
    const { item } = this.props;
    const { highlight, isOpIconShown, isDeleteDialogOpen, isResetPasswordDialogOpen, isConfirmInactiveDialogOpen } = this.state;

    const itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', itemName);
    let resetPasswordDialogMsg = gettext('Are you sure you want to reset the password of {placeholder} ?').replace('{placeholder}', itemName);

    // for 'user status'
    const curStatus = item.active ? 'active' : 'inactive';
    this.statusOptions = ['active', 'inactive'].map(item => {
      return {
        value: item,
        text: this.translateStatus(item),
        isSelected: item === curStatus
      };
    });
    const currentSelectedStatusOption = this.statusOptions.filter(item => item.isSelected)[0];
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><UserLink email={item.email} name={item.name} /></td>
          <td>
            <Selector
              isDropdownToggleShown={highlight}
              currentSelectedOption={currentSelectedStatusOption}
              options={this.statusOptions}
              selectOption={this.updateStatus}
              toggleItemFreezed={this.props.toggleItemFreezed}
              operationBeforeSelect={item.active ? this.toggleConfirmInactiveDialog : undefined}
            />
          </td>
          <td>{`${Utils.bytesToSize(item.quota_usage)} / ${item.quota_total > 0 ? Utils.bytesToSize(item.quota_total) : '--'}`}</td>
          <td>
            {dayjs(item.create_time).format('YYYY-MM-DD HH:mm:ss')}{' / '}{item.last_login ? dayjs(item.last_login).fromNow() : '--'}
          </td>
          <td>
            {(isOpIconShown && item.email !== username) &&
            <OpMenu
              operations={['Delete', 'Reset Password', 'Revoke Admin']}
              translateOperations={this.translateOperations}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
            }
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Delete Member')}
            message={deleteDialogMsg}
            executeOperation={this.deleteUser}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteDialog}
          />
        }
        {isResetPasswordDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Reset Password')}
            message={resetPasswordDialogMsg}
            executeOperation={this.resetPassword}
            confirmBtnText={gettext('Reset')}
            toggleDialog={this.toggleResetPasswordDialog}
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
  item: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  toggleItemFreezed: PropTypes.func.isRequired,
  updateStatus: PropTypes.func.isRequired,
  updateMembership: PropTypes.func.isRequired,
  deleteUser: PropTypes.func.isRequired,
};

class OrgAdmins extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      orgName: '',
      userList: [],
    };
  }

  componentDidMount() {
    systemAdminAPI.sysAdminGetOrg(this.props.orgID).then((res) => {
      this.setState({
        orgName: res.data.org_name
      });
    });
    systemAdminAPI.sysAdminListOrgAdminUsers(this.props.orgID).then((res) => {
      this.setState({
        loading: false,
        userList: res.data.users
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteUser = (orgID, email) => {
    systemAdminAPI.sysAdminDeleteOrgUser(orgID, email).then(res => {
      let newUserList = this.state.userList.filter(item => {
        return item.email !== email;
      });
      this.setState({ userList: newUserList });
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateStatus = (email, statusValue, options = {}) => {
    const isActive = statusValue === 'active';
    systemAdminAPI.sysAdminUpdateOrgUser(this.props.orgID, email, 'active', isActive, options).then(res => {
      let newUserList = this.state.userList.map(item => {
        if (item.email === email) {
          item.active = res.data.active;
        }
        return item;
      });
      this.setState({ userList: newUserList });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateMembership = (email, membershipValue) => {
    const isOrgStaff = membershipValue === 'Admin';
    systemAdminAPI.sysAdminUpdateOrgUser(this.props.orgID, email, 'is_org_staff', isOrgStaff).then(res => {
      let newUserList = this.state.userList.filter(item => {
        return item.email !== email;
      });
      this.setState({ userList: newUserList });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { orgName } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgNav
              currentItem="admin-users"
              orgID={this.props.orgID}
              orgName={orgName}
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.userList}
                updateStatus={this.updateStatus}
                updateMembership={this.updateMembership}
                deleteUser={this.deleteUser}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

OrgAdmins.propTypes = {
  orgID: PropTypes.string,
};

export default OrgAdmins;
