import React from 'react';
import ReactDom from 'react-dom';
import { navigate } from '@gatsbyjs/reach-router';
import { Utils } from './utils/utils';
import { isPro, gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import toaster from './components/toast';
import CommonToolbar from './components/toolbar/common-toolbar';
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
import DeleteAccount from './components/user-settings/delete-account';

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
      {show: enableWechatWork, href: '#social-auth', text: gettext('Social Login')},
      {show: enableDingtalk, href: '#social-auth', text: gettext('Social Login')},
      {show: enableDeleteAccount, href: '#del-account', text: gettext('Delete Account')},
    ];

    this.state = {
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
  }

  onSearchedClick = (selectedItem) => {
    if (selectedItem.is_dir === true) {
      let url = siteRoot + 'library/' + selectedItem.repo_id + '/' + selectedItem.repo_name + selectedItem.path;
      navigate(url, {repalce: true});
    } else {
      let url = siteRoot + 'lib/' + selectedItem.repo_id + '/file' + Utils.encodePath(selectedItem.path);
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  }

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
  }

  render() {
    return (
      <React.Fragment>
        <div className="h-100 d-flex flex-column">
          <div className="top-header d-flex justify-content-between">
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
            <CommonToolbar onSearchedClick={this.onSearchedClick} />
          </div>
          <div className="flex-auto d-flex o-hidden">
            <div className="side-panel o-auto">
              <SideNav data={this.sideNavItems} curItemID={this.state.curItemID} />
            </div>
            <div className="main-panel d-flex flex-column">
              <h2 className="heading">{gettext('Settings')}</h2>
              <div className="content position-relative" onScroll={this.handleContentScroll}>
                <div id="user-basic-info" className="setting-item">
                  <h3 className="setting-item-heading">{gettext('Profile Setting')}</h3>
                  <UserAvatarForm  />
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
                {isPro && <EmailNotice />}
                {twoFactorAuthEnabled && <TwoFactorAuthentication />}
                {enableWechatWork && <SocialLogin />}
                {enableDingtalk && <SocialLoginDingtalk />}
                {enableDeleteAccount && <DeleteAccount />}
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

ReactDom.render(<Settings />, document.getElementById('wrapper'));
