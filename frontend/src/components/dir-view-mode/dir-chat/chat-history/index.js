import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CommonMessage from './common-message';
import { CHAT_MESSAGE_TYPE } from '../constants';

import './index.css';

const ChatHistory = ({ chat, settings, repoID }) => {
  const { _id, message = {}, isUserSpeak = false, type } = chat;
  const chatId = useMemo(() => _id || '', [_id]);
  const showOperations = useMemo(() => {
    if (isUserSpeak) return false;
    if (type === CHAT_MESSAGE_TYPE.TIP) return false;
    if (chatId === 'typing') return false;
    return true;
  }, [chatId, isUserSpeak, type]);

  if (Object.keys(message).length === 0) {
    return null;
  }

  return (
    <div className={classNames('sea-ai-ask-chat', { 'user-input-chat': isUserSpeak })}>
      <CommonMessage chatId={chatId} message={message} settings={settings} repoID={repoID} showOperations={showOperations} />
    </div>
  );
};

ChatHistory.propTypes = {
  chat: PropTypes.object,
  settings: PropTypes.object,
  repoID: PropTypes.string,
};

export default ChatHistory;
