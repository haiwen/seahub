import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gettext } from '../../utils/constants';
import { EVENT_BUS_TYPE } from '../../metadata/constants';
import RowUtils from '../../metadata/views/table/utils/row-utils';
import { Dirent } from '../../models';
import { useFileOperations } from '../../hooks/file-operations';

const GalleryFilesToolbar = () => {
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const metadataRef = useRef([]);
  const { handleDownload: handleDownloadAPI, handleCopy: handleCopyAPI } = useFileOperations();
  const eventBus = window.sfMetadataContext && window.sfMetadataContext.eventBus;

  const checkCanDeleteRow = window.sfMetadataContext.checkCanDeleteRow();
  const canDuplicateRow = window.sfMetadataContext.canDuplicateRow();

  useEffect(() => {
    const unsubscribeSelectedFileIds = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.SELECT_RECORDS, (ids, metadata) => {
      metadataRef.current = metadata || [];
      setSelectedRecordIds(ids);
    });

    return () => {
      unsubscribeSelectedFileIds && unsubscribeSelectedFileIds();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const records = useMemo(() => selectedRecordIds.map(id => RowUtils.getRecordById(id, metadataRef.current)).filter(Boolean) || [], [selectedRecordIds]);

  const unSelect = useCallback(() => {
    setSelectedRecordIds([]);
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_SELECTED_RECORD_IDS, []);
    eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
  }, [eventBus]);

  const handleDownload = useCallback(() => {
    const list = records.map(record => {
      const { _parent_dir: parentDir, _name: fileName } = record || {};
      const name = parentDir === '/' ? fileName : `${parentDir}/${fileName}`;
      return { name };
    });
    handleDownloadAPI('/', list);
  }, [handleDownloadAPI, records]);

  const deleteRecords = useCallback(() => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.DELETE_RECORDS, selectedRecordIds, {
      success_callback: () => {
        eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
      }
    });
  }, [eventBus, selectedRecordIds]);

  const handleDuplicate = useCallback((destRepo, dirent, destPath, nodeParentPath, isByDialog) => {
    eventBus && eventBus.dispatch(EVENT_BUS_TYPE.DUPLICATE_RECORD, selectedRecordIds[0],
      destRepo, dirent, destPath, nodeParentPath, isByDialog);
  }, [eventBus, selectedRecordIds]);

  const handleCopy = useCallback(() => {
    const { _parent_dir: parentDir, _name: fileName } = records[0] || {};
    const dirent = new Dirent({ name: fileName });
    handleCopyAPI(parentDir, dirent, false, handleDuplicate);
  }, [records, handleCopyAPI, handleDuplicate]);

  const length = selectedRecordIds.length;
  return (
    <div className="selected-dirents-toolbar">
      <span className="cur-view-path-btn px-2" onClick={unSelect}>
        <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
        <span>{length}{' '}{gettext('selected')}</span>
      </span>
      <span className="cur-view-path-btn" onClick={handleDownload}>
        <span className="sf3-font-download1 sf3-font" aria-label={gettext('Download')} title={gettext('Download')}></span>
      </span>
      {checkCanDeleteRow &&
        <span className="cur-view-path-btn" onClick={deleteRecords}>
          <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')}></span>
        </span>
      }
      {(canDuplicateRow && length === 1) &&
      <span className="cur-view-path-btn" onClick={handleCopy}>
        <span className="sf3-font-copy1 sf3-font" aria-label={gettext('Copy')} title={gettext('Copy')}></span>
      </span>
      }
    </div>
  );
};

export default GalleryFilesToolbar;
