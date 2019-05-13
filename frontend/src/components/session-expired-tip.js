import React from 'react';
import { gettext, loginUrl } from '../utils/constants';

function SessionExpiredTip() {
  return(
    <span className="session-expired-tip">{gettext('You are log out.')}{' '}
      <a className="action-link session-expired-link" href={`${loginUrl}?next=${encodeURIComponent(location.href)}`}>{gettext('Login again.')}</a>
    </span>
  );
} 

export default SessionExpiredTip;