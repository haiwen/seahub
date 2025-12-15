import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useMetadataView } from '../../../hooks/metadata-view';
import { CARD_SETTINGS_KEYS, PRIVATE_COLUMN_KEY, EVENT_BUS_TYPE } from '../../../constants';
import { gettext } from '../../../../utils/constants';
import { getRecordIdFromRecord, getFileNameFromRecord, getParentDirFromRecord } from '../../../utils/cell';
import { openFile } from '../../../utils/file';
import { checkIsDir } from '../../../utils/row';
import EmptyTip from '../../../../components/empty-tip';
import CardItem from './card-item';
import ImagePreviewer from '../../../components/cell-formatter/image-previewer';
import ContextMenu from '../context-menu';
import { getRowById } from '../../../../components/sf-table/utils/table';
import { useTags } from '../../../../tag/hooks';

import './index.css';

const CardItems = ({ modifyRecord, deleteRecords, modifyColumnData, onCloseSettings }) => {
  const [isImagePreviewerVisible, setImagePreviewerVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState('');

  const currentImageRef = useRef(null);
  const containerRef = useRef(null);

  const eventBus = window.sfMetadataContext && window.sfMetadataContext.eventBus;

  useEffect(() => {
    const unsubscribe = eventBus && eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_SELECTED_RECORD_IDS, (ids) => {
      setSelectedCard(Array.isArray(ids) ? ids[0] : null);
    });
    return () => {
      unsubscribe && unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { isDirentDetailShow, metadata, updateCurrentDirent, showDirentDetail, updateSelectedRecordIds } = useMetadataView();
  const { tagsData } = useTags();

  const repoID = window.sfMetadataContext.getSetting('repoID');
  const repoInfo = window.sfMetadataContext.getSetting('repoInfo');

  const fileNameColumn = useMemo(() => {
    return metadata.key_column_map[PRIVATE_COLUMN_KEY.FILE_NAME];
  }, [metadata.key_column_map]);

  const mtimeColumn = useMemo(() => {
    return metadata.key_column_map[PRIVATE_COLUMN_KEY.FILE_MTIME];
  }, [metadata.key_column_map]);

  const modifierColumn = useMemo(() => {
    return metadata.key_column_map[PRIVATE_COLUMN_KEY.FILE_MODIFIER];
  }, [metadata.key_column_map]);

  const displayColumns = useMemo(() => {
    const displayColumnsConfig = metadata.view.settings[CARD_SETTINGS_KEYS.COLUMNS];
    if (!displayColumnsConfig) return [];
    return displayColumnsConfig
      .filter(config => config.shown)
      .map(config => metadata.key_column_map[config.key]);
  }, [metadata.key_column_map, metadata.view.settings]);

  const displayEmptyValue = useMemo(() => !metadata.view.settings[CARD_SETTINGS_KEYS.HIDE_EMPTY_VALUE], [metadata.view.settings]);
  const displayColumnName = useMemo(() => metadata.view.settings[CARD_SETTINGS_KEYS.SHOW_COLUMN_NAME], [metadata.view.settings]);
  const textWrap = useMemo(() => metadata.view.settings[CARD_SETTINGS_KEYS.TEXT_WRAP], [metadata.view.settings]);

  const records = useMemo(() => {
    const { rows } = metadata;
    return rows || [];
  }, [metadata]);

  const onOpenFile = useCallback((record) => {
    const repoID = window.sfMetadataContext.getSetting('repoID');
    const canPreview = window.sfMetadataContext.canPreview();
    if (!canPreview) return;
    openFile(repoID, record, () => {
      currentImageRef.current = record;
      setImagePreviewerVisible(true);
    });
  }, []);

  const closeImagePreviewer = useCallback(() => {
    currentImageRef.current = null;
    setImagePreviewerVisible(false);
  }, []);

  const handleUpdateCurrentDirent = useCallback((record) => {
    if (!record) return;
    const recordId = getRecordIdFromRecord(record);
    const name = getFileNameFromRecord(record);
    const path = getParentDirFromRecord(record);
    const isDir = checkIsDir(record);
    updateCurrentDirent({
      id: recordId,
      type: isDir ? 'dir' : 'file',
      mtime: '',
      name,
      path,
      file_tags: []
    });
    setSelectedCard(recordId);
    updateSelectedRecordIds([recordId]);
  }, [updateCurrentDirent, updateSelectedRecordIds]);

  const onSelectCard = useCallback((record) => {
    const recordId = getRecordIdFromRecord(record);
    if (selectedCard === recordId) return;
    handleUpdateCurrentDirent(record);
    onCloseSettings();
  }, [selectedCard, onCloseSettings, handleUpdateCurrentDirent]);

  const handleClickOutside = useCallback((event) => {
    setSelectedCard(null);
    updateSelectedRecordIds([]);
    updateCurrentDirent();
  }, [updateCurrentDirent, updateSelectedRecordIds]);

  const onContextMenu = useCallback((event, recordId) => {
    event.preventDefault();
    if (selectedCard === recordId) return;
    const record = getRowById(metadata, recordId);
    handleUpdateCurrentDirent(record);
  }, [metadata, selectedCard, handleUpdateCurrentDirent]);

  const onDeleteRecords = useCallback((recordIds) => {
    deleteRecords(recordIds, {
      success_callback: () => {
        setSelectedCard(null);
        updateSelectedRecordIds([]);
        updateCurrentDirent();
      },
    });
  }, [deleteRecords, updateCurrentDirent, updateSelectedRecordIds]);

  const onRename = useCallback((rowId, updates, oldRowData, originalUpdates, originalOldRowData, { success_callback }) => {
    modifyRecord(rowId, updates, oldRowData, originalUpdates, originalOldRowData, {
      success_callback: (operation) => {
        success_callback && success_callback(operation);
        const record = getRowById(metadata, rowId);
        handleUpdateCurrentDirent(record);
      }
    });
  }, [metadata, modifyRecord, handleUpdateCurrentDirent]);

  useEffect(() => {
    if (!isDirentDetailShow) {
      setSelectedCard(null);
      updateSelectedRecordIds([]);
    }
  }, [isDirentDetailShow, updateSelectedRecordIds]);

  if (records.length == 0) {
    return <EmptyTip text={gettext('No items')} />;
  }

  return (
    <>
      <div
        ref={containerRef}
        className={classnames('sf-metadata-view-card-items-container', {
          'sf-metadata-view-card-items-container-text-wrap': textWrap
        })}
        onClick={handleClickOutside}
      >
        {records.map((record, index) => {
          const isSelected = selectedCard === record._id;
          return (
            <CardItem
              key={index}
              isSelected={isSelected}
              record={record}
              tagsData={tagsData}
              fileNameColumn={fileNameColumn}
              mtimeColumn={mtimeColumn}
              modifierColumn={modifierColumn}
              displayColumns={displayColumns}
              displayEmptyValue={displayEmptyValue}
              displayColumnName={displayColumnName}
              onOpenFile={onOpenFile}
              onSelectCard={onSelectCard}
              onContextMenu={(e) => onContextMenu(e, record._id)}
            />
          );
        })}
      </div>
      <ContextMenu
        selectedCard={selectedCard}
        onDelete={onDeleteRecords}
        onRename={onRename}
      />
      {isImagePreviewerVisible && (
        <ImagePreviewer
          repoID={repoID}
          repoInfo={repoInfo}
          record={currentImageRef.current}
          table={metadata}
          closeImagePopup={closeImagePreviewer}
        />
      )}
    </>
  );
};

CardItems.propTypes = {
  modifyRecord: PropTypes.func.isRequired,
  modifyColumnData: PropTypes.func.isRequired,
  onCloseSettings: PropTypes.func.isRequired,
};

export default CardItems;
