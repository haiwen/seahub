import React, { Component, Fragment } from 'react';
import { navigate } from '@reach/router';
import Nav from './org-users-nav';
import OrgUsersList from './org-users-list';
import MainPanelTopbar from './main-panel-topbar';
import ModalPortal from '../../components/modal-portal';
import AddOrgUserDialog from '../../components/dialog/org-add-user-dialog'; 
import InviteUserDialog from '../../components/dialog/org-admin-invite-user-dialog';
import toaster from '../../components/toast';
import { seafileAPI } from '../../utils/seafile-api';
import OrgUserInfo from '../../models/org-user';
import { gettext, invitationLink, orgID } from '../../utils/constants';
import { Utils } from '../../utils/utils';

class OrgUsers extends Component {

  constructor(props) {
    super(props);
    this.state = {
      orgUsers: [],
      page: 1,
      pageNext: false,
      sortBy: '', 
      sortOrder: 'asc',
      isShowAddOrgUserDialog: false,
      isInviteUserDialogOpen: false
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const { page, sortBy, sortOrder } = this.state;
    this.setState({
      /*
        perPage: parseInt(urlParams.get('per_page') || perPage),
        currentPage: parseInt(urlParams.get('page') || currentPage),
        */
      page: parseInt(urlParams.get('page') || page),
      sortBy: urlParams.get('order_by') || sortBy,
      sortOrder: urlParams.get('direction') || sortOrder
    }, () => {
      this.initOrgUsersData(this.state.page);
    });
  }

  sortByQuotaUsage = () => {
    this.setState({
      sortBy: 'quota_usage',
      sortOrder: this.state.sortOrder == 'asc' ? 'desc' : 'asc',
      page: 1
    }, () => {
      let url = new URL(location.href);
      let searchParams = new URLSearchParams(url.search);
      const { page, sortBy, sortOrder } = this.state;
      searchParams.set('page', page);
      searchParams.set('order_by', sortBy);
      searchParams.set('direction', sortOrder);
      url.search = searchParams.toString();
      navigate(url.toString());
      this.initOrgUsersData(page);
    }); 
  }

  toggleAddOrgUser = () => {
    this.setState({isShowAddOrgUserDialog: !this.state.isShowAddOrgUserDialog});
  }

  toggleInviteUserDialog = () => {
    this.setState({isInviteUserDialogOpen: !this.state.isInviteUserDialogOpen});
  }

  initOrgUsersData = (page) => {
    const { sortBy, sortOrder } = this.state;
    seafileAPI.orgAdminListOrgUsers(orgID, '', page, sortBy, sortOrder).then(res => {
      let userList = res.data.user_list.map(item => {
        return new OrgUserInfo(item);
      });
      this.setState({
        orgUsers: userList,
        pageNext: res.data.page_next,
        page: res.data.page,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  addOrgUser = (email, name, password) => {
    seafileAPI.orgAdminAddOrgUser(orgID, email, name, password).then(res => {
      let userInfo = new OrgUserInfo(res.data);
      this.state.orgUsers.unshift(userInfo);
      this.setState({
        orgUsers: this.state.orgUsers 
      });
      this.toggleAddOrgUser();
      let msg = gettext('successfully added user %s.');
      msg = msg.replace('%s', email);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
      this.toggleAddOrgUser();
    });
  }

  toggleOrgUsersDelete = (email) => {
    seafileAPI.orgAdminDeleteOrgUser(orgID, email).then(res => {
      let users = this.state.orgUsers.filter(item => item.email != email);
      this.setState({orgUsers: users});
      let msg = gettext('Successfully deleted %s');
      msg = msg.replace('%s', email);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  } 

  render() {
    const topBtn = 'btn btn-secondary operation-item';
    let topbarChildren;
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

    return (
      <Fragment>
        <MainPanelTopbar children={topbarChildren}/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <Nav currentItem="all" />
            <OrgUsersList
              initOrgUsersData={this.initOrgUsersData}
              toggleDelete={this.toggleOrgUsersDelete}
              orgUsers={this.state.orgUsers}
              page={this.state.page}
              pageNext={this.state.pageNext}
              sortBy={this.state.sortBy}
              sortOrder={this.state.sortOrder}
              sortByQuotaUsage={this.sortByQuotaUsage}
            />
          </div>
        </div>
      </Fragment>
    );
  }
}

export default OrgUsers;
