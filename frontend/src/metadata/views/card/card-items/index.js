import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useMetadataView } from '../../../hooks/metadata-view';
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

  const { isDirentDetailShow, metadata, updateCurrentDirent, showDirentDetail } = useMetadataView();
  const { tagsData } = useTags();

  const repoID = window.sfMetadataContext.getSetting('repoID');
  const repoInfo = window.sfMetadataContext.getSetting('repoInfo');

  const fileNameColumn = useMemo(() => {
    return metadata.key_column_map['_name'];
  }, [metadata.key_column_map]);

  const mtimeColumn = useMemo(() => {
    return metadata.key_column_map['_file_mtime'];
  }, [metadata.key_column_map]);

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
  }, [updateCurrentDirent]);

  const onSelectCard = useCallback((record) => {
    const recordId = getRecordIdFromRecord(record);
    if (selectedCard === recordId) return;
    handleUpdateCurrentDirent(record);
    onCloseSettings();
    showDirentDetail();
  }, [selectedCard, onCloseSettings, showDirentDetail, handleUpdateCurrentDirent]);

  const handleClickOutside = useCallback((event) => {
    setSelectedCard(null);
    updateCurrentDirent();
  }, [updateCurrentDirent]);

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
        updateCurrentDirent();
      },
    });
  }, [deleteRecords, updateCurrentDirent]);

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
    }
  }, [isDirentDetailShow]);

  const isEmpty = records.length == 0;

  return (
    <>
      <div
        ref={containerRef}
        className={classnames('sf-metadata-view-card-items-container d-flex flex-wrap', {
        })}
        onClick={handleClickOutside}
      >
        {isEmpty && (<EmptyTip text={gettext('No items')} />)}
        {!isEmpty && (
          <>
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
                  onOpenFile={onOpenFile}
                  onSelectCard={onSelectCard}
                  onContextMenu={(e) => onContextMenu(e, record._id)}
                />
              );
            })}
          </>
        )}
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
