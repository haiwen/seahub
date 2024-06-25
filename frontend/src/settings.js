import React from 'react';
import ReactDom from 'react-dom';
import MediaQuery from 'react-responsive';
import { Modal } from 'reactstrap';
import { Utils } from './utils/utils';
import { isPro, isDBSqlite3, gettext, siteRoot } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import toaster from './components/toast';
import SidePanel from './components/side-panel';
import MainPanel from './components/main-panel';
import TopToolbar from './components/toolbar/top-toolbar';
import SideNav from './components/user-settings/side-nav';
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
import SocialLoginSAML from './components/user-settings/social-login-saml';
import LinkedDevices from './components/user-settings/linked-devices';
import DeleteAccount from './components/user-settings/delete-account';

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
  isOrgContext,
  enableADFS,
  enableMultiADFS,
  enableDeleteAccount
} = window.app.pageOptions;

class Settings extends React.Component {

  constructor(props) {
    super(props);
    this.sideNavItems = [
      {show: true, href: '#user-basic-info', text: gettext('Profile')},
      {show: canUpdatePassword, href: '#update-user-passwd', text: gettext('Password')},
      {show: enableGetAuthToken, href: '#get-auth-token', text: gettext('Web API Auth Token')},
      {show: enableWebdavSecret, href: '#update-webdav-passwd', text: gettext('WebDav Password')},
      {show: enableAddressBook, href: '#list-in-address-book', text: gettext('Global Address Book')},
      {show: true, href: '#lang-setting', text: gettext('Language')},
      {show: isPro, href: '#email-notice', text: gettext('Email Notification')},
      {show: twoFactorAuthEnabled, href: '#two-factor-auth', text: gettext('Two-Factor Authentication')},
      {show: (enableWechatWork || enableDingtalk || enableADFS || (enableMultiADFS || isOrgContext)), href: '#social-auth', text: gettext('Social Login')},
      {show: true, href: '#linked-devices', text: gettext('Linked Devices')},
      {show: enableDeleteAccount, href: '#del-account', text: gettext('Delete Account')},
    ];

    this.state = {
      isSidePanelClosed: false,
      curItemID: this.sideNavItems[0].href.substr(1)
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
      toaster.success(gettext('Success'));
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
        curItemID: scrolled[scrolled.length -1].href.substr(1)
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

  render() {
    const { isSidePanelClosed } = this.state;
    return (
      <React.Fragment>
        <div id="main" className="h-100">
          <SidePanel
            isSidePanelClosed={isSidePanelClosed}
            onCloseSidePanel={this.onCloseSidePanel}
          >
            <SideNav data={this.sideNavItems} curItemID={this.state.curItemID} />
          </SidePanel>
          <MainPanel>
            <>
              <TopToolbar
                onShowSidePanel={this.onShowSidePanel}
                showSearch={false}
              >
              </TopToolbar>
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
                      <a href={`${siteRoot}accounts/password/change/`} className="btn btn-outline-primary">{passwordOperationText}</a>
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
                    {(enableADFS || (enableMultiADFS && isOrgContext)) && <SocialLoginSAML />}
                    <LinkedDevices />
                    {enableDeleteAccount && <DeleteAccount />}
                  </div>
                </div>
              </div>
            </>
          </MainPanel>
          <MediaQuery query="(max-width: 767.8px)">
            <Modal zIndex="1030" isOpen={!isSidePanelClosed} toggle={this.toggleSidePanel} contentClassName="d-none"></Modal>
          </MediaQuery>
        </div>
      </React.Fragment>
    );
  }
}

ReactDom.render(<Settings />, document.getElementById('wrapper'));
