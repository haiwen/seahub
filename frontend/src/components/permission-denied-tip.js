import React from 'react';
import { gettext, loginUrl } from '../utils/constants';

function PermissionDeniedTip() {
  return(
    <span className="error">{gettext('Permission denied. Please try')}{' '}
      <a className="action-link p-0" href={`${loginUrl}?next=${encodeURIComponent(location.href)}`}>{gettext('login again.')}</a>
    </span>
  );
} 

export default PermissionDeniedTip;