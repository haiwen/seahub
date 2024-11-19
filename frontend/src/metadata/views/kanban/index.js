import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useMetadataView } from '../../hooks/metadata-view';
import { EVENT_BUS_TYPE } from '../../constants';
import toaster from '../../../components/toast';
import Boards from './boards';
import Settings from './settings';

import './index.css';

const Kanban = () => {
  const [isShowSettings, setShowSettings] = useState(false);

  const { metadata, store } = useMetadataView();

  const columns = useMemo(() => metadata.view.columns, [metadata.view.columns]);

  const modifyRecord = useCallback((rowId, updates, oldRowData, originalUpdates, originalOldRowData) => {
    const rowIds = [rowId];
    const idRowUpdates = { [rowId]: updates };
    const idOriginalRowUpdates = { [rowId]: originalUpdates };
    const idOldRowData = { [rowId]: oldRowData };
    const idOriginalOldRowData = { [rowId]: originalOldRowData };
    store.modifyRecords(rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, false, false, {
      fail_callback: (error) => {
        error && toaster.danger(error);
      },
      success_callback: () => {
        const eventBus = window.sfMetadataContext.eventBus;
        eventBus.dispatch(EVENT_BUS_TYPE.LOCAL_RECORD_DETAIL_CHANGED, rowId, updates);
      },
    });
  }, [store]);

  const modifySettings = useCallback((newSettings) => {
    store.modifySettings(newSettings);
  }, [store]);

  const modifyColumnData = useCallback((columnKey, newData, oldData, { optionModifyType } = {}) => {
    store.modifyColumnData(columnKey, newData, oldData, { optionModifyType });
  }, [store]);

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
    <div className="sf-metadata-view-kanban">
      <Boards modifyRecord={modifyRecord} modifyColumnData={modifyColumnData} onCloseSettings={closeSettings} />
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
  );
};

export default Kanban;
