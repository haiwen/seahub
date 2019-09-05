import React, { Component, Fragment } from 'react';
import { gettext } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import Account from '../../../components/common/account';
import Loading from '../../../components/loading';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import { logoPath, faviconPath, loginBGPath } from '../../../utils/constants'
import WebSettingInput from './web-settings-input';
import WebSettingFile from './web-settings-file';
import WebSettingCheckbox from './web-settings-checkbox';
import WebSettingTextArea from './web-settings-textarea';
import { mediaUrl } from '../../../utils/constants';

class WebSettings extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      config_dict: {},
      logoPath: mediaUrl + logoPath,
      faviconPath: mediaUrl + faviconPath,
      loginBGPath: mediaUrl + loginBGPath
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminGetSysSettingInfo().then((res) => {
      this.setState({
        loading: false,
        config_dict: res.data
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  saveSetting = (key, value) => {
    seafileAPI.sysAdminSetSysSettingInfo(key, value).then((res) => {
      this.setState({
        config_dict: res.data
      });
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  postFile = (file, fileType) => {
    let postFile;
    if (fileType == 'Logo') {
      postFile = seafileAPI.sysAdminUpdateLogo(file);
    } else if (fileType == 'Favicon') {
      postFile = seafileAPI.sysAdminUpdateFavicon(file);
    } else if (fileType == 'loginBGImage') {
      postFile = seafileAPI.sysAdminUpdateLoginBG(file);
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
      this.forceUpdate();
      toaster.success(gettext('Success'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    }); 
  }

  render() {
    let { loading, errorMsg, config_dict, logoPath, faviconPath, loginBGPath } = this.state;
    return (
      <Fragment>
        <div className="main-panel-north border-left-show">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu"></span>
          </div>
          <div className="common-toolbar">
            <Account isAdminPanel={true} />
          </div>
        </div>
        <div className="main-panel-center flex-row">
          {loading && <Loading />}
          {errorMsg && <p className="error text-center">{errorMsg}</p>}
          {(!loading && !errorMsg) && config_dict && 
            <div className="cur-view-container">
              <div className="cur-view-path">
                <h3 className="hd">{gettext('Settings')}</h3>
              </div>
              <p style={{color:'#999999'}}>{gettext('Note: Settings via web interface are saved in database table (seahub-db/constance_config). They have a higher priority over the settings in config files.')}</p>
              <div className="cur-view-content">
                <h4 style={{backgroundColor:'#eeeeee'}}>URL</h4>
                <WebSettingInput
                  saveSetting={this.saveSetting}
                  displayName='SERVICE_URL'
                  keyText='SERVICE_URL'
                  value={config_dict['SERVICE_URL']}
                  helpTip={gettext('The URL of the server, like https://seafile.example.com or http://192.168.1.2:8000')}
                />
                <WebSettingInput
                  saveSetting={this.saveSetting}
                  displayName='FILE_SERVER_ROOT'
                  keyText='FILE_SERVER_ROOT'
                  value={config_dict['FILE_SERVER_ROOT']}
                  helpTip={gettext('The internal URL for downloading/uploading files. Users will not be able to download/upload files if this is not set correctly. If you config Seafile behind Nginx/Apache, it should be SERVICE_URL/seafhttp, like https://seafile.example.com/seafhttp .')}
                />
                <h4 style={{backgroundColor:'#eeeeee'}}>{gettext('Branding')}</h4>
                <WebSettingInput
                  saveSetting={this.saveSetting}
                  displayName='SITE_TITLE'
                  keyText='SITE_TITLE'
                  value={config_dict['SITE_TITLE']}
                  helpTip={gettext('Site title shown in a browser tab')}
                />
                <WebSettingInput
                  saveSetting={this.saveSetting}
                  displayName='SITE_NAME'
                  keyText='SITE_NAME'
                  value={config_dict['SITE_NAME']}
                  helpTip={gettext('Site name used in email sending')}
                />
                <WebSettingFile
                  postFile={this.postFile}
                  displayName='Logo'
                  keyText='Logo'
                  filePath={logoPath}
                  fileWidth={256}
                  fileHeight={64}
                  helpTip='logo.png, 256px * 64px'
                />
                <WebSettingFile
                  postFile={this.postFile}
                  displayName='Favicon'
                  keyText='Favicon'
                  filePath={faviconPath}
                  fileWidth={32}
                  fileHeight={32}
                  helpTip='favicon.ico, 32px * 32px'
                />
                <WebSettingFile
                  postFile={this.postFile}
                  displayName={gettext('Login Background Image')}
                  keyText='loginBGImage'
                  filePath={loginBGPath}
                  fileWidth={240}
                  fileHeight={160}
                  helpTip='login-bg.jpg, 2400px * 1600px'
                />
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='ENABLE_BRANDING_CSS'
                  keyText='ENABLE_BRANDING_CSS'
                  value={config_dict['ENABLE_BRANDING_CSS']}
                  helpTip={gettext('Use custom CSS')}
                />
                <WebSettingTextArea
                  saveSetting={this.saveSetting}
                  displayName='CUSTOM_CSS'
                  keyText='CUSTOM_CSS'
                  value={config_dict['CUSTOM_CSS']}
                  helpTip=''
                />
                <h4 style={{backgroundColor:'#eeeeee'}}>{gettext('User')}</h4>
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName={gettext('allow new registrations')}
                  keyText='ENABLE_SIGNUP'
                  value={config_dict['ENABLE_SIGNUP']}
                  helpTip={gettext('Allow new user registrations. Uncheck this to prevent anyone from creating a new account.')}
                />
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName={gettext('activate after registration')}
                  keyText='ACTIVATE_AFTER_REGISTRATION'
                  value={config_dict['ACTIVATE_AFTER_REGISTRATION']}
                  helpTip={gettext('Activate user immediately after registration. If unchecked, a user need to be activated by administrator or via activation email')}
                />
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName={gettext('send activation email')}
                  keyText='REGISTRATION_SEND_MAIL'
                  value={config_dict['REGISTRATION_SEND_MAIL']}
                  helpTip={gettext('Send activation Email after user registration.')}
                />
                <WebSettingInput
                  saveSetting={this.saveSetting}
                  displayName={gettext('keep sign in')}
                  keyText='LOGIN_REMEMBER_DAYS'
                  value={config_dict['LOGIN_REMEMBER_DAYS']}
                  helpTip={gettext('Number of days that keep user sign in.')}
                />
                <WebSettingInput
                  saveSetting={this.saveSetting}
                  displayName='LOGIN_ATTEMPT_LIMIT'
                  keyText='LOGIN_ATTEMPT_LIMIT'
                  value={config_dict['LOGIN_ATTEMPT_LIMIT']}
                  helpTip={gettext('The maximum number of failed login attempts before showing CAPTCHA.')}
                />
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='FREEZE_USER_ON_LOGIN_FAILED'
                  keyText='FREEZE_USER_ON_LOGIN_FAILED'
                  value={config_dict['FREEZE_USER_ON_LOGIN_FAILED']}
                  helpTip={gettext('Freeze user account when failed login attempts exceed limit.')}
                />
                <h4 style={{backgroundColor:'#eeeeee'}}>{gettext('Groups')}</h4>
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='ENABLE_SHARE_TO_ALL_GROUPS'
                  keyText='ENABLE_SHARE_TO_ALL_GROUPS'
                  value={config_dict['ENABLE_SHARE_TO_ALL_GROUPS']}
                  helpTip={gettext('Enable users to share libraries to any groups in the system.')}
                />
                <h4>{gettext('Password')}</h4>
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='strong password'
                  keyText='USER_STRONG_PASSWORD_REQUIRED'
                  value={config_dict['USER_STRONG_PASSWORD_REQUIRED']}
                  helpTip={gettext('Force user to use a strong password when sign up or change password.')}
                />
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='force password change'
                  keyText='FORCE_PASSWORD_CHANGE'
                  value={config_dict['FORCE_PASSWORD_CHANGE']}
                  helpTip={gettext('Force user to change password when account is newly added or reset by admin')}
                />
                <WebSettingInput
                  saveSetting={this.saveSetting}
                  displayName={gettext('password minimum length')}
                  keyText='USER_PASSWORD_MIN_LENGTH'
                  value={config_dict['USER_PASSWORD_MIN_LENGTH']}
                  helpTip={gettext('The least number of characters an account password should include.')}
                />
                <WebSettingInput
                  saveSetting={this.saveSetting}
                  displayName={gettext('password strength level')}
                  keyText='USER_PASSWORD_STRENGTH_LEVEL'
                  value={config_dict['USER_PASSWORD_STRENGTH_LEVEL']}
                  helpTip={gettext('The level(1-4) of an account password\'s strength. For example, \'3\' means password must have at least 3 of the following: num, upper letter, lower letter and other symbols')}
                />
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='enable two factor authentication'
                  keyText='ENABLE_TWO_FACTOR_AUTH'
                  value={config_dict['ENABLE_TWO_FACTOR_AUTH']}
                  helpTip={gettext('Enable two factor authentication')}
                />
                <h4 style={{backgroundColor:'#eeeeee'}}>{gettext('Library')}</h4>
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='library history'
                  keyText='ENABLE_REPO_HISTORY_SETTING'
                  value={config_dict['ENABLE_REPO_HISTORY_SETTING']}
                  helpTip={gettext('Allow user to change library history settings')}
                />
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='encrypted library'
                  keyText='ENABLE_ENCRYPTED_LIBRARY'
                  value={config_dict['ENABLE_ENCRYPTED_LIBRARY']}
                  helpTip={gettext('Allow user to create encrypted libraries')}
                />
                <WebSettingInput
                  saveSetting={this.saveSetting}
                  displayName={gettext('library password minimum length')}
                  keyText='REPO_PASSWORD_MIN_LENGTH'
                  value={config_dict['REPO_PASSWORD_MIN_LENGTH']}
                  helpTip={gettext('The least number of characters an encrypted library password should include.')}
                />
                <WebSettingInput
                  saveSetting={this.saveSetting}
                  displayName={gettext('download/upload link password minimum length')}
                  keyText='SHARE_LINK_PASSWORD_MIN_LENGTH'
                  value={config_dict['SHARE_LINK_PASSWORD_MIN_LENGTH']}
                  helpTip={gettext('The least number of characters a download/upload link password should include.')}
                />
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='ENABLE_USER_CREATE_ORG_REPO'
                  keyText='ENABLE_USER_CREATE_ORG_REPO'
                  value={config_dict['ENABLE_USER_CREATE_ORG_REPO']}
                  helpTip={gettext('Allow user to add organization libraries. Otherwise, only system admin can add organization libraries.')}
                />
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='ENABLE_USER_CLEAN_TRASH'
                  keyText='ENABLE_USER_CLEAN_TRASH'
                  value={config_dict['ENABLE_USER_CLEAN_TRASH']}
                  helpTip={gettext('Allow user to clean library trash')}
                />
                <h4 style={{backgroundColor:'#eeeeee'}}>{gettext('Online Preview')}</h4>
                <WebSettingTextArea
                  saveSetting={this.saveSetting}
                  displayName={gettext('text file extensions')}
                  keyText='TEXT_PREVIEW_EXT'
                  value={config_dict['TEXT_PREVIEW_EXT']}
                  helpTip={gettext('Extensions of text files that can be online previewed, each suffix is separated by a comma.')}
                />
                <h4 style={{backgroundColor:'#eeeeee'}}>{gettext('Sync')}</h4>
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='DISABLE_SYNC_WITH_ANY_FOLDER'
                  keyText='DISABLE_SYNC_WITH_ANY_FOLDER'
                  value={config_dict['DISABLE_SYNC_WITH_ANY_FOLDER']}
                  helpTip={gettext('If turn on, the desktop clients will not be able to sync a folder outside the default Seafile folder.')}
                />
                <h4 style={{backgroundColor:'#eeeeee'}}>{gettext('Terms')}</h4>
                <WebSettingCheckbox
                  saveSetting={this.saveSetting}
                  displayName='ENABLE_TERMS_AND_CONDITIONS'
                  keyText='ENABLE_TERMS_AND_CONDITIONS'
                  value={config_dict['ENABLE_TERMS_AND_CONDITIONS']}
                  helpTip={gettext('Enable system admin to add Terms and Conditions, and all users will have to accept the terms.')}
                />
              </div>
            </div>
          }
        </div>
      </Fragment>
    );
  }
}

export default WebSettings;
