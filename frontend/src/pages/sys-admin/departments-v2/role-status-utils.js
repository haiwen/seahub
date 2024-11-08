import React from 'react';
import { gettext } from '../../../utils/constants';

const getRoleOptions = (roles) => {
  return Array.isArray(roles) && roles.map(role => ({
    value: role,
    text: translateRole(role),
    label: (
      <div className="label-container">
        <span>{translateRole(role)}</span>
      </div>
    ),
  }));
};

const translateRole = (role) => {
  switch (role) {
    case 'Admin':
      return gettext('Admin');
    case 'Member':
      return gettext('Member');
    case 'default':
      return gettext('Default');
    case 'guest':
      return gettext('Guest');
    case 'default_admin':
      return gettext('Default admin');
    case 'system_admin':
      return gettext('System admin');
    case 'daily_admin':
      return gettext('Daily admin');
    case 'audit_admin':
      return gettext('Audit admin');
    default:
      return role;
  }
};

export { getRoleOptions };
