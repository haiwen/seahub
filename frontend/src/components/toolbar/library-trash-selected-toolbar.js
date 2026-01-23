import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import RowUtils from '../../metadata/views/table/utils/row-utils';
import OpIcon from '../../components/op-icon';
import Icon from '../icon';

const LibraryTrashSelectedToolbar = ({ repoID }) => {
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [metadata, setMetadata] = useState({});
  const metadataRef = useRef([]);

  const eventBus = window.sfMetadataContext && window.sfMetadataContext.eventBus;

  const records = useMemo(() => selectedRecordIds.map(id => RowUtils.getRecordById(id, metadataRef.current)).filter(Boolean) || [], [selectedRecordIds]);

  const unSelect = useCallback(() => {
    setSelectedRecordIds([]);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_SELECTED_RECORD_IDS, []);
    eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, [eventBus]);

  const restoreRecords = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.RESTORE_RECORDS, selectedRecordIds, {
      success_callback: () => {
        eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
      }
    });
  }, [eventBus, selectedRecordIds]);

  useEffect(() => {
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_RECORDS, (ids, metadataObj) => {
      metadataRef.current = metadataObj || [];
      setMetadata(metadataObj || {});
      setSelectedRecordIds(ids);
    });

    return () => {
      unsubscribeSelectedFileIds && unsubscribeSelectedFileIds();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const length = selectedRecordIds.length;

  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="d-flex mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}>
          <Icon symbol="close" />
        </span>
        <span>{length}{' '}{gettext('selected')}</span>
      </span>

      <OpIcon
        className="cur-view-path-btn sf3-font"
        title={gettext('Restore')}
        aria-label={gettext('Restore')}
        op={restoreRecords}
      >
        <Icon symbol="reply" />
      </OpIcon>
    </div>
  );
};

LibraryTrashSelectedToolbar.propTypes = {
  repoID: PropTypes.string.isRequired,
};

export default LibraryTrashSelectedToolbar;
