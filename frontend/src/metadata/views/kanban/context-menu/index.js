import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../../../components/context-menu';
import RenameDialog from '../../../components/dialog/rename-dialog';
import { getRowById } from '../../../../components/sf-table/utils/table';
import { checkIsDir } from '../../../utils/row';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../../utils/cell';
import { openInNewTab, openParentFolder } from '../../../utils/file';
import { useMetadataView } from '../../../hooks/metadata-view';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../../constants';
import { useFileOperations } from '../../../../hooks/file-operations';
import TextTranslation from '../../../../utils/text-translation';
import { getColumnByKey } from '../../../utils/column';
import { buildKanbanMenuOptions } from '../../../utils/menu-builder';
import { useMetadataStatus } from '../../../../hooks';

const KanbanContextMenu = ({ selectedCard, onDelete, onRename }) => {
  const [isRenameDialogShow, setIsRenameDialogShow] = useState(false);

  const { enableFaceRecognition, enableTags } = useMetadataStatus();
  const {
    metadata,
    updateRecordDetails,
    updateFaceRecognition,
    updateRecordDescription,
    onOCR,
    generateFileTags
  } = useMetadataView();
  const { handleDownload: handleDownloadAPI } = useFileOperations();

  const record = useMemo(() => getRowById(metadata, selectedCard), [metadata, selectedCard]);
  const isDir = useMemo(() => checkIsDir(record), [record]);
  const oldName = useMemo(() => getFileNameFromRecord(record), [record]);
  const parentDir = useMemo(() => getParentDirFromRecord(record), [record]);

  const repoID = window.sfMetadataContext.getSetting('repoID');
  const readOnly = !window.sfMetadataContext.canModify();

  const options = useMemo(() => {
    const metadataStatus = {
      enableFaceRecognition,
      enableGenerateDescription: getColumnByKey(metadata.columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION) !== null,
      enableTags
    };
    return buildKanbanMenuOptions(
      [record],
      readOnly,
      metadataStatus,
    );
  }, [enableFaceRecognition, metadata.columns, enableTags, record, readOnly]);

  const openRenameDialog = useCallback(() => {
    setIsRenameDialogShow(true);
  }, []);

  const handleRename = useCallback((newName) => {
    if (!record) return;

    const oldName = getFileNameFromRecord(record);
    const updates = { [PRIVATE_COLUMN_KEY.FILE_NAME]: newName };
    const oldRowData = { [PRIVATE_COLUMN_KEY.FILE_NAME]: oldName };
    onRename(selectedCard, updates, oldRowData, updates, oldRowData, {
      success_callback: () => setIsRenameDialogShow(false),
    });
  }, [record, selectedCard, onRename]);

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
      case TextTranslation.DETECT_FACES.key:
        updateFaceRecognition([record]);
        break;
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
        onOCR(record, '.sf-metadata-kanban-card');
        break;
      }
      default: {
        break;
      }
    }
  }, [record, updateFaceRecognition, repoID, openRenameDialog, handleDownload, onDelete, selectedCard, updateRecordDetails, updateRecordDescription, generateFileTags, onOCR]);

  useEffect(() => {
    const unsubscribeToggleKanbanRenameDialog = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_KANBAN_RENAME_DIALOG, openRenameDialog);
    return () => {
      unsubscribeToggleKanbanRenameDialog();
    };
  }, [openRenameDialog]);

  return (
    <>
      <ContextMenu
        options={options}
        onOptionClick={handleOptionClick}
        allowedTriggerElements={['.sf-metadata-kanban-card']}
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

KanbanContextMenu.propTypes = {
  selectedCard: PropTypes.string,
  onDelete: PropTypes.func,
  onRename: PropTypes.func,
};

export default KanbanContextMenu;
