import React, { useCallback, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../../../components/context-menu';
import RenameDialog from '../../../components/dialog/rename-dialog';
import { getRowById } from '../../../../components/sf-table/utils/table';
import { checkIsDir } from '../../../utils/row';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../../utils/cell';
import { openInNewTab, openParentFolder } from '../../../utils/file';
import { useMetadataView } from '../../../hooks/metadata-view';
import { PRIVATE_COLUMN_KEY, EVENT_BUS_TYPE } from '../../../constants';
import { useFileOperations } from '../../../../hooks/file-operations';
import { buildCardMenuOptions } from '../../../utils/menu-builder';
import { useMetadataStatus } from '../../../../hooks/metadata-status';
import { getColumnByKey } from '../../../utils/column';
import TextTranslation from '../../../../utils/text-translation';

const CardContextMenu = ({ selectedCard, onDelete, onRename }) => {
  const [isRenameDialogShow, setIsRenameDialogShow] = useState(false);
  const { enableFaceRecognition, enableTags } = useMetadataStatus();
  const { handleDownload: handleDownloadAPI } = useFileOperations();
  const {
    metadata,
    updateRecordDetails,
    updateFaceRecognition,
    updateRecordDescription,
    onOCR,
    generateFileTags
  } = useMetadataView();

  const selectedRecord = useMemo(() => getRowById(metadata, selectedCard), [metadata, selectedCard]);
  const isDir = useMemo(() => checkIsDir(selectedRecord), [selectedRecord]);
  const oldName = useMemo(() => getFileNameFromRecord(selectedRecord), [selectedRecord]);
  const parentDir = useMemo(() => getParentDirFromRecord(selectedRecord), [selectedRecord]);
  const repoID = window.sfMetadataContext.getSetting('repoID');
  const readOnly = !window.sfMetadataContext.canModify();
  const record = useMemo(() => getRowById(metadata, selectedCard), [metadata, selectedCard]);

  const options = useMemo(() => {
    const metadataStatus = {
      enableFaceRecognition,
      enableGenerateDescription: getColumnByKey(metadata.columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION) !== null,
      enableTags
    };
    return buildCardMenuOptions(
      [record],
      readOnly,
      metadataStatus,
    );
  }, [enableFaceRecognition, metadata.columns, enableTags, record, readOnly]);

  const openRenameDialog = useCallback(() => {
    setIsRenameDialogShow(true);
  }, []);

  const handleRename = useCallback((newName) => {
    if (!selectedCard) return;
    const record = getRowById(metadata, selectedCard);
    if (!record) return;

    const oldName = getFileNameFromRecord(record);
    const updates = { [PRIVATE_COLUMN_KEY.FILE_NAME]: newName };
    const oldRowData = { [PRIVATE_COLUMN_KEY.FILE_NAME]: oldName };
    onRename(selectedCard, updates, oldRowData, updates, oldRowData, {
      success_callback: () => setIsRenameDialogShow(false),
    });
  }, [metadata, selectedCard, onRename]);

  const handleDownload = useCallback(() => {
    handleDownloadAPI(parentDir, [{ name: oldName, is_dir: isDir }]);
  }, [handleDownloadAPI, parentDir, oldName, isDir]);

  const handleOptionClick = useCallback((option) => {
    switch (option.key) {
      case TextTranslation.OPEN_FILE_IN_NEW_TAB.key: {
        openInNewTab(repoID, record);
        break;
      }
      case TextTranslation.OPEN_PARENT_FOLDER.key: {
        openParentFolder(record);
        break;
      }
      case TextTranslation.RENAME.key: {
        openRenameDialog();
        break;
      }
      case TextTranslation.MOVE.key:
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MOVE_DIALOG, [record]);
        break;
      case TextTranslation.COPY.key:
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_COPY_DIALOG, [record]);
        break;
      case TextTranslation.DOWNLOAD.key: {
        handleDownload();
        break;
      }
      case TextTranslation.DELETE.key: {
        onDelete([selectedCard]);
        break;
      }
      case TextTranslation.DETECT_FACES.key: {
        updateFaceRecognition([record]);
        break;
      }
      case TextTranslation.EXTRACT_FILE_DETAIL.key: {
        updateRecordDetails([record]);
        break;
      }
      case TextTranslation.GENERATE_DESCRIPTION.key: {
        updateRecordDescription(record);
        break;
      }
      case TextTranslation.GENERATE_TAGS.key: {
        generateFileTags(record);
        break;
      }
      case TextTranslation.EXTRACT_TEXT.key: {
        onOCR(record, '.sf-metadata-card-item-image-container');
        break;
      }
      default: {
        break;
      }
    }
  }, [record, updateFaceRecognition, repoID, openRenameDialog, handleDownload, onDelete, selectedCard, updateRecordDetails, updateRecordDescription, generateFileTags, onOCR]);

  useEffect(() => {
    const unsubscribe = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_CARD_RENAME_DIALOG, openRenameDialog);
    return () => {
      unsubscribe();
    };
  }, [openRenameDialog]);

  return (
    <>
      <ContextMenu
        options={options}
        onOptionClick={handleOptionClick}
        allowedTriggerElements={['.sf-metadata-view-card']}
      />
      {isRenameDialogShow && (
        <RenameDialog
          isDir={isDir}
          oldName={oldName}
          onSubmit={handleRename}
          onCancel={() => setIsRenameDialogShow(false)}
        />
      )}
    </>
  );
};

CardContextMenu.propTypes = {
  selectedCard: PropTypes.string,
  onDelete: PropTypes.func,
  onRename: PropTypes.func,
};

export default CardContextMenu;
