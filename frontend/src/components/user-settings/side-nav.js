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
      <ul className="list-group list-group-flush">
        <li className="list-group-item"><a href="#user-basic-info">{gettext('Profile')}</a></li>
        {canUpdatePassword &&  
        <li className="list-group-item"><a href="#update-user-passwd">{gettext('Password')}</a></li>
        }   
        {enableWebdavSecret &&
        <li className="list-group-item"><a href="#update-webdav-passwd">{gettext('WebDav Password')}</a></li>
        }   
        {enableAddressBook &&
        <li className="list-group-item"><a href="#list-in-address-book">{gettext('Global Address Book')}</a></li>
        }   
        <li className="list-group-item"><a href="#lang-setting">{gettext('Language')}</a></li>
        {isPro &&
        <li className="list-group-item"><a href="#email-notice">{gettext('Email Notification')}</a></li>
        }   
        {twoFactorAuthEnabled &&
        <li className="list-group-item"><a href="#two-factor-auth">{gettext('Two-Factor Authentication')}</a></li>
        }   
        {enableWechatWork &&  
        <li className="list-group-item"><a href="#social-auth">{gettext('Social Login')}</a></li>
        }   
        {enableDeleteAccount &&
        <li className="list-group-item"><a href="#del-account">{gettext('Delete Account')}</a></li>
        }   
      </ul>
    );
  }
}

export default SideNav; 
