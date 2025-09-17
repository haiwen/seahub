import React, { Component } from 'react';
import Nav from './org-users-nav';
import OrgAdminList from './org-admin-list';
import MainPanelTopbar from './main-panel-topbar';
import AddOrgAdminDialog from '../../components/dialog/org-add-admin-dialog';
import ModalPortal from '../../components/modal-portal';
import toaster from '../../components/toast';
import { orgAdminAPI } from '../../utils/org-admin-api';
import OrgUserInfo from '../../models/org-user';
import { gettext, orgID } from '../../utils/constants';
import { Utils } from '../../utils/utils';

class OrgUsers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      orgAdminUsers: [],
      isShowAddOrgAdminDialog: false
    };
  }

  toggleAddOrgAdmin = () => {
    this.setState({ isShowAddOrgAdminDialog: !this.state.isShowAddOrgAdminDialog });
  };

  initOrgAdmin = () => {
    orgAdminAPI.orgAdminListOrgUsers(orgID, true).then(res => {
      let userList = res.data.user_list.map(item => {
        return new OrgUserInfo(item);
      });
      this.setState({ orgAdminUsers: userList });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleOrgAdminDelete = (email, username) => {
    orgAdminAPI.orgAdminDeleteOrgUser(orgID, email).then(res => {
      this.setState({
        orgAdminUsers: this.state.orgAdminUsers.filter(item => item.email != email)
      });
      let msg = gettext('Deleted user %s');
      msg = msg.replace('%s', username);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleRevokeAdmin = (email) => {
    orgAdminAPI.orgAdminSetOrgAdmin(orgID, email, false).then(res => {
      this.setState({
        orgAdminUsers: this.state.orgAdminUsers.filter(item => item.email != email)
      });
      let msg = gettext('Successfully revoke the admin permission of %s');
      msg = msg.replace('%s', res.data.name);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onAddedOrgAdmin = (userInfo) => {
    this.state.orgAdminUsers.unshift(userInfo);
    this.setState({
      orgAdminUsers: this.state.orgAdminUsers
    });
    let msg = gettext('Successfully set %s as admin.');
    msg = msg.replace('%s', userInfo.name);
    toaster.success(msg);
    this.toggleAddOrgAdmin();
  };

  changeStatus = (email, isActive) => {
    orgAdminAPI.orgAdminChangeOrgUserStatus(orgID, email, isActive).then(res => {
      let users = this.state.orgAdminUsers.map(item => {
        if (item.email == email) {
          item['is_active'] = res.data['is_active'];
        }
        return item;
      });
      this.setState({ orgAdminUsers: users });
      toaster.success(gettext('Edit succeeded.'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const topBtn = 'btn btn-secondary operation-item';
    let topbarChildren;
    topbarChildren = (
      <>
        <button
          className={topBtn}
          title={gettext('Add admin')}
          onClick={this.toggleAddOrgAdmin}
          aria-label={gettext('Add admin')}
        >
          <i className="sf3-font sf3-font-enlarge text-secondary mr-1" aria-hidden="true"></i>
          {gettext('Add admin')}
        </button>
        {this.state.isShowAddOrgAdminDialog &&
        <ModalPortal>
          <AddOrgAdminDialog toggle={this.toggleAddOrgAdmin} onAddedOrgAdmin={this.onAddedOrgAdmin}/>
        </ModalPortal>
        }
      </>
    );

    return (
      <>
        <MainPanelTopbar children={topbarChildren}/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <Nav currentItem="admins" />
            <OrgAdminList
              currentTab="admins"
              toggleDelete={this.toggleOrgAdminDelete}
              toggleRevokeAdmin={this.toggleRevokeAdmin}
              orgAdminUsers={this.state.orgAdminUsers}
              initOrgAdmin={this.initOrgAdmin}
              changeStatus={this.changeStatus}
            />
          </div>
        </div>
      </>
    );
  }
}

export default OrgUsers;
