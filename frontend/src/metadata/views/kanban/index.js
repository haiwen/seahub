import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useMetadataView } from '../../hooks/metadata-view';
import { EVENT_BUS_TYPE } from '../../constants';
import Boards from './boards';
import Settings from './settings';

import './index.css';

const Kanban = () => {
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
    const unsubscribeKanbanSetting = eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_KANBAN_SETTINGS, () => setShowSettings(!isShowSettings));
    const unsubscribeCloseKanbanSetting = eventBus.subscribe(EVENT_BUS_TYPE.CLOSE_KANBAN_SETTINGS, () => setShowSettings(false));
    return () => {
      unsubscribeKanbanSetting();
      unsubscribeCloseKanbanSetting();
    };
  }, [isShowSettings]);

  return (
    <div className="sf-metadata-container">
      <div className="sf-metadata-view-kanban">
        <Boards
          modifyRecord={modifyRecord}
          deleteRecords={deleteRecords}
          modifyColumnData={modifyColumnData}
          onCloseSettings={closeSettings}
        />
        <div className="sf-metadata-view-setting-panel sf-metadata-view-kanban-setting h-100">
          {isShowSettings && (
            <Settings
              columns={columns}
              columnsMap={metadata.key_column_map}
              settings={metadata.view.settings}
              modifySettings={modifySettings}
              onClose={closeSettings}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Kanban;
