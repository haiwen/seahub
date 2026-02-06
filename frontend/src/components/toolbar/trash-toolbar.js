import React, { useCallback, useEffect, useState } from 'react';
import { gettext } from '../../utils/constants';
import EventBus from '../common/event-bus';
import OpElement from '../op-element';
import OpIcon from '../op-icon';
import Icon from '../icon';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';

const TrashToolbar = () => {
  const [selectedTrashIds, setSelectedTrashIds] = useState([]);

  const unSelect = useCallback(() => {
    const eventBus = EventBus.getInstance();
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, []);

  const restoreItems = useCallback(() => {
    const eventBus = EventBus.getInstance();
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.RESTORE_TRASH);
  }, []);

  useEffect(() => {
    const eventBus = EventBus.getInstance();
    const unsubscribeSelectTrash = eventBus.subscribe(EVENT_BUS_TYPE.SELECT_TRASH, (ids) => {
      setSelectedTrashIds(ids);
    });

    return () => {
      unsubscribeSelectTrash && unsubscribeSelectTrash();
    };
  }, []);

  const length = selectedTrashIds.length;
  return (
    <div className="selected-dirents-toolbar">
      <OpElement
        className="cur-view-path-btn px-2"
        title={gettext('Unselect')}
        op={unSelect}
      >
        <span className="d-flex mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}>
          <Icon symbol="close" />
        </span>
        <span>{length}{' '}{gettext('selected')}</span>
      </OpElement>
      <OpIcon
        className="cur-view-path-btn"
        symbol="revoke"
        title={gettext('Restore')}
        op={restoreItems}
      />
    </div>
  );
};

export default TrashToolbar;
