import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext } from '../../../../utils/constants';
import CenteredLoading from '../../../centered-loading';
import Icon from '../../../icon';
import { useSessions } from '../hooks';
import EmptyTip from '../../../empty-tip';
import Session from './session';
import { SESSION_TAB_TYPE } from '../constants';

import './index.css';

const Sessions = ({ sessionId, embedded = false, onSelect }) => {
  const {
    sessions,
    teamSessions,
    isTeamSessionsLoading,
    activeTab,
    setActiveTab,
    closeShowSessions,
    loadTeamSessions,
  } = useSessions();

  const isTeamTab = activeTab === SESSION_TAB_TYPE.TEAM;
  const displaySessions = embedded ? sessions : (isTeamTab ? teamSessions : sessions);

  useEffect(() => {
    if (!embedded && isTeamTab) {
      loadTeamSessions();
    }
  }, [embedded, isTeamTab, loadTeamSessions]);

  return (
    <div
      className={classNames('sea-ai-ask-sessions-wrapper', { embedded })}
      style={embedded ? undefined : { width: 280, marginLeft: 16 }}
    >
      {!embedded && (
        <div className="sea-ai-ask-sessions-header">
          <div>{gettext('Histories')}</div>
          <button type="button" className="btn btn-icon p-0 border-0 bg-transparent" onClick={closeShowSessions} title={gettext('Close')}>
            <Icon symbol="close" />
          </button>
        </div>
      )}
      {!embedded && (
        <div className="sea-ai-ask-sessions-tabs">
          <button
            type="button"
            className={`sea-ai-ask-sessions-tab ${activeTab === SESSION_TAB_TYPE.MINE ? 'active' : ''}`}
            onClick={() => setActiveTab(SESSION_TAB_TYPE.MINE)}
          >
            {gettext('Mine')}
          </button>
          <button
            type="button"
            className={`sea-ai-ask-sessions-tab ${activeTab === SESSION_TAB_TYPE.TEAM ? 'active' : ''}`}
            onClick={() => setActiveTab(SESSION_TAB_TYPE.TEAM)}
          >
            {gettext('Shared')}
          </button>
        </div>
      )}
      <div className={classNames('sea-ai-ask-sessions-body', { embedded })}>
        {isTeamSessionsLoading && (
          <CenteredLoading />
        )}
        {!isTeamSessionsLoading && displaySessions.length === 0 && (
          <EmptyTip className="sea-ai-ask-sessions-empty" text={gettext('No chats')} />
        )}
        {!isTeamSessionsLoading && displaySessions.map((session) => (
          <Session
            key={session._id}
            session={session}
            isSelected={sessionId === session._id}
            isTeamTab={embedded ? false : isTeamTab}
            embedded={embedded}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

Sessions.propTypes = {
  sessionId: PropTypes.string,
  embedded: PropTypes.bool,
  onSelect: PropTypes.func,
};

export default Sessions;
