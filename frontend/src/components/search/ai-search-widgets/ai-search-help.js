import React from 'react';
import Icon from '../../icon';
import { gettext } from '../../../utils/constants';

import './ai-search-help.css';

export default function AISearchHelp() {
  return (
    <div className="ai-search-help">
      <div className="ai-search-help-title">{gettext('Is this answer helpful to you?')}</div>
      <div className='ai-search-help-container'>
        <div className="ai-search-help-detail" key={1}>
          <Icon symbol='helpful' />
          <span className="pl-1">{gettext('Yes')}</span>
        </div>
        <div className="ai-search-help-detail" key={2}>
          <Icon symbol='helpless' />
          <span className="pl-1">{gettext('No')}</span>
        </div>
      </div>
    </div>
  );
}
