import React from 'react';
import PropTypes from 'prop-types';
import { gettext, orgID, invitationLink } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import OrgUserInfo from '../../models/org-user';
import Toast from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
import AddOrgUserDialog from '../../components/dialog/org-add-user-dialog'; 
import InviteUserDialog from '../../components/dialog/org-admin-invite-user-dialog';
import UserItem from './org-user-item';

const propTypes = {
  currentTab: PropTypes.string.isRequired,
  toggleAddOrgUser: PropTypes.func.isRequired,
  isShowAddOrgUserDialog: PropTypes.bool.isRequired,
  toggleInviteUserDialog: PropTypes.func.isRequired,
  isInviteUserDialogOpen: PropTypes.bool.isRequired
};

class OrgUsersList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      orgUsers: [],
      isItemFreezed: false,
      page: 1,
      pageNext: false,
    };
  }

  componentDidMount() {
    let page = this.state.page;
    this.initData(page);
  }

  initData = (page) => {
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

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  toggleDelete = (email) => {
    seafileAPI.deleteOrgUser(orgID, email).then(res => {
      let users = this.state.orgUsers.filter(item => item.email != email);
      this.setState({orgUsers: users});
      let msg = gettext('Successfully deleted %s');
      msg = msg.replace('%s', email);
      Toast.success(msg);
    });
  } 

  handleSubmit = (email, name, password) => {
    seafileAPI.addOrgUser(orgID, email, name, password).then(res => {
      let userInfo = new OrgUserInfo(res.data);
      this.state.orgUsers.unshift(userInfo);
      this.setState({
        orgUsers: this.state.orgUsers 
      });
      this.props.toggleAddOrgUser();
      let msg;
      msg = gettext('successfully added user %s.');
      msg = msg.replace('%s', email);
      Toast.success(msg);
    }).catch(err => {
      Toast.danger(err.response.data.error_msg);
      this.props.toggleAddOrgUser();
    });
  } 

  onChangePageNum = (e, num) => {
    e.preventDefault();
    let page = this.state.page;

    if (num == 1) {
      page = page + 1;
    } else {
      page = page - 1;
    }

    this.initData(page);
  }

  render() {
    let orgUsers = this.state.orgUsers;

    return (
      <div className="cur-view-content">
        <table>
          <thead>
            <tr>
              <th width="30%">{gettext('Name')}</th>
              <th width="15%">{gettext('Status')}</th>
              <th width="15%">{gettext('Space Used')}</th>
              <th width="20%">{gettext('Create At / Last Login')}</th>
              <th width="20%" className="text-center">{gettext('Operations')}</th>
            </tr>
          </thead>
          <tbody>
            {orgUsers.map(item => {
              return (
                <UserItem 
                  key={item.id}
                  user={item}
                  currentTab={this.props.currentTab}
                  isItemFreezed={this.state.isItemFreezed}
                  toggleDelete={this.toggleDelete}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
                />
              );})}
          </tbody>
        </table>
        <div className="paginator">
          {this.state.page !=1 && <a href="#" onClick={(e) => this.onChangePageNum(e, -1)}>{gettext('Previous')}</a>}
          {(this.state.page != 1 && this.state.pageNext) && <span> | </span>}
          {this.state.pageNext && <a href="#" onClick={(e) => this.onChangePageNum(e, 1)}>{gettext('Next')}</a>}
        </div>
        {this.props.isShowAddOrgUserDialog && (
          <ModalPortal>
            <AddOrgUserDialog toggle={this.props.toggleAddOrgUser} handleSubmit={this.handleSubmit} />
          </ModalPortal>
        )}
        {this.props.isInviteUserDialogOpen && (
          <ModalPortal>
            <InviteUserDialog invitationLink={invitationLink} toggle={this.props.toggleInviteUserDialog} />
          </ModalPortal>
        )}
      </div>
    );
  }
}

OrgUsersList.propTypes = propTypes;

export default OrgUsersList;
