import React from 'react';
import { gettext } from '../utils/constants';

function LibsMobileThead() {
  return (
    <thead>
      <tr>
        <th width="12%"><span className="sr-only">{gettext('Library Type')}</span></th>
        <th width="80%"></th>
        <th width="8%"><span className="sr-only">{gettext('Actions')}</span></th>
      </tr>
    </thead>
  );
}

export default LibsMobileThead;
