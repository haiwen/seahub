import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext } from '../../utils/constants';
import EventBus from '../common/event-bus';
import OpIcon from '../op-icon';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';

const ChatToolbar = ({ className, isCompact = false, showHistory = true }) => {
  const onNewChat = useCallback(() => {
    const eventBus = EventBus.getInstance();
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CHAT_NEW_SESSION);
  }, []);

  const onToggleSessions = useCallback(() => {
    const eventBus = EventBus.getInstance();
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.CHAT_TOGGLE_SESSIONS);
  }, []);

  return (
    <div className={classNames('d-flex align-items-center', className)}>
      <OpIcon
        id="new-chat-btn"
        className={classNames('cur-view-path-btn', { 'mr-2': !isCompact })}
        symbol="new-chat"
        tooltip={gettext('New chat')}
        op={onNewChat}
      />
      {showHistory && (
        <OpIcon
          id="chat-history-btn"
          className="cur-view-path-btn"
          symbol="history"
          tooltip={gettext('Histories')}
          op={onToggleSessions}
        />
      )}
    </div>
  );
};

ChatToolbar.propTypes = {
  className: PropTypes.string,
  isCompact: PropTypes.bool,
  showHistory: PropTypes.bool,
};

export default ChatToolbar;
