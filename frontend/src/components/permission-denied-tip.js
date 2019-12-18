import React from 'react';
import { gettext, loginUrl } from '../utils/constants';

function PermissionDeniedTip() {
  return(
    <span className="session-expired-tip">{gettext('Permission denied. Please try')}{' '}
      <a className="action-link session-expired-link" href={`${loginUrl}?next=${encodeURIComponent(location.href)}`}>{gettext('login again.')}</a>
    </span>
  );
} 

export default PermissionDeniedTip;