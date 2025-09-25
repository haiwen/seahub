import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useMetadataView } from '../../hooks/metadata-view';
import { EVENT_BUS_TYPE } from '../../constants';
import CardItems from './card-items';
import Settings from './settings';

const Card = () => {
  const [isShowSettings, setShowSettings] = useState(false);

  const {
    metadata,
    modifySettings,
    modifyRecord: modifyRecordAPI,
    deleteRecords,
    modifyColumnData,
  } = useMetadataView();

  const columns = useMemo(() => metadata.view.columns, [metadata.view.columns]);

  const modifyRecord = useCallback((rowId, updates, oldRowData, originalUpdates, originalOldRowData, { success_callback } = {}) => {
    modifyRecordAPI(rowId, updates, oldRowData, originalUpdates, originalOldRowData, false, { success_callback: () => {
      success_callback && success_callback();
      const eventBus = window.sfMetadataContext.eventBus;
      eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_DETAIL_CHANGED, { recordId: rowId }, updates);
    } });
  }, [modifyRecordAPI]);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  useEffect(() => {
    const eventBus = window.sfMetadataContext.eventBus;
    const unsubscribeCardSetting = eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_CARD_SETTINGS, () => setShowSettings(!isShowSettings));
    const unsubscribeCloseCardSetting = eventBus.subscribe(EVENT_BUS_TYPE.CLOSE_CARD_SETTINGS, () => setShowSettings(false));
    return () => {
      unsubscribeCardSetting();
      unsubscribeCloseCardSetting();
    };
  }, [isShowSettings]);

  return (
    <div className="sf-metadata-container">
      <div className="sf-metadata-view-card flex-fill o-hidden position-relative">
        <CardItems
          modifyRecord={modifyRecord}
          deleteRecords={deleteRecords}
          modifyColumnData={modifyColumnData}
          onCloseSettings={closeSettings}
        />
        {isShowSettings && (
          <div className="sf-metadata-view-setting-panel sf-metadata-view-card-setting h-100 position-absolute end-0 top-0">
            <Settings
              columns={columns}
              columnsMap={metadata.key_column_map}
              settings={metadata.view.settings}
              modifySettings={modifySettings}
              onClose={closeSettings}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
