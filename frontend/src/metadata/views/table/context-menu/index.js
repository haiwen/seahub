import React, { useState, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import toaster from '../../../../components/toast';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import { useMetadataView } from '../../../hooks/metadata-view';
import { useMetadataStatus } from '../../../../hooks';
import { getColumnByKey, isNameColumn } from '../../../utils/column';
import { checkIsDir } from '../../../utils/row';
import { EVENT_BUS_TYPE, EVENT_BUS_TYPE as METADATA_EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY } from '../../../constants';
import { getFileNameFromRecord, getParentDirFromRecord, getFileObjIdFromRecord,
  getRecordIdFromRecord,
} from '../../../utils/cell';
import FileTagsDialog from '../../../components/dialog/file-tags-dialog';
import { openInNewTab, openParentFolder } from '../../../utils/file';
import DeleteFolderDialog from '../../../../components/dialog/delete-folder-dialog';
import MoveDirent from '../../../../components/dialog/move-dirent-dialog';
import { Dirent } from '../../../../models';
import { useMetadataAIOperations } from '../../../../hooks/metadata-ai-operation';
import ContextMenuComponent from '../../../components/context-menu';

const OPERATION = {
  CLEAR_SELECTED: 'clear-selected',
  COPY_SELECTED: 'copy-selected',
  OPEN_PARENT_FOLDER: 'open-parent-folder',
  OPEN_IN_NEW_TAB: 'open-new-tab',
  GENERATE_DESCRIPTION: 'generate-description',
  OCR: 'ocr',
  IMAGE_DESCRIPTION: 'image-description',
  FILE_TAGS: 'file-tags',
  DELETE_RECORD: 'delete-record',
  DELETE_RECORDS: 'delete-records',
  RENAME_FILE: 'rename-file',
  FILE_DETAIL: 'file-detail',
  FILE_DETAILS: 'file-details',
  MOVE: 'move',
};

const ContextMenu = ({
  isGroupView, selectedRange, selectedPosition, recordMetrics, recordGetterByIndex, onClearSelected, onCopySelected, updateRecords,
  getTableContentRect, getTableCanvasContainerRect, deleteRecords, selectNone, updateFileTags, moveRecord, addFolder
}) => {
  const currentRecord = useRef(null);

  const [fileTagsRecord, setFileTagsRecord] = useState(null);
  const [deletedFolderPath, setDeletedFolderPath] = useState('');
  const [isMoveDialogShow, setMoveDialogShow] = useState(false);

  const { metadata } = useMetadataView();
  const { enableOCR } = useMetadataStatus();
  const { onOCR, generateDescription, extractFilesDetails } = useMetadataAIOperations();

  const repoID = window.sfMetadataStore.repoId;

  const checkCanModifyRow = (row) => {
    return window.sfMetadataContext.canModifyRow(row);
  };

  const checkIsDescribableFile = useCallback((record) => {
    const fileName = getFileNameFromRecord(record);
    return checkCanModifyRow(record) && Utils.isDescriptionSupportedFile(fileName);
  }, []);

  const getAbleDeleteRecords = useCallback((records) => {
    return records.filter(record => window.sfMetadataContext.checkCanDeleteRow(record));
  }, []);

  const toggleDeleteFolderDialog = useCallback((record) => {
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

  const toggleMoveDialog = useCallback((record) => {
    currentRecord.current = record || null;
    setMoveDialogShow(!isMoveDialogShow);
  }, [isMoveDialogShow]);

  const deleteFolder = useCallback(() => {
    if (!currentRecord.current) return;
    const currentRecordId = getRecordIdFromRecord(currentRecord.current);
    deleteRecords([currentRecordId]);
  }, [deleteRecords]);

  const options = useMemo(() => {
    const permission = window.sfMetadataContext.getPermission();
    const isReadonly = permission === 'r';
    const { columns } = metadata;
    const descriptionColumn = getColumnByKey(columns, PRIVATE_COLUMN_KEY.FILE_DESCRIPTION);
    const tagsColumn = getColumnByKey(columns, PRIVATE_COLUMN_KEY.TAGS);
    let list = [];

    // handle selected multiple cells
    if (selectedRange) {
      !isReadonly && list.push({ value: OPERATION.CLEAR_SELECTED, label: gettext('Clear selected') });
      list.push({ value: OPERATION.COPY_SELECTED, label: gettext('Copy selected') });

      const { topLeft, bottomRight } = selectedRange;
      let records = [];
      for (let i = topLeft.rowIdx; i <= bottomRight.rowIdx; i++) {
        const record = recordGetterByIndex({ isGroupView, groupRecordIndex: topLeft.groupRecordIndex, recordIndex: i });
        if (record) {
          records.push(record);
        }
      }

      const ableDeleteRecords = getAbleDeleteRecords(records);
      if (ableDeleteRecords.length > 0) {
        list.push({ value: OPERATION.DELETE_RECORDS, label: gettext('Delete selected'), records: ableDeleteRecords });
      }

      const imageOrVideoRecords = records.filter(record => {
        const fileName = getFileNameFromRecord(record);
        return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
      });
      if (imageOrVideoRecords.length > 0) {
        list.push({ value: OPERATION.FILE_DETAILS, label: gettext('Extract file details'), records: imageOrVideoRecords });
      }
      return list;
    }

    // handle selected records
    const selectedRecordsIds = recordMetrics ? Object.keys(recordMetrics.idSelectedRecordMap) : [];
    if (selectedRecordsIds.length > 1) {
      let records = [];
      selectedRecordsIds.forEach(id => {
        const record = metadata.id_row_map[id];
        if (record) {
          records.push(record);
        }
      });

      const ableDeleteRecords = getAbleDeleteRecords(records);
      if (ableDeleteRecords.length > 0) {
        list.push({ value: OPERATION.DELETE_RECORDS, label: gettext('Delete'), records: ableDeleteRecords });
      }
      const imageOrVideoRecords = records.filter(record => {
        const isFolder = checkIsDir(record);
        if (isFolder) return false;
        const canModifyRow = checkCanModifyRow(record);
        if (!canModifyRow) return false;
        const fileName = getFileNameFromRecord(record);
        return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
      });
      if (imageOrVideoRecords.length > 0) {
        list.push({ value: OPERATION.FILE_DETAILS, label: gettext('Extract file details'), records: imageOrVideoRecords });
      }
      return list;
    }

    // handle selected cell
    if (!selectedPosition) return list;
    const { groupRecordIndex, rowIdx: recordIndex, idx } = selectedPosition;
    const column = columns[idx];
    const record = recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex });
    if (!record) return list;

    const canModifyRow = checkCanModifyRow(record);
    const canDeleteRow = window.sfMetadataContext.checkCanDeleteRow(record);
    const isFolder = checkIsDir(record);
    list.push({ value: OPERATION.OPEN_IN_NEW_TAB, label: isFolder ? gettext('Open folder in new tab') : gettext('Open file in new tab'), record });
    list.push({ value: OPERATION.OPEN_PARENT_FOLDER, label: gettext('Open parent folder'), record });

    const modifyOptions = [];

    if (canModifyRow && column && isNameColumn(column)) {
      modifyOptions.push({ value: OPERATION.RENAME_FILE, label: isFolder ? gettext('Rename folder') : gettext('Rename file'), record });
    }

    if (canModifyRow) {
      modifyOptions.push({ value: OPERATION.MOVE, label: isFolder ? gettext('Move folder') : gettext('Move file'), record });
    }

    if (canDeleteRow) {
      modifyOptions.push({ value: OPERATION.DELETE_RECORD, label: isFolder ? gettext('Delete folder') : gettext('Delete file'), record });
    }

    if (modifyOptions.length > 0) {
      list.push('Divider');
      list.push(...modifyOptions);
    }

    if (!isFolder && canModifyRow) {
      const fileName = getFileNameFromRecord(record);
      const isDescribableFile = checkIsDescribableFile(record);
      const isImage = Utils.imageCheck(fileName);
      const isVideo = Utils.videoCheck(fileName);
      const aiOptions = [];

      if (isImage || isVideo) {
        aiOptions.push({ value: OPERATION.FILE_DETAIL, label: gettext('Extract file detail'), record: record });
      }

      if (descriptionColumn && isDescribableFile) {
        aiOptions.push({
          value: OPERATION.GENERATE_DESCRIPTION,
          label: gettext('Generate description'),
          record
        });
      }

      if (tagsColumn && isDescribableFile && !isVideo) {
        aiOptions.push({ value: OPERATION.FILE_TAGS, label: gettext('Generate file tags'), record: record });
      }

      if (enableOCR && isImage) {
        aiOptions.push({ value: OPERATION.OCR, label: gettext('OCR'), record });
      }

      if (aiOptions.length > 0) {
        list.push('Divider');
        list.push(...aiOptions);
      }
    }

    return list;
  }, [isGroupView, selectedPosition, recordMetrics, selectedRange, metadata, recordGetterByIndex, checkIsDescribableFile, enableOCR, getAbleDeleteRecords]);

  const handelGenerateDescription = useCallback((record) => {
    if (!checkCanModifyRow(record)) return;
    const parentDir = getParentDirFromRecord(record);
    const fileName = getFileNameFromRecord(record);
    if (!fileName || !parentDir) return;
    const checkIsDescribableFile = Utils.isDescriptionSupportedFile(fileName);
    if (!checkIsDescribableFile) return;

    const descriptionColumnKey = PRIVATE_COLUMN_KEY.FILE_DESCRIPTION;
    let idOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [descriptionColumnKey]: record[descriptionColumnKey] } };
    let idOriginalOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [descriptionColumnKey]: record[descriptionColumnKey] } };
    generateDescription({ parentDir, fileName }, {
      success_callback: ({ description }) => {
        const updateRecordId = record[PRIVATE_COLUMN_KEY.ID];
        const recordIds = [updateRecordId];
        let idRecordUpdates = {};
        let idOriginalRecordUpdates = {};
        idRecordUpdates[updateRecordId] = { [descriptionColumnKey]: description };
        idOriginalRecordUpdates[updateRecordId] = { [descriptionColumnKey]: description };
        updateRecords({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData });
      }
    });
  }, [updateRecords, generateDescription]);

  const toggleFileTagsRecord = useCallback((record = null) => {
    setFileTagsRecord(record);
  }, []);

  const ocr = useCallback((record) => {
    if (!checkCanModifyRow(record)) return;
    const parentDir = getParentDirFromRecord(record);
    const fileName = getFileNameFromRecord(record);
    if (!Utils.imageCheck(fileName)) return;

    const ocrResultColumnKey = PRIVATE_COLUMN_KEY.OCR;
    let idOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [ocrResultColumnKey]: record[ocrResultColumnKey] } };
    let idOriginalOldRecordData = { [record[PRIVATE_COLUMN_KEY.ID]]: { [ocrResultColumnKey]: record[ocrResultColumnKey] } };
    onOCR({ parentDir, fileName }, {
      success_callback: ({ ocrResult }) => {
        if (!ocrResult) return;
        const updateRecordId = record[PRIVATE_COLUMN_KEY.ID];
        const recordIds = [updateRecordId];
        let idRecordUpdates = {};
        let idOriginalRecordUpdates = {};
        idRecordUpdates[updateRecordId] = { [ocrResultColumnKey]: ocrResult ? JSON.stringify(ocrResult) : null };
        idOriginalRecordUpdates[updateRecordId] = { [ocrResultColumnKey]: ocrResult ? JSON.stringify(ocrResult) : null };
        updateRecords({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData });
      },
    });
  }, [updateRecords, onOCR]);

  const updateFileDetails = useCallback((records) => {
    const recordObjIds = records.map(record => getFileObjIdFromRecord(record));
    if (recordObjIds.length > 50) {
      toaster.danger(gettext('Select up to 50 files'));
      return;
    }

    const recordIds = records.map(record => getRecordIdFromRecord(record));
    extractFilesDetails(recordObjIds, {
      success_callback: ({ details }) => {
        const captureColumn = getColumnByKey(metadata.columns, PRIVATE_COLUMN_KEY.CAPTURE_TIME);
        if (!captureColumn) return;
        let idOldRecordData = {};
        let idOriginalOldRecordData = {};
        const captureColumnKey = PRIVATE_COLUMN_KEY.CAPTURE_TIME;
        records.forEach(record => {
          idOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [captureColumnKey]: record[captureColumnKey] };
          idOriginalOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [captureColumnKey]: record[captureColumnKey] };
        });
        let idRecordUpdates = {};
        let idOriginalRecordUpdates = {};
        details.forEach(detail => {
          const updateRecordId = detail[PRIVATE_COLUMN_KEY.ID];
          idRecordUpdates[updateRecordId] = { [captureColumnKey]: detail[captureColumnKey] };
          idOriginalRecordUpdates[updateRecordId] = { [captureColumnKey]: detail[captureColumnKey] };
        });
        updateRecords({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData });
      }
    });
  }, [metadata, extractFilesDetails, updateRecords]);

  const handleOptionClick = useCallback((option, event) => {
    switch (option.value) {
      case OPERATION.OPEN_IN_NEW_TAB: {
        const { record } = option;
        openInNewTab(repoID, record);
        break;
      }
      case OPERATION.OPEN_PARENT_FOLDER: {
        event.preventDefault();
        const { record } = option;
        openParentFolder(record);
        break;
      }
      case OPERATION.COPY_SELECTED: {
        onCopySelected && onCopySelected();
        break;
      }
      case OPERATION.CLEAR_SELECTED: {
        onClearSelected && onClearSelected();
        break;
      }
      case OPERATION.GENERATE_DESCRIPTION: {
        const { record } = option;
        if (!record) break;
        handelGenerateDescription(record);
        break;
      }
      case OPERATION.FILE_TAGS: {
        const { record } = option;
        if (!record) break;
        toggleFileTagsRecord(record);
        break;
      }
      case OPERATION.OCR: {
        const { record } = option;
        if (!record) break;
        ocr(record);
        break;
      }
      case OPERATION.DELETE_RECORD: {
        const { record } = option;
        if (!record || !record._id || !deleteRecords) break;
        if (checkIsDir(record)) {
          toggleDeleteFolderDialog(record);
          break;
        }
        deleteRecords([record._id]);
        break;
      }
      case OPERATION.DELETE_RECORDS: {
        window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
        selectNone && selectNone();

        const { records } = option;
        const recordsIds = Array.isArray(records) ? records.map((record) => record._id).filter(Boolean) : [];
        if (recordsIds.length === 0 || !deleteRecords) break;
        deleteRecords(recordsIds);
        break;
      }
      case OPERATION.RENAME_FILE: {
        const { record } = option;
        if (!record || !record._id) break;

        // rename file via FileNameEditor
        window.sfMetadataContext.eventBus.dispatch(METADATA_EVENT_BUS_TYPE.OPEN_EDITOR);
        break;
      }
      case OPERATION.FILE_DETAILS: {
        const { records } = option;
        updateFileDetails(records);
        break;
      }
      case OPERATION.FILE_DETAIL: {
        const { record } = option;
        updateFileDetails([record]);
        break;
      }
      case OPERATION.MOVE: {
        const { record } = option;
        if (!record) break;
        toggleMoveDialog(record);
        break;
      }
      default: {
        break;
      }
    }
  }, [repoID, onCopySelected, onClearSelected, handelGenerateDescription, ocr, deleteRecords, toggleDeleteFolderDialog, selectNone, updateFileDetails, toggleFileTagsRecord, toggleMoveDialog]);

  const currentRecordId = getRecordIdFromRecord(currentRecord.current);
  const fileName = getFileNameFromRecord(currentRecord.current);

  const { top, left } = getTableCanvasContainerRect();
  const { right, bottom } = getTableContentRect();

  return (
    <>
      <ContextMenuComponent
        options={options}
        boundaryCoordinates={{ top, left, right, bottom }}
        onOptionClick={handleOptionClick}
      />
      {fileTagsRecord && (
        <FileTagsDialog record={fileTagsRecord} onToggle={toggleFileTagsRecord} onSubmit={updateFileTags} />
      )}
      {deletedFolderPath && (
        <DeleteFolderDialog
          repoID={repoID}
          path={deletedFolderPath}
          deleteFolder={deleteFolder}
          toggleDialog={toggleDeleteFolderDialog}
        />
      )}
      {isMoveDialogShow && (
        <MoveDirent
          path={getParentDirFromRecord(currentRecord.current)}
          repoID={repoID}
          dirent={new Dirent({ name: fileName })}
          isMultipleOperation={false}
          onItemMove={(...params) => moveRecord(currentRecordId, ...params)}
          onCancelMove={toggleMoveDialog}
          onAddFolder={addFolder}
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
  moveRecord: PropTypes.func,
  addFolder: PropTypes.func,
};

export default ContextMenu;
