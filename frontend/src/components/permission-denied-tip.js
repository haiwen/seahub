import React from 'react';
import { gettext, loginUrl } from '../utils/constants';

function PermissionDeniedTip() {
  let reloginUrl = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
  let errorTip = gettext('Permission denied. Please try {placeholder-left}login again.{placeholder-right}');
  errorTip = errorTip.replace('{placeholder-left}', '<a class="action-link p-0" href='+ reloginUrl + '>');
  errorTip = errorTip.replace('{placeholder-right}', '</a>');
  return(
    <span className="error" dangerouslySetInnerHTML={{__html: errorTip}}></span>
  );
}

export default PermissionDeniedTip;