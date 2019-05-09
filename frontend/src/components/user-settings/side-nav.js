import React from 'react';
import { isPro, gettext } from '../../utils/constants';

const {
  canUpdatePassword,
  enableAddressBook,
  enableWebdavSecret,
  twoFactorAuthEnabled,
  enableWechatWork,
  enableDeleteAccount
} = window.app.pageOptions;

class SideNav extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    return (
      <ul className="nav flex-column user-setting-nav">
        <li className="nav-item"><a className="nav-link" href="#user-basic-info">{gettext('Profile')}</a></li>
        {canUpdatePassword &&  
        <li className="nav-item"><a className="nav-link" href="#update-user-passwd">{gettext('Password')}</a></li>
        }   
        {enableWebdavSecret &&
        <li className="nav-item"><a className="nav-link" href="#update-webdav-passwd">{gettext('WebDav Password')}</a></li>
        }   
        {enableAddressBook &&
        <li className="nav-item"><a className="nav-link" href="#list-in-address-book">{gettext('Global Address Book')}</a></li>
        }   
        <li className="nav-item"><a className="nav-link" href="#lang-setting">{gettext('Language')}</a></li>
        {isPro &&
        <li className="nav-item"><a className="nav-link" href="#email-notice">{gettext('Email Notification')}</a></li>
        }   
        {twoFactorAuthEnabled &&
        <li className="nav-item"><a className="nav-link" href="#two-factor-auth">{gettext('Two-Factor Authentication')}</a></li>
        }   
        {enableWechatWork &&  
        <li className="nav-item"><a className="nav-link" href="#social-auth">{gettext('Social Login')}</a></li>
        }   
        {enableDeleteAccount &&
        <li className="nav-item"><a className="nav-link" href="#del-account">{gettext('Delete Account')}</a></li>
        }   
      </ul>
    );
  }
}

export default SideNav; 
