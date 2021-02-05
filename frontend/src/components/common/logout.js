import React from 'react';
import { gettext, logoutUrl } from '../../utils/constants';

export default function Logout() {
  return (
    <a className="logout-icon" href={logoutUrl} title={gettext('Log out')}>
      <i className="sf3-font sf3-font-logout" style={{fontSize: '24px'}}></i>
    </a>
  );
}
