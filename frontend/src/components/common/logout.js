import React from 'react';
import { siteRoot, gettext } from '../../utils/constants';

export default function Logout() {
  return (
    <a className="logout-icon" href={`${siteRoot}accounts/logout/`} title={gettext('Log out')}>
      <i className="sf3-font sf3-font-logout" style={{fontSize: '24px'}}></i>
    </a>
  );
}