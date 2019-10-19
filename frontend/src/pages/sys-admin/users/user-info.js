import React, { Component, Fragment } from 'react';
import { Nav, NavItem, NavLink, TabContent, TabPane, Label } from 'reactstrap';
import { gettext, siteRoot } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import classnames from 'classnames';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import MainPanelTopbar from '../../org-admin/main-panel-topbar';
import UserProfile from './user-profile';
import UserOwnedRepos from './user-owned-repos';
import UserSharedInRepos from './user-share-in-repos';
import UserShareLinks from './user-share-links';
import UserGroups from './user-groups';

class UserInfo extends Component {

  constructor(props) {
    super(props);
    this.state = {
      activeTab: 'profile',
      userInfo: {}
    };
  }

  componentDidMount() {
    seafileAPI.sysAdminGetUserInfo(this.props.email).then(res => {
      this.setState({
        userInfo: res.data,
        loading: false
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

  toggle(tab) {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab
      });
    }
  }

  onNameChanged = (name) => {
    seafileAPI.sysAdminUpdateUserInfo('name', name, this.props.email).then(res => {
      this.setState({
        userInfo: res.data,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onLoginIDChanged = (loginID) => {
    seafileAPI.sysAdminUpdateUserInfo('login_id', loginID, this.props.email).then(res => {
      this.setState({
        userInfo: res.data,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }


  onContactEmailChanged = (contactEmail) => {
    seafileAPI.sysAdminUpdateUserInfo('contact_email', contactEmail, this.props.email).then(res => {
      this.setState({
        userInfo: res.data,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onReferenceIDChanged = (referenceID) => {
    seafileAPI.sysAdminUpdateUserInfo('reference_id', referenceID, this.props.email).then(res => {
      this.setState({
        userInfo: res.data,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  onQuotaChanged = (quota) => {
    seafileAPI.sysAdminUpdateUserInfo('quota_total', quota, this.props.email).then(res => {
      this.setState({
        userInfo: res.data,
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  toggleForce2FA = (isForce2FA) => {
    seafileAPI.sysAdminToggleForceTwoFactorAuth(isForce2FA, this.props.email).then(res => {
      let userInfo = this.state.userInfo;
      userInfo.is_force_2fa = isForce2FA;
      this.setState({userInfo: userInfo});
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  deleteVerified2FADevices = () => {
    seafileAPI.sysAdminDeleteVerifiedTwoFactorAuth(this.props.email).then(res => {
      let userInfo = this.state.userInfo;
      userInfo.has_default_device = false;
      this.setState({userInfo: userInfo});
      toaster.success(gettext('success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar>
          <Fragment>
            <a href={siteRoot + 'sys/users-all/'}>{gettext('Users')}</a>
            {' / '}
            <Label>{this.state.userInfo.name}</Label>
          </Fragment>
        </MainPanelTopbar>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path align-items-center">
              <Nav>
                <NavItem>
                  <NavLink
                    className={classnames({ active: this.state.activeTab === 'profile' })}
                    onClick={() => { this.toggle('profile'); }}>
                    {gettext('Profile')}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({ active: this.state.activeTab === 'ownedLibs' })}
                    onClick={() => { this.toggle('ownedLibs'); }}>
                    {gettext('Owned Libs')}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({ active: this.state.activeTab === 'sharedLibs' })}
                    onClick={() => { this.toggle('sharedLibs'); }}>
                    {gettext('Shared Libs')}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({ active: this.state.activeTab === 'sharedLinks' })}
                    onClick={() => { this.toggle('sharedLinks'); }}>
                    {gettext('Shared Links')}
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={classnames({ active: this.state.activeTab === 'groups' })}
                    onClick={() => { this.toggle('groups'); }}>
                    {gettext('Groups')}
                  </NavLink>
                </NavItem>
              </Nav>
            </div>
            <div className="cur-view-content">
              <TabContent activeTab={this.state.activeTab}>
                <TabPane tabId="profile">
                  {this.state.activeTab === 'profile' &&
                    <UserProfile
                      email={this.props.email}
                      userInfo={this.state.userInfo}
                      onNameChanged={this.onNameChanged}
                      onContactEmailChanged={this.onContactEmailChanged}
                      onLoginIDChanged={this.onLoginIDChanged}
                      onReferenceIDChanged={this.onReferenceIDChanged}
                      onQuotaChanged={this.onQuotaChanged}
                      toggleForce2FA={this.toggleForce2FA}
                      deleteVerified2FADevices={this.deleteVerified2FADevices}
                    />
                  }
                </TabPane>
                <TabPane tabId="ownedLibs">
                  {this.state.activeTab === 'ownedLibs' &&
                    <UserOwnedRepos
                      email={this.props.email}
                    />
                  }
                </TabPane>
                <TabPane tabId="sharedLibs">
                  {this.state.activeTab === 'sharedLibs' &&
                    <UserSharedInRepos
                      email={this.props.email}
                    />
                  }
                </TabPane>
                <TabPane tabId="sharedLinks">
                  {this.state.activeTab === 'sharedLinks' &&
                    <UserShareLinks
                      email={this.props.email}
                    />
                  }
                </TabPane>
                <TabPane tabId="groups">
                  {this.state.activeTab === 'groups' &&
                    <UserGroups
                      email={this.props.email}
                    />
                  }
                </TabPane>
              </TabContent>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default UserInfo;