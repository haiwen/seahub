import React, { useLayoutEffect, useRef, useState } from 'react';
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
  const tabsRef = useRef(null);
  const mineLabelRef = useRef(null);
  const teamLabelRef = useRef(null);
  const hasRequestedTeamSessionsRef = useRef(false);
  const [indicatorStyle, setIndicatorStyle] = useState(null);

  const isTeamTab = activeTab === SESSION_TAB_TYPE.TEAM;
  const displaySessions = embedded ? sessions : (isTeamTab ? teamSessions : sessions);
  const shouldShowLoading = !embedded && (isTeamTab && !hasRequestedTeamSessionsRef.current ? true : isTeamSessionsLoading);
  const emptyTipProps = isTeamTab
    ? {
      title: gettext('No shared chats'),
      text: gettext('Shared chats can be viewed by everyone with read or write\n permission to the library'),
    }
    : {
      title: gettext('No chats'),
    };

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const tabsNode = tabsRef.current;
      const activeLabelNode = activeTab === SESSION_TAB_TYPE.MINE ? mineLabelRef.current : teamLabelRef.current;

      if (!tabsNode || !activeLabelNode) {
        return;
      }

      const tabsRect = tabsNode.getBoundingClientRect();
      const labelRect = activeLabelNode.getBoundingClientRect();

      setIndicatorStyle({
        width: labelRect.width,
        transform: `translateX(${labelRect.left - tabsRect.left}px)`,
      });
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);

    return () => {
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab]);

  const onSelectMineTab = () => {
    setActiveTab(SESSION_TAB_TYPE.MINE);
  };

  const onSelectTeamTab = () => {
    if (!hasRequestedTeamSessionsRef.current) {
      hasRequestedTeamSessionsRef.current = true;
      loadTeamSessions();
    }

    setActiveTab(SESSION_TAB_TYPE.TEAM);
  };

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
        <div className="sea-ai-ask-sessions-tabs" ref={tabsRef}>
          <button
            type="button"
            className={`sea-ai-ask-sessions-tab ${activeTab === SESSION_TAB_TYPE.MINE ? 'active' : ''}`}
            onClick={onSelectMineTab}
          >
            <span className="sea-ai-ask-sessions-tab-label" ref={mineLabelRef}>{gettext('Mine')}</span>
          </button>
          <button
            type="button"
            className={`sea-ai-ask-sessions-tab ${activeTab === SESSION_TAB_TYPE.TEAM ? 'active' : ''}`}
            onClick={onSelectTeamTab}
          >
            <span className="sea-ai-ask-sessions-tab-label" ref={teamLabelRef}>{gettext('Shared')}</span>
          </button>
          <span
            aria-hidden="true"
            className={`sea-ai-ask-sessions-tab-indicator ${indicatorStyle ? 'is-visible' : ''}`}
            style={indicatorStyle || undefined}
          />
        </div>
      )}
      <div className={classNames('sea-ai-ask-sessions-body', { embedded })}>
        {shouldShowLoading && (
          <CenteredLoading />
        )}
        {!shouldShowLoading && displaySessions.length === 0 && (
          <EmptyTip className="sea-ai-ask-sessions-empty" {...emptyTipProps} />
        )}
        {!shouldShowLoading && displaySessions.map((session) => (
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
