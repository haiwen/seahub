import React from 'react';
import { createRoot } from 'react-dom/client';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { Utils } from './utils/utils';
import { isPro, isDBSqlite3, gettext } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import toaster from './components/toast';
import MainPanel from './components/main-panel';
import SettingSidePanel from './components/user-settings/setting-side-panel';
import SettingTopToolbar from './components/user-settings/setting-top-toolbar';
import UserAvatarForm from './components/user-settings/user-avatar-form';
import UserBasicInfoForm from './components/user-settings/user-basic-info-form';
import WebAPIAuthToken from './components/user-settings/web-api-auth-token';
import WebdavPassword from './components/user-settings/webdav-password';
import LanguageSetting from './components/user-settings/language-setting';
import ListInAddressBook from './components/user-settings/list-in-address-book';
import EmailNotice from './components/user-settings/email-notice';
import TwoFactorAuthentication from './components/user-settings/two-factor-auth';
import SocialLogin from './components/user-settings/social-login';
import SocialLoginDingtalk from './components/user-settings/social-login-dingtalk';
import SocialLoginWeixin from './components/user-settings/social-login-weixin';
import SocialLoginSAML from './components/user-settings/social-login-saml';
import LinkedDevices from './components/user-settings/linked-devices';
import DeleteAccount from './components/user-settings/delete-account';
import UserSetPassword from './components/dialog/user-password-widgets/user-set-password-dialog';
import UserUpdatePassword from './components/dialog/user-password-widgets/user-update-password-dialog';

import './css/layout.css';
import './css/toolbar.css';
import './css/search.css';

import './css/user-settings.css';

const {
  canUpdatePassword, passwordOperationText,
  enableGetAuthToken,
  enableWebdavSecret,
  enableAddressBook,
  twoFactorAuthEnabled,
  enableWechatWork,
  enableDingtalk,
  enableWeixin,
  isOrgContext,
  enableADFS,
  enableMultiADFS,
  enableDeleteAccount,
  userUnusablePassword
} = window.app.pageOptions;

class Settings extends React.Component {

  constructor(props) {
    super(props);
    this.sideNavItems = [
      { show: true, href: '#user-basic-info', text: gettext('Profile') },
      { show: canUpdatePassword, href: '#update-user-passwd', text: gettext('Password') },
      { show: enableGetAuthToken, href: '#get-auth-token', text: gettext('Web API Auth Token') },
      { show: enableWebdavSecret, href: '#update-webdav-passwd', text: gettext('WebDAV Access') },
      { show: enableAddressBook, href: '#list-in-address-book', text: gettext('Global Address Book') },
      { show: true, href: '#lang-setting', text: gettext('Language') },
      { show: isPro, href: '#email-notice', text: gettext('Email Notification') },
      { show: twoFactorAuthEnabled, href: '#two-factor-auth', text: gettext('Two-Factor Authentication') },
      { show: (enableWechatWork || enableDingtalk || enableWeixin || enableADFS || (enableMultiADFS && isOrgContext)), href: '#social-auth', text: gettext('Single Sign On (SSO)') },
      { show: true, href: '#linked-devices', text: gettext('Linked Devices') },
      { show: enableDeleteAccount, href: '#del-account', text: gettext('Delete Account') },
    ];

    this.state = {
      isSidePanelClosed: false,
      curItemID: this.sideNavItems[0].href.substr(1),
      isSetPasswordDialogOpen: false,
      isUpdatePasswordDialogOpen: false

    };
  }

  componentDidMount() {
    seafileAPI.getUserInfo().then((res) => {
      this.setState({
        userInfo: res.data
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  updateUserInfo = (data) => {
    seafileAPI.updateUserInfo(data).then((res) => {
      this.setState({
        userInfo: res.data
      });
      toaster.success(gettext('User info updated'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  handleContentScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const scrolled = this.sideNavItems.filter((item, index) => {
      return item.show && document.getElementById(item.href.substr(1)).offsetTop - 45 < scrollTop;
    });
    if (scrolled.length) {
      this.setState({
        curItemID: scrolled[scrolled.length - 1].href.substr(1)
      });
    }
  };

  onCloseSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  };

  onShowSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  };

  toggleSidePanel = () => {
    this.setState({
      isSidePanelClosed: !this.state.isSidePanelClosed
    });
  };

  toggleSetPassword = () => {
    this.setState({ isSetPasswordDialogOpen: !this.state.isSetPasswordDialogOpen });
  };

  toggleUpdatePassword = () => {
    this.setState({ isUpdatePasswordDialogOpen: !this.state.isUpdatePasswordDialogOpen });
  };

  togglePassword = () => {
    if (userUnusablePassword) {
      this.toggleSetPassword();
    } else {
      this.toggleUpdatePassword();
    }
  };

  render() {
    const { isSidePanelClosed } = this.state;
    return (
      <div id="main" className="h-100">
        <SettingSidePanel
          isSidePanelClosed={isSidePanelClosed}
          onCloseSidePanel={this.onCloseSidePanel}
          data={this.sideNavItems}
          curItemID={this.state.curItemID}
        />
        <MainPanel>
          <SettingTopToolbar onShowSidePanel={this.onShowSidePanel} showSearch={false} />
          <div className="main-panel-center flex-row">
            <div className="cur-view-container">
              <div className="cur-view-path">
                <h3 className="sf-heading m-0">{gettext('Settings')}</h3>
              </div>
              <div className="cur-view-content content position-relative" onScroll={this.handleContentScroll}>
                <div id="user-basic-info" className="setting-item">
                  <h3 className="setting-item-heading">{gettext('Profile Setting')}</h3>
                  <UserAvatarForm />
                  {this.state.userInfo && <UserBasicInfoForm userInfo={this.state.userInfo} updateUserInfo={this.updateUserInfo} />}
                </div>
                {canUpdatePassword &&
                <div id="update-user-passwd" className="setting-item">
                  <h3 className="setting-item-heading">{gettext('Password')}</h3>
                  <button className="btn btn-outline-primary ml-2 mb-2" onClick={this.togglePassword}>{passwordOperationText}</button>
                </div>
                }
                {enableGetAuthToken && <WebAPIAuthToken />}
                {enableWebdavSecret && <WebdavPassword />}
                {enableAddressBook && this.state.userInfo &&
                <ListInAddressBook userInfo={this.state.userInfo} updateUserInfo={this.updateUserInfo} />}
                <LanguageSetting />
                {(isPro || !isDBSqlite3) && <EmailNotice />}
                {twoFactorAuthEnabled && <TwoFactorAuthentication />}
                {enableWechatWork && <SocialLogin />}
                {enableDingtalk && <SocialLoginDingtalk />}
                {enableWeixin && <SocialLoginWeixin />}
                {(enableADFS || (enableMultiADFS && isOrgContext)) && <SocialLoginSAML />}
                <LinkedDevices />
                {enableDeleteAccount && <DeleteAccount />}
              </div>
            </div>
          </div>
        </MainPanel>
        <MediaQuery query="(max-width: 767.8px)">
          <Modal zIndex="1030" isOpen={!isSidePanelClosed} toggle={this.toggleSidePanel} contentClassName="d-none"></Modal>
        </MediaQuery>
        {this.state.isSetPasswordDialogOpen && (
          <UserSetPassword
            toggle={this.toggleSetPassword}
          />
        )}
        {this.state.isUpdatePasswordDialogOpen && (
          <UserUpdatePassword
            toggle={this.toggleUpdatePassword}
          />
        )}
      </div>


    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<Settings />);
