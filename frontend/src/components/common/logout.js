import React from 'react';
import { siteRoot, gettext } from '../../utils/constants';
import Icon from '../icon';

export default function Logout() {
  return (
    <a className="logout-icon sf-icon-color-mode" href={`${siteRoot}accounts/logout/`} title={gettext('Log out')}>
      <Icon symbol="logout" />
    </a>
  );
}
