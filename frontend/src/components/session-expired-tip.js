import React from 'react';
import { gettext, loginUrl } from '../utils/constants';

function SessionExpiredTip() {
  return(
    <div className="session-expired-tip">{gettext('You are log out.')}
      <a href={`${loginUrl}?next=${encodeURIComponent(location.href)}`}>{gettext('Login again')}</a>
    </div>
  )
} 

export default SessionExpiredTip