import React, { useMemo } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { CHAT_MESSAGE_TYPE } from '../constants';
import CommonMessage from './common-message';

import './index.css';

const ChatHistory = ({ chat, settings, repoID }) => {
  const { _id, message = {}, isUserSpeak = false, type } = chat;
  const chatId = useMemo(() => _id || '', [_id]);
  const isStreaming = chatId === 'streaming-answer';
  const showOperations = useMemo(() => {
    if (isUserSpeak) return false;
    if (type === CHAT_MESSAGE_TYPE.TIP) return false;
    if (chatId === 'typing' || isStreaming) return false;
    return true;
  }, [chatId, isStreaming, isUserSpeak, type]);

  if (Object.keys(message).length === 0) {
    return null;
  }

  return (
    <div className={classNames('sea-ai-ask-chat', { 'user-input-chat': isUserSpeak })}>
      <CommonMessage chatId={chatId} message={message} settings={settings} repoID={repoID} showOperations={showOperations} isStreaming={isStreaming} />
    </div>
  );
};

ChatHistory.propTypes = {
  chat: PropTypes.object,
  settings: PropTypes.object,
  repoID: PropTypes.string,
};

export default ChatHistory;
