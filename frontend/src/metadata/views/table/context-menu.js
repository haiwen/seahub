import React, { useState, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '@/utils/utils';
import DeleteFolderDialog from '@/components/dialog/delete-folder-dialog';
import { useMetadataStatus } from '../../../hooks/metadata-status';
import RowUtils from './utils/row-utils';
import { checkIsDir } from '../../utils/row';
import { EVENT_BUS_TYPE, EVENT_BUS_TYPE as METADATA_EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../constants';
import { getFileNameFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../utils/cell';
import ContextMenuComponent from '../../components/context-menu';
import { openInNewTab, openParentFolder } from '../../utils/file';
import { buildTableMenuOptions } from '../../utils/menu-builder';
import TextTranslation from '../../../utils/text-translation';
import { getColumnByKey } from '../../utils/column';

const ContextMenu = ({
  metadata, isGroupView, selectedRange, selectedPosition, recordMetrics, recordGetterByIndex, onClearSelected, onCopySelected,
  getTableContentRect, getTableCanvasContainerRect, deleteRecords, selectNone, updateRecordDetails,
  updateFaceRecognition, updateRecordDescription, onOCR, generateFileTags
}) => {
  const currentRecord = useRef(null);
  const [deletedFolderPath, setDeletedFolderPath] = useState('');
  const { enableFaceRecognition, enableTags } = useMetadataStatus();
  const repoID = window.sfMetadataStore.repoId;

  const readOnly = !window.sfMetadataContext.canModify();

  const toggleDeleteFolderDialog = useCallback(record => {
    if (deletedFolderPath) {
      currentRecord.current = null;
      setDeletedFolderPath('');
      return;
    }
    const parentDir = getParentDirFromRecord(record);
    const fileName = getFileNameFromRecord(record);
    currentRecord.current = record;
    setDeletedFolderPath(Utils.joinPath(parentDir, fileName));
  }, [deletedFolderPath]);

  const deleteFolder = useCallback(() => {
    if (!currentRecord.current) return;
    const currentRecordId = getRecordIdFromRecord(currentRecord.current);
    deleteRecords([currentRecordId]);
  }, [deleteRecords]);

  const options = useMemo(() => {
    const { columns } = metadata;
    const metadataStatus = {
      enableFaceRecognition,
      enableGenerateDescription: getColumnByKey(metadata.columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION) !== null,
      enableTags
    };
    // handle selected multiple cells
    if (selectedRange) {
      const { topLeft, bottomRight } = selectedRange;
      let records = [];
      for (let i = topLeft.rowIdx; i <= bottomRight.rowIdx; i++) {
        const record = recordGetterByIndex({ isGroupView, groupRecordIndex: topLeft.groupRecordIndex, recordIndex: i });
        if (record) {
          records.push(record);
        }
      }

      const isMultiple = records.length > 1;
      return buildTableMenuOptions(
        records,
        readOnly,
        metadataStatus,
        isMultiple,
        false,
        false,
        true
      );
    }

    const selectedRecordsIds = recordMetrics ? Object.keys(recordMetrics.idSelectedRecordMap) : [];
    if (selectedRecordsIds.length > 1) {
      let records = [];
      selectedRecordsIds.forEach(id => {
        const record = metadata.id_row_map[id];
        if (record) {
          records.push(record);
        }
      });

      const areRecordsInSameFolder = (() => {
        if (records.length <= 1) return true;
        const firstPath = getParentDirFromRecord(records[0]);
        return records.every(record => getParentDirFromRecord(record) === firstPath);
      })();

      return buildTableMenuOptions(
        records,
        readOnly,
        metadataStatus,
        true,
        areRecordsInSameFolder,
        false,
        false,
      );
    }

    // handle selected cell
    if (!selectedPosition) return [];
    const { groupRecordIndex, rowIdx: recordIndex, idx } = selectedPosition;
    const column = columns[idx];
    const isNameColumn = column && (column.key === PRIVATE_COLUMN_KEY.FILE_NAME);
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex }) || RowUtils.getRecordById(selectedRecordsIds[0], metadata);
    if (!record) return [];

    return buildTableMenuOptions(
      [record],
      readOnly,
      metadataStatus,
      false,
      true,
      isNameColumn,
      false
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadata, enableFaceRecognition, enableTags, selectedRange, recordMetrics, selectedPosition, selectedPosition?.idx, recordGetterByIndex, isGroupView, readOnly]);

  const handleOptionClick = useCallback((option, event) => {
    // Get the current context records based on selection state
    const getCurrentRecords = () => {
      if (selectedRange) {
        const { topLeft, bottomRight } = selectedRange;
        let records = [];
        for (let i = topLeft.rowIdx; i <= bottomRight.rowIdx; i++) {
          const record = recordGetterByIndex({ isGroupView, groupRecordIndex: topLeft.groupRecordIndex, recordIndex: i });
          if (record) {
            records.push(record);
          }
        }
        return records;
      }

      const selectedRecordsIds = recordMetrics ? Object.keys(recordMetrics.idSelectedRecordMap) : [];
      if (selectedRecordsIds.length > 1) {
        let records = [];
        selectedRecordsIds.forEach(id => {
          const record = metadata.id_row_map[id];
          if (record) {
            records.push(record);
          }
        });
        return records;
      }

      // Single record
      if (selectedPosition) {
        const { groupRecordIndex, rowIdx: recordIndex } = selectedPosition;
        const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex }) || RowUtils.getRecordById(selectedRecordsIds[0], metadata);
        return record ? [record] : [];
      }

      return [];
    };

    const currentRecords = getCurrentRecords();
    const isMultiple = currentRecords.length > 1;
    const singleRecord = currentRecords.length === 1 ? currentRecords[0] : null;

    switch (option.key) {
      case TextTranslation.OPEN_FILE_IN_NEW_TAB.key:
      case TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key: {
        if (singleRecord) {
          openInNewTab(repoID, singleRecord);
        }
        break;
      }
      case TextTranslation.OPEN_PARENT_FOLDER.key: {
        event.preventDefault();
        if (singleRecord) {
          openParentFolder(singleRecord);
        }
        break;
      }
      case TextTranslation.COPY_SELECTED.key: {
        onCopySelected && onCopySelected();
        break;
      }
      case TextTranslation.CLEAR_SELECTED.key: {
        onClearSelected && onClearSelected();
        break;
      }
      case TextTranslation.GENERATE_DESCRIPTION.key: {
        if (singleRecord) {
          updateRecordDescription(singleRecord);
        }
        break;
      }
      case TextTranslation.GENERATE_TAGS.key: {
        if (singleRecord) {
          generateFileTags(singleRecord);
        }
        break;
      }
      case TextTranslation.EXTRACT_TEXT.key: {
        if (singleRecord) {
          onOCR(singleRecord, 'sf-table-rdg-selected');
        }
        break;
      }
      case TextTranslation.DELETE.key:
      case TextTranslation.DELETE_SELECTED.key: {
        if (currentRecords.length > 0) {
          if (isMultiple) {
            // Multiple records deletion
            window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
            selectNone && selectNone();
            const recordsIds = currentRecords.map((record) => record._id).filter(Boolean);
            if (recordsIds.length > 0 && deleteRecords) {
              deleteRecords(recordsIds);
            }
          } else if (singleRecord) {
            // Single record deletion
            if (singleRecord._id && deleteRecords) {
              if (checkIsDir(singleRecord)) {
                toggleDeleteFolderDialog(singleRecord);
                break;
              }
              deleteRecords([singleRecord._id]);
            }
          }
        }
        break;
      }
      case TextTranslation.RENAME.key: {
        if (singleRecord && singleRecord._id) {
          // rename file via FileNameEditor
          window.sfMetadataContext.eventBus.dispatch(METADATA_EVENT_BUS_TYPE.OPEN_EDITOR);
        }
        break;
      }
      case TextTranslation.EXTRACT_FILE_DETAILS.key: {
        if (currentRecords.length > 0) {
          updateRecordDetails(currentRecords);
        }
        break;
      }
      case TextTranslation.EXTRACT_FILE_DETAIL.key: {
        if (singleRecord) {
          updateRecordDetails([singleRecord]);
        }
        break;
      }
      case TextTranslation.DETECT_FACES.key: {
        if (currentRecords.length > 0) {
          updateFaceRecognition(currentRecords);
        }
        break;
      }
      case TextTranslation.MOVE.key: {
        if (currentRecords.length > 0) {
          window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MOVE_DIALOG, currentRecords);
        }
        break;
      }
      case TextTranslation.COPY.key: {
        if (currentRecords.length > 0) {
          window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_COPY_DIALOG, currentRecords);
        }
        break;
      }
      case TextTranslation.DOWNLOAD.key: {
        if (currentRecords.length > 0) {
          const recordsIds = currentRecords.map((record) => record._id).filter(Boolean);
          if (recordsIds.length > 0) {
            window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_RECORDS, recordsIds);
          }
        }
        break;
      }
      default:
        break;
    }
  }, [isGroupView, selectedPosition, recordMetrics, selectedRange, metadata, recordGetterByIndex, repoID, onCopySelected, onClearSelected, updateRecordDescription, generateFileTags, onOCR, deleteRecords, toggleDeleteFolderDialog, selectNone, updateRecordDetails, updateFaceRecognition]);

  const { top, left } = getTableCanvasContainerRect();
  const { right, bottom } = getTableContentRect();

  return (
    <>
      <ContextMenuComponent
        options={options}
        boundaryCoordinates={{ top, left, right, bottom }}
        onOptionClick={handleOptionClick}
      />
      {deletedFolderPath && (
        <DeleteFolderDialog
          repoID={repoID}
          path={deletedFolderPath}
          deleteFolder={deleteFolder}
          toggleDialog={toggleDeleteFolderDialog}
        />
      )}
    </>
  );
};

ContextMenu.propTypes = {
  isGroupView: PropTypes.bool,
  selectedRange: PropTypes.object,
  selectedPosition: PropTypes.object,
  recordMetrics: PropTypes.object,
  selectNone: PropTypes.func,
  getTableContentRect: PropTypes.func,
  recordGetterByIndex: PropTypes.func,
  deleteRecords: PropTypes.func,
};

export default ContextMenu;
