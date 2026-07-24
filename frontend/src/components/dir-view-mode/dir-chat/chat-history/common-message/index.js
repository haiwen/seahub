import React, { useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { CHAT_MESSAGE_TYPE } from '../../constants';
import { Attachments } from '../../components';
import ThoughtProcess from '../thought-process';
import CustomizeMarkdownViewer from '../customize-markdown-viewer';
import MessageOperations from '../message-operations';

import './index.css';

const CommonMessage = ({ chatId, message, settings, repoID, showOperations }) => {
  const markdownMessageRef = useRef(null);

  const getAIReply = useCallback(() => {
    return markdownMessageRef.current?.getAIReply();
  }, []);

  return (
    <>
      <Attachments attachments={message[CHAT_MESSAGE_TYPE.ATTACHMENTS]} isOpenable />
      <div className="sea-ai-ask-message-content">
        <ThoughtProcess value={message[CHAT_MESSAGE_TYPE.THOUGHT_PROCESS]} settings={settings} />
        {message[CHAT_MESSAGE_TYPE.TEXT] && <>{message[CHAT_MESSAGE_TYPE.TEXT]}</>}
        {message[CHAT_MESSAGE_TYPE.AI_REPLY] && (
          <CustomizeMarkdownViewer ref={markdownMessageRef} chatId={chatId} message={message} repoID={repoID} />
        )}
        {showOperations && (<MessageOperations getAIReply={getAIReply} />)}
      </div>
    </>
  );
};

CommonMessage.propTypes = {
  chatId: PropTypes.string,
  message: PropTypes.object,
  settings: PropTypes.object,
  repoID: PropTypes.string,
  showOperations: PropTypes.bool,
};

export default CommonMessage;
