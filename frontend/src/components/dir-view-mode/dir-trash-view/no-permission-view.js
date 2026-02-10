import React from 'react';
import { gettext } from '../../../utils/constants';

export default function NoPermissionView() {
  return (
    <div className='sf-trash-wrapper error-message-container'>
      <div>{gettext('You do not have permission to access Trash.')}</div>
    </div>
  );
}
