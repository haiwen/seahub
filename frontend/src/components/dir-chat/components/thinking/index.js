import React from 'react';
import { gettext } from '@/utils/constants';
import Loading from '../../../../components/loading';

import './index.css';

function Thinking() {
  return (
    <div className="sea-ai-ask-chat sea-ai-ask-chat-thinking">
      <div className="sea-ai-ask-message-content p-0">
        <Loading />
        <span className="sea-ai-tip-default">{gettext('Thinking...')}</span>
      </div>
    </div>
  );
}

export default Thinking;
