import React, { Component, Fragment } from 'react';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext, isPro, mediaUrl, logoPath, faviconPath, loginBGPath } from '../../../utils/constants';
import Loading from '../../../components/loading';
import toaster from '../../../components/toast';
import MainPanelTopbar from '../main-panel-topbar';
import Section from '../../common-admin/web-settings/section';
import CheckboxItem from '../../common-admin/web-settings/checkbox-item';
import FileItem from '../../common-admin/web-settings/file-item';
import InputItem from './input-item';

import '../../../css/system-admin-web-settings.css';

class WebSettings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      config_dict: null,
      logoPath: mediaUrl + logoPath,
      faviconPath: mediaUrl + faviconPath,
      loginBGPath: mediaUrl + loginBGPath
    };
  }

  componentDidMount() {
    systemAdminAPI.sysAdminGetSysSettingInfo().then((res) => {
      this.setState({
        loading: false,
        config_dict: res.data
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  saveSetting = (key, value) => {
    systemAdminAPI.sysAdminSetSysSettingInfo(key, value).then((res) => {
      this.setState({
        config_dict: res.data
      });
      toaster.success(gettext('System settings updated'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  postFile = (file, fileType) => {
    let postFile;
    if (fileType == 'Logo') {
      postFile = systemAdminAPI.sysAdminUpdateLogo(file);
    } else if (fileType == 'Favicon') {
      postFile = systemAdminAPI.sysAdminUpdateFavicon(file);
    } else if (fileType == 'loginBGImage') {
      postFile = systemAdminAPI.sysAdminUpdateLoginBG(file);
    }
    postFile.then((res) => {
      if (fileType == 'Logo') {
        this.setState({
          logoPath: res.data.logo_path
        });
      } else if (fileType == 'Favicon') {
        this.setState({
          faviconPath: res.data.favicon_path
        });
      } else if (fileType == 'loginBGImage') {
        this.setState({
          loginBGPath: res.data.login_bg_image_path
        });
      }
      toaster.success(gettext('System settings updated'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { loading, errorMsg, config_dict, logoPath, faviconPath, loginBGPath } = this.state;
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('Settings')}</h3>
            </div>
            <div className="cur-view-content container mw-100">
              {loading && <Loading />}
              {errorMsg && <p className="error text-center mt-4">{errorMsg}</p>}
              {(!loading && !errorMsg) && config_dict &&
              <Fragment>
                <p className="small text-secondary my-4">{gettext('Note: Settings via web interface are saved in database table (seahub-db/constance_config). They have a higher priority over the settings in config files.')}</p>

                <Section headingText={gettext('Branding')}>
                  <Fragment>
                    <InputItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Site title')}
                      keyText='SITE_TITLE'
                      value={config_dict['SITE_TITLE']}
                      helpTip={gettext('Site title shown in a browser tab')}
                    />
                    <InputItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Site name')}
                      keyText='SITE_NAME'
                      value={config_dict['SITE_NAME']}
                      helpTip={gettext('Site name used in email sending')}
                    />
                    <FileItem
                      postFile={this.postFile}
                      displayName={gettext('Logo')}
                      keyText='Logo'
                      filePath={logoPath}
                      fileWidth={256}
                      fileHeight={64}
                      helpTip='logo.png, 256px * 64px'
                    />
                    <FileItem
                      postFile={this.postFile}
                      displayName={gettext('Favicon')}
                      keyText='Favicon'
                      filePath={faviconPath}
                      fileWidth={32}
                      fileHeight={32}
                      helpTip='favicon.ico, 32px * 32px'
                    />
                    <FileItem
                      postFile={this.postFile}
                      displayName={gettext('Login background image')}
                      keyText='loginBGImage'
                      filePath={loginBGPath}
                      fileWidth={240}
                      fileHeight={160}
                      helpTip='login-bg.jpg, 2400px * 1600px'
                    />
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Enable branding CSS')}
                      keyText='ENABLE_BRANDING_CSS'
                      value={config_dict['ENABLE_BRANDING_CSS']}
                      helpTip={gettext('Use custom CSS')}
                    />
                    <InputItem
                      inputType="textarea"
                      saveSetting={this.saveSetting}
                      displayName={gettext('Custom CSS')}
                      keyText='CUSTOM_CSS'
                      value={config_dict['CUSTOM_CSS']}
                      helpTip=''
                    />
                  </Fragment>
                </Section>

                <Section headingText={gettext('User')}>
                  <Fragment>
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Allow new registrations')}
                      keyText='ENABLE_SIGNUP'
                      value={config_dict['ENABLE_SIGNUP']}
                      helpTip={gettext('Allow new user registrations. Uncheck this to prevent anyone from creating a new account.')}
                    />
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Activate after registration')}
                      keyText='ACTIVATE_AFTER_REGISTRATION'
                      value={config_dict['ACTIVATE_AFTER_REGISTRATION']}
                      helpTip={gettext('Activate user immediately after registration. If unchecked, a user need to be activated by administrator or via activation email')}
                    />
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Send activation email')}
                      keyText='REGISTRATION_SEND_MAIL'
                      value={config_dict['REGISTRATION_SEND_MAIL']}
                      helpTip={gettext('Send activation Email after user registration.')}
                    />
                    <InputItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Keep sign in')}
                      keyText='LOGIN_REMEMBER_DAYS'
                      value={config_dict['LOGIN_REMEMBER_DAYS']}
                      helpTip={gettext('Number of days that keep user sign in.')}
                    />
                    <InputItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Login attempt limit')}
                      keyText='LOGIN_ATTEMPT_LIMIT'
                      value={config_dict['LOGIN_ATTEMPT_LIMIT']}
                      helpTip={gettext('The maximum number of failed login attempts before showing CAPTCHA.')}
                    />
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Freeze user on login failed')}
                      keyText='FREEZE_USER_ON_LOGIN_FAILED'
                      value={config_dict['FREEZE_USER_ON_LOGIN_FAILED']}
                      helpTip={gettext('Freeze user account when failed login attempts exceed limit.')}
                    />
                  </Fragment>
                </Section>

                <Section headingText={gettext('Groups')}>
                  <CheckboxItem
                    saveSetting={this.saveSetting}
                    displayName={gettext('Enable sharing to all groups')}
                    keyText='ENABLE_SHARE_TO_ALL_GROUPS'
                    value={config_dict['ENABLE_SHARE_TO_ALL_GROUPS']}
                    helpTip={gettext('Enable users to share libraries to any groups in the system.')}
                  />
                </Section>

                <Section headingText={gettext('Password')}>
                  <Fragment>
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Strong password')}
                      keyText='USER_STRONG_PASSWORD_REQUIRED'
                      value={config_dict['USER_STRONG_PASSWORD_REQUIRED']}
                      helpTip={gettext('Force user to use a strong password when sign up or change password.')}
                    />
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Force password change')}
                      keyText='FORCE_PASSWORD_CHANGE'
                      value={config_dict['FORCE_PASSWORD_CHANGE']}
                      helpTip={gettext('Force user to change password when account is newly added or reset by admin')}
                    />
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Enable two factor authentication')}
                      keyText='ENABLE_TWO_FACTOR_AUTH'
                      value={config_dict['ENABLE_TWO_FACTOR_AUTH']}
                      helpTip={gettext('Enable two factor authentication')}
                    />
                  </Fragment>
                </Section>

                <Section headingText={gettext('Library')}>
                  <Fragment>
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Library history')}
                      keyText='ENABLE_REPO_HISTORY_SETTING'
                      value={config_dict['ENABLE_REPO_HISTORY_SETTING']}
                      helpTip={gettext('Allow users to change library history settings')}
                    />
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Encrypted library')}
                      keyText='ENABLE_ENCRYPTED_LIBRARY'
                      value={config_dict['ENABLE_ENCRYPTED_LIBRARY']}
                      helpTip={gettext('Allow users to create encrypted libraries')}
                    />
                    <InputItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Library password minimum length')}
                      keyText='REPO_PASSWORD_MIN_LENGTH'
                      value={config_dict['REPO_PASSWORD_MIN_LENGTH']}
                      helpTip={gettext('The least number of characters an encrypted library password should include.')}
                    />
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Share/upload link force password')}
                      keyText='SHARE_LINK_FORCE_USE_PASSWORD'
                      value={config_dict['SHARE_LINK_FORCE_USE_PASSWORD']}
                      helpTip={gettext('Force users to use password when generating share/upload link.')}
                    />
                    <InputItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Share/upload link password minimum length')}
                      keyText='SHARE_LINK_PASSWORD_MIN_LENGTH'
                      value={config_dict['SHARE_LINK_PASSWORD_MIN_LENGTH']}
                      helpTip={gettext('The least number of characters a share/upload link password should include.')}
                    />
                    <InputItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Share/upload link password strength level')}
                      keyText='SHARE_LINK_PASSWORD_STRENGTH_LEVEL'
                      value={config_dict['SHARE_LINK_PASSWORD_STRENGTH_LEVEL']}
                      helpTip={gettext('The level(1-4) of a share/upload link password\'s strength. For example, \'3\' means password must have at least 3 of the following: num, upper letter, lower letter and other symbols')}
                    />
                    <CheckboxItem
                      saveSetting={this.saveSetting}
                      displayName={gettext('Enable users to clean trash')}
                      keyText='ENABLE_USER_CLEAN_TRASH'
                      value={config_dict['ENABLE_USER_CLEAN_TRASH']}
                      helpTip={gettext('Allow users to clean library trash')}
                    />
                  </Fragment>
                </Section>

                <Section headingText={gettext('Online Preview')}>
                  <InputItem
                    inputType="textarea"
                    saveSetting={this.saveSetting}
                    displayName={gettext('Text file extensions')}
                    keyText='TEXT_PREVIEW_EXT'
                    value={config_dict['TEXT_PREVIEW_EXT']}
                    helpTip={gettext('Extensions of text files that can be online previewed, each suffix is separated by a comma.')}
                  />
                </Section>

                <Section headingText={gettext('Sync')}>
                  <CheckboxItem
                    saveSetting={this.saveSetting}
                    displayName={gettext('Disable sync with any folder')}
                    keyText='DISABLE_SYNC_WITH_ANY_FOLDER'
                    value={config_dict['DISABLE_SYNC_WITH_ANY_FOLDER']}
                    helpTip={gettext('If turn on, the desktop clients will not be able to sync a folder outside the default Seafile folder.')}
                  />
                </Section>

                {isPro &&
                <Section headingText={gettext('Terms')}>
                  <CheckboxItem
                    saveSetting={this.saveSetting}
                    displayName={gettext('Enable terms and conditions')}
                    keyText='ENABLE_TERMS_AND_CONDITIONS'
                    value={config_dict['ENABLE_TERMS_AND_CONDITIONS']}
                    helpTip={gettext('Enable system admin to add Terms and Conditions, and all users will have to accept the terms.')}
                  />
                </Section>
                }
              </Fragment>
              }
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default WebSettings;
