import React from 'react';
import { gettext, loginUrl } from '../utils/constants';

function SessionExpiredTip() {
  return(
    <span className="error">{gettext('You are logged out.')}{' '}
      <a className="action-link p-0" href={`${loginUrl}?next=${encodeURIComponent(location.href)}`}>{gettext('Login again.')}</a>
    </span>
  );
} 

export default SessionExpiredTip;