import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import OrgUsersList from './org-users-list';
import OrgAdminList from './org-admin-list';
import MainPanelTopbar from './main-panel-topbar';
import AddOrgAdminDialog from '../../components/dialog/org-add-admin-dialog';
import ModalPortal from '../../components/modal-portal';
import AddOrgUserDialog from '../../components/dialog/org-add-user-dialog'; 
import InviteUserDialog from '../../components/dialog/org-admin-invite-user-dialog';
import Toast from '../../components/toast';
import { seafileAPI } from '../../utils/seafile-api';
import OrgUserInfo from '../../models/org-user';
import { gettext, invitationLink, orgID } from '../../utils/constants';

class OrgUsers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      orgAdminUsers: [],
      isShowAddOrgAdminDialog: false,
      orgUsers: [],
      page: 1,
      pageNext: false,
      isShowAddOrgUserDialog: false,
      isInviteUserDialogOpen: false,
    };
  }

  tabItemClick = (param) => {
    this.props.tabItemClick(param);
  }

  toggleAddOrgAdmin = () => {
    this.setState({isShowAddOrgAdminDialog: !this.state.isShowAddOrgAdminDialog});
  }

  toggleAddOrgUser = () => {
    this.setState({isShowAddOrgUserDialog: !this.state.isShowAddOrgUserDialog});
  }

  toggleInviteUserDialog = () => {
    this.setState({isInviteUserDialogOpen: !this.state.isInviteUserDialogOpen});
  }

  initOrgUsersData = (page) => {
    seafileAPI.listOrgUsers(orgID, '', page).then(res => {
      let userList = res.data.user_list.map(item => {
        return new OrgUserInfo(item);
      });
      this.setState({
        orgUsers: userList,
        pageNext: res.data.page_next,
        page: res.data.page,
      });
    });
  }

  addOrgUser = (email, name, password) => {
    seafileAPI.addOrgUser(orgID, email, name, password).then(res => {
      let userInfo = new OrgUserInfo(res.data);
      this.state.orgUsers.unshift(userInfo);
      this.setState({
        orgUsers: this.state.orgUsers 
      });
      this.toggleAddOrgUser();
      let msg = gettext('successfully added user %s.');
      msg = msg.replace('%s', email);
      Toast.success(msg);
    }).catch(err => {
      Toast.danger(err.response.data.error_msg);
      this.toggleAddOrgUser();
    });
  }

  toggleOrgUsersDelete = (email) => {
    seafileAPI.deleteOrgUser(orgID, email).then(res => {
      let users = this.state.orgUsers.filter(item => item.email != email);
      this.setState({orgUsers: users});
      let msg = gettext('Successfully deleted %s');
      msg = msg.replace('%s', email);
      Toast.success(msg);
    });
  } 

  initOrgAdmin = () => {
    seafileAPI.listOrgUsers(orgID, true).then(res => {
      let userList = res.data.user_list.map(item => {
        return new OrgUserInfo(item);
      });
      this.setState({orgAdminUsers: userList});
    });
  }

  toggleOrgAdminDelete = (email) => {
    seafileAPI.deleteOrgUser(orgID, email).then(res => {
      this.setState({
        orgAdminUsers: this.state.orgAdminUsers.filter(item => item.email != email)
      });
      let msg = gettext('Successfully deleted %s');
      msg = msg.replace('%s', email);
      Toast.success(msg);
    });
  }

  toggleRevokeAdmin = (email) => {
    seafileAPI.setOrgAdmin(orgID, email, false).then(res => {
      this.setState({
        orgAdminUsers: this.state.orgAdminUsers.filter(item => item.email != email)
      });
      let msg = gettext('Successfully revoke the admin permission of %s');
      msg = msg.replace('%s', email);
      Toast.success(msg);
    });
  }

  onAddedOrgAdmin = (userInfo) => {
    this.state.orgAdminUsers.unshift(userInfo);
    this.setState({
      orgAdminUsers: this.state.orgAdminUsers
    });
    let msg = gettext('Successfully set %s as admin.');
    msg = msg.replace('%s', userInfo.email);
    Toast.success(msg);
    this.toggleAddOrgAdmin();
  } 

  render() {
    const topBtn = 'btn btn-secondary operation-item';
    let topbarChildren;
    if (this.props.currentTab === 'admins') {
      topbarChildren = (
        <Fragment>
          <button className={topBtn} title={gettext('Add admin')} onClick={this.toggleAddOrgAdmin}>
            <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Add admin')}
          </button>
          {this.state.isShowAddOrgAdminDialog &&
            <ModalPortal>
              <AddOrgAdminDialog toggle={this.toggleAddOrgAdmin} onAddedOrgAdmin={this.onAddedOrgAdmin}/>
            </ModalPortal>
          }
        </Fragment>
      );
    } else if (this.props.currentTab === 'users') {
      topbarChildren = (
        <Fragment>
          <button className={topBtn} title={gettext('Add user')} onClick={this.toggleAddOrgUser}>
            <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Add user')}</button>
          {invitationLink &&
            <button className={topBtn} title={gettext('Invite user')} onClick={this.toggleInviteUserDialog}>
              <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Invite user')}</button>
          }
          {this.state.isShowAddOrgUserDialog &&
            <ModalPortal>
              <AddOrgUserDialog handleSubmit={this.addOrgUser} toggle={this.toggleAddOrgUser}/>
            </ModalPortal>
          }
          {this.state.isInviteUserDialogOpen &&
            <ModalPortal>
              <InviteUserDialog invitationLink={invitationLink} toggle={this.toggleInviteUserDialog}/>
            </ModalPortal>
          }
        </Fragment>
      );
    }

    return (
      <Fragment>
        <MainPanelTopbar children={topbarChildren}/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path org-user-nav">
              <ul className="nav">
                <li className="nav-item" onClick={() => this.tabItemClick('users')}>
                  <span className={`nav-link ${this.props.currentTab === 'users' ? 'active': ''}`}>{gettext('All')}</span>
                </li>
                <li className="nav-item" onClick={() => this.tabItemClick('admins')}>
                  <span className={`nav-link ${this.props.currentTab === 'admins' ? 'active': ''}`} >{gettext('Admin')}</span>
                </li>
              </ul>
            </div>
            {this.props.currentTab === 'users' &&
              <OrgUsersList
                currentTab={this.props.currentTab}
                initOrgUsersData={this.initOrgUsersData}
                toggleDelete={this.toggleOrgUsersDelete}
                orgUsers={this.state.orgUsers}
                page={this.state.page}
                pageNext={this.state.pageNext}
              />
            }
            {this.props.currentTab === 'admins' &&
              <OrgAdminList
                currentTab={this.props.currentTab}
                toggleDelete={this.toggleOrgAdminDelete}
                toggleRevokeAdmin={this.toggleRevokeAdmin}
                orgAdminUsers={this.state.orgAdminUsers}
                initOrgAdmin={this.initOrgAdmin}
              />
            }
          </div>
        </div>
      </Fragment>
    );
  }
}

const propTypes = {
  currentTab: PropTypes.string.isRequired,
  tabItemClick: PropTypes.func.isRequired,
};

OrgUsers.propTypes = propTypes;

export default OrgUsers;
