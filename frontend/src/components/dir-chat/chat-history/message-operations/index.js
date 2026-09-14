import React, { useCallback } from 'react';
import copy from 'copy-to-clipboard';
import OpIcon from '@/components/op-icon';
import toaster from '@/components/toast';
import { gettext } from '@/utils/constants';

import './index.css';

const MessageOperations = ({ getAIReply }) => {

  const onCopy = useCallback(() => {
    const AIReply = getAIReply();
    copy(AIReply);
    toaster.success(gettext('The content has been copied'));
  }, [getAIReply]);

  return (
    <div className="seaqa-ai-answer-operations">
      <OpIcon
        id="message-operations-copy-button"
        symbol="copy"
        tooltip={gettext('Copy')}
        op={onCopy}
      />
    </div>
  );
};

export default MessageOperations;
