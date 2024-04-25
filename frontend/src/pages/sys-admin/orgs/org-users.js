import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import moment from 'moment';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, username } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import Selector from '../../../components/single-selector';
import SysAdminAddUserDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-user-dialog';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import OpMenu from '../../../components/dialog/op-menu';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import OrgNav from './org-nav';

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
    this.setState({isItemFreezed: true});
  };

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  };

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('No members')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="25%">{gettext('Name')}</th>
                <th width="15%">{gettext('Status')}</th>
                <th width="15%">{gettext('Role')}</th>
                <th width="15%">{gettext('Space Used')}</th>
                <th width="25%">{gettext('Created At')}{' / '}{gettext('Last Login')}</th>
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
class Item extends Component {

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
    switch(operation) {
      case 'Delete':
        this.toggleDeleteDialog();
        break;
      case 'Reset Password':
        this.toggleResetPasswordDialog();
        break;
      default:
        break;
    }
  };

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  };

  toggleResetPasswordDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isResetPasswordDialogOpen: !this.state.isResetPasswordDialogOpen});
  };

  toggleConfirmInactiveDialog= () => {
    this.setState({isConfirmInactiveDialogOpen: !this.state.isConfirmInactiveDialogOpen});
  };

  updateStatus= (statusOption) => {
    this.props.updateStatus(this.props.item.email, statusOption.value);
  };

  setUserInactive = () => {
    this.props.updateStatus(this.props.item.email, 'inactive');
  };

  updateMembership= (membershipOption) => {
    this.props.updateMembership(this.props.item.email, membershipOption.value);
  };

  deleteUser = () => {
    const { item } = this.props;
    this.props.deleteUser(item.org_id, item.email);
  };

  resetPassword = () => {
    seafileAPI.sysAdminResetUserPassword(this.props.item.email).then(res => {
      toaster.success(res.data.reset_tip);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  translateOperations = (item) => {
    let translateResult = '';
    switch(item) {
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Reset Password':
        translateResult = gettext('Reset Password');
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

  translateMembership = (membership) => {
    switch (membership) {
      case 'Admin':
        return gettext('Admin');
      case 'Member':
        return gettext('Member');
    }
  };

  render() {
    const { item } = this.props;
    const { highlight, isOpIconShown, isDeleteDialogOpen, isResetPasswordDialogOpen, isConfirmInactiveDialogOpen } = this.state;

    const itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', itemName);
    let resetPasswordDialogMsg = gettext('Are you sure you want to reset the password of {placeholder} ?').replace('{placeholder}', itemName);
    const confirmSetUserInactiveMsg = gettext('Are you sure you want to set {user_placeholder} inactive?').replace('{user_placeholder}', itemName);

    // for 'user status'
    const curStatus = item.active ? 'active' : 'inactive';
    this.statusOptions = ['active', 'inactive'].map(item => {
      return {
        value: item,
        text: this.translateStatus(item),
        isSelected: item == curStatus
      };
    });
    const currentSelectedStatusOption = this.statusOptions.filter(item => item.isSelected)[0];

    // for 'user membership'
    const curMembership = item.is_org_staff? 'Admin' : 'Member';
    this.membershipOptions = ['Admin', 'Member'].map(item => {
      return {
        value: item,
        text: this.translateMembership(item),
        isSelected: item == curMembership
      };
    });
    const currentSelectedMembershipOption = this.membershipOptions.filter(item => item.isSelected)[0];

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
          <td>
            <Selector
              isDropdownToggleShown={highlight}
              currentSelectedOption={currentSelectedMembershipOption}
              options={this.membershipOptions}
              selectOption={this.updateMembership}
              toggleItemFreezed={this.props.toggleItemFreezed}
            />
          </td>
          <td>{`${Utils.bytesToSize(item.quota_usage)} / ${item.quota_total > 0 ? Utils.bytesToSize(item.quota_total) : '--'}`}</td>
          <td>
            {moment(item.create_time).format('YYYY-MM-DD HH:mm:ss')}{' / '}{item.last_login ? moment(item.last_login).fromNow() : '--'}
          </td>
          <td>
            {(isOpIconShown && item.email != username) &&
            <OpMenu
              operations={['Delete', 'Reset Password']}
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
        <CommonOperationConfirmationDialog
          title={gettext('Set user inactive')}
          message={confirmSetUserInactiveMsg}
          executeOperation={this.setUserInactive}
          confirmBtnText={gettext('Set')}
          toggleDialog={this.toggleConfirmInactiveDialog}
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

class OrgUsers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      orgName: '',
      userList: [],
      isAddUserDialogOpen: false
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminGetOrg(this.props.orgID).then((res) => {
      this.setState({
        orgName: res.data.org_name
      });
    });
    seafileAPI.sysAdminListOrgUsers(this.props.orgID).then((res) => {
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

  toggleAddUserDialog = () => {
    this.setState({isAddUserDialogOpen: !this.state.isAddUserDialogOpen});
  };

  addUser = (newUserInfo) => {
    const { email, name, password } = newUserInfo;
    seafileAPI.sysAdminAddOrgUser(this.props.orgID, email, name, password).then(res => {
      let userList = this.state.userList;
      userList.unshift(res.data);
      this.setState({userList: userList});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  deleteUser = (orgID, email) => {
    seafileAPI.sysAdminDeleteOrgUser(orgID, email).then(res => {
      let newUserList = this.state.userList.filter(item => {
        return item.email != email;
      });
      this.setState({userList: newUserList});
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateStatus = (email, statusValue) => {
    const isActive = statusValue == 'active';
    seafileAPI.sysAdminUpdateOrgUser(this.props.orgID, email, 'active', isActive).then(res => {
      let newUserList = this.state.userList.map(item => {
        if (item.email == email) {
          item.active = res.data.active;
        }
        return item;
      });
      this.setState({userList: newUserList});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  updateMembership = (email, membershipValue) => {
    const isOrgStaff = membershipValue == 'Admin';
    seafileAPI.sysAdminUpdateOrgUser(this.props.orgID, email, 'is_org_staff', isOrgStaff).then(res => {
      let newUserList = this.state.userList.map(item => {
        if (item.email == email) {
          item.is_org_staff = res.data.is_org_staff;
        }
        return item;
      });
      this.setState({userList: newUserList});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { isAddUserDialogOpen, orgName } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props}>
          <Button className="btn btn-secondary operation-item" onClick={this.toggleAddUserDialog}>{gettext('Add Member')}</Button>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgNav
              currentItem="users"
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
        {isAddUserDialogOpen &&
          <SysAdminAddUserDialog
            addUser={this.addUser}
            toggleDialog={this.toggleAddUserDialog}
          />
        }
      </Fragment>
    );
  }
}

OrgUsers.propTypes = {
  orgID: PropTypes.string,
};

export default OrgUsers;
