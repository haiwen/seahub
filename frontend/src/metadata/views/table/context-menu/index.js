import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

const OPERATION = {
  CLEAR_SELECTED: 'clear-selected',
  COPY_SELECTED: 'copy-selected',
  OPEN_PARENT_FOLDER: 'open-parent-folder',
  OPEN_IN_NEW_TAB: 'open-new-tab',
  GENERATE_DESCRIPTION: 'generate-description',
  OCR: 'ocr',
  IMAGE_CAPTION: 'image-caption',
  FILE_TAGS: 'file-tags',
  DELETE_RECORD: 'delete-record',
  DELETE_RECORDS: 'delete-records',
  RENAME_FILE: 'rename-file',
  FILE_DETAIL: 'file-detail',
  FILE_DETAILS: 'file-details',
};

const ContextMenu = (props) => {
  const {
    isGroupView, selectedRange, selectedPosition, recordMetrics, recordGetterByIndex, onClearSelected, onCopySelected, updateRecords,
    getTableContentRect, getTableCanvasContainerRect, deleteRecords, toggleDeleteFolderDialog, selectNone, updateFileTags,
  } = props;
  const menuRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [fileTagsRecord, setFileTagsRecord] = useState(null);

  const { metadata } = useMetadataView();
  const { enableOCR } = useMetadataStatus();

  const checkCanModifyRow = (row) => {
    return window.sfMetadataContext.canModifyRow(row);
  };

  const checkIsDescribableDoc = useCallback((record) => {
    const fileName = getFileNameFromRecord(record);
    return checkCanModifyRow(record) && Utils.isDescriptionSupportedFile(fileName);
  }, []);

  const getAbleDeleteRecords = useCallback((records) => {
    return records.filter(record => window.sfMetadataContext.checkCanDeleteRow(record));
  }, []);

  const options = useMemo(() => {
    if (!visible) return [];
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
    const fileName = getFileNameFromRecord(record);

    if (descriptionColumn) {
      if (checkIsDescribableDoc(record)) {
        list.push({ value: OPERATION.GENERATE_DESCRIPTION, label: gettext('Generate description'), record });
      } else if (canModifyRow && Utils.imageCheck(fileName)) {
        list.push({ value: OPERATION.IMAGE_CAPTION, label: gettext('Generate image description'), record });
      }
    }

    if (enableOCR && canModifyRow && Utils.imageCheck(fileName)) {
      list.push({ value: OPERATION.OCR, label: gettext('OCR'), record });
    }

    if (canModifyRow && (Utils.imageCheck(fileName) || Utils.videoCheck(fileName))) {
      list.push({ value: OPERATION.FILE_DETAIL, label: gettext('Extract file detail'), record: record });
    }

    if (tagsColumn && canModifyRow && (Utils.imageCheck(fileName) || checkIsDescribableDoc(record))) {
      list.push({ value: OPERATION.FILE_TAGS, label: gettext('Generate file tags'), record: record });
    }

    // handle delete folder/file
    if (canDeleteRow) {
      list.push({ value: OPERATION.DELETE_RECORD, label: isFolder ? gettext('Delete folder') : gettext('Delete file'), record });
    }

    if (canModifyRow && column && isNameColumn(column)) {
      list.push({ value: OPERATION.RENAME_FILE, label: isFolder ? gettext('Rename folder') : gettext('Rename file'), record });
    }

    return list;
  }, [visible, isGroupView, selectedPosition, recordMetrics, selectedRange, metadata, recordGetterByIndex, checkIsDescribableDoc, enableOCR, getAbleDeleteRecords]);

  const handleHide = useCallback((event) => {
    if (!menuRef.current && visible) {
      setVisible(false);
      return;
    }

    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setVisible(false);
    }
  }, [menuRef, visible]);

  const generateDescription = useCallback((record) => {
    const descriptionColumnKey = PRIVATE_COLUMN_KEY.FILE_DESCRIPTION;
    let path = '';
    let idOldRecordData = {};
    let idOriginalOldRecordData = {};
    const fileName = getFileNameFromRecord(record);
    if (Utils.isDescriptionSupportedFile(fileName) && checkCanModifyRow(record)) {
      const parentDir = getParentDirFromRecord(record);
      path = Utils.joinPath(parentDir, fileName);
      idOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [descriptionColumnKey]: record[descriptionColumnKey] };
      idOriginalOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [descriptionColumnKey]: record[descriptionColumnKey] };
    }
    if (path === '') return;
    window.sfMetadataContext.generateDescription(path).then(res => {
      const description = res.data.summary;
      const updateRecordId = record[PRIVATE_COLUMN_KEY.ID];
      const recordIds = [updateRecordId];
      let idRecordUpdates = {};
      let idOriginalRecordUpdates = {};
      idRecordUpdates[updateRecordId] = { [descriptionColumnKey]: description };
      idOriginalRecordUpdates[updateRecordId] = { [descriptionColumnKey]: description };
      updateRecords({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData });
    }).catch(error => {
      const errorMessage = gettext('Failed to generate description');
      toaster.danger(errorMessage);
    });
  }, [updateRecords]);

  const imageCaption = useCallback((record) => {
    const summaryColumnKey = PRIVATE_COLUMN_KEY.FILE_DESCRIPTION;
    let path = '';
    let idOldRecordData = {};
    let idOriginalOldRecordData = {};
    const fileName = getFileNameFromRecord(record);
    if (Utils.imageCheck(fileName) && checkCanModifyRow(record)) {
      const parentDir = getParentDirFromRecord(record);
      path = Utils.joinPath(parentDir, fileName);
      idOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
      idOriginalOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [summaryColumnKey]: record[summaryColumnKey] };
    }
    if (path === '') return;
    window.sfMetadataContext.imageCaption(path).then(res => {
      const desc = res.data.desc;
      const updateRecordId = record[PRIVATE_COLUMN_KEY.ID];
      const recordIds = [updateRecordId];
      let idRecordUpdates = {};
      let idOriginalRecordUpdates = {};
      idRecordUpdates[updateRecordId] = { [summaryColumnKey]: desc };
      idOriginalRecordUpdates[updateRecordId] = { [summaryColumnKey]: desc };
      updateRecords({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData });
    }).catch(error => {
      const errorMessage = gettext('Failed to generate image description');
      toaster.danger(errorMessage);
    });
  }, [updateRecords]);

  const toggleFileTagsRecord = useCallback((record = null) => {
    setFileTagsRecord(record);
  }, []);

  const ocr = useCallback((record) => {
    const ocrResultColumnKey = PRIVATE_COLUMN_KEY.OCR;
    let path = '';
    let idOldRecordData = {};
    let idOriginalOldRecordData = {};
    const fileName = getFileNameFromRecord(record);
    if (Utils.imageCheck(fileName) && checkCanModifyRow(record)) {
      const parentDir = getParentDirFromRecord(record);
      path = Utils.joinPath(parentDir, fileName);
      idOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [ocrResultColumnKey]: record[ocrResultColumnKey] };
      idOriginalOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [ocrResultColumnKey]: record[ocrResultColumnKey] };
    }
    if (path === '') return;
    window.sfMetadataContext.ocr(path).then(res => {
      const ocrResult = res.data.ocr_result;
      const updateRecordId = record[PRIVATE_COLUMN_KEY.ID];
      const recordIds = [updateRecordId];
      let idRecordUpdates = {};
      let idOriginalRecordUpdates = {};
      idRecordUpdates[updateRecordId] = { [ocrResultColumnKey]: ocrResult ? JSON.stringify(ocrResult) : null };
      idOriginalRecordUpdates[updateRecordId] = { [ocrResultColumnKey]: ocrResult ? JSON.stringify(ocrResult) : null };
      updateRecords({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData });
    }).catch(error => {
      const errorMessage = gettext('OCR failed');
      toaster.danger(errorMessage);
    });
  }, [updateRecords]);

  const updateFileDetails = useCallback((records) => {
    const recordObjIds = records.map(record => getFileObjIdFromRecord(record));
    if (recordObjIds.length > 50) {
      toaster.danger(gettext('Select up to 50 files'));
      return;
    }

    const recordIds = records.map(record => getRecordIdFromRecord(record));
    window.sfMetadataContext.extractFileDetails(recordObjIds).then(res => {
      const captureColumn = getColumnByKey(metadata.columns, PRIVATE_COLUMN_KEY.CAPTURE_TIME);

      if (captureColumn) {
        let idOldRecordData = {};
        let idOriginalOldRecordData = {};
        const captureColumnKey = PRIVATE_COLUMN_KEY.CAPTURE_TIME;
        records.forEach(record => {
          idOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [captureColumnKey]: record[captureColumnKey] };
          idOriginalOldRecordData[record[PRIVATE_COLUMN_KEY.ID]] = { [captureColumnKey]: record[captureColumnKey] };
        });
        let idRecordUpdates = {};
        let idOriginalRecordUpdates = {};
        res.data.details.forEach(detail => {
          const updateRecordId = detail[PRIVATE_COLUMN_KEY.ID];
          idRecordUpdates[updateRecordId] = { [captureColumnKey]: detail[captureColumnKey] };
          idOriginalRecordUpdates[updateRecordId] = { [captureColumnKey]: detail[captureColumnKey] };
        });
        updateRecords({ recordIds, idRecordUpdates, idOriginalRecordUpdates, idOldRecordData, idOriginalOldRecordData });
      }
    }).catch(error => {
      const errorMessage = gettext('Failed to extract file details');
      toaster.danger(errorMessage);
    });
  }, [metadata, updateRecords]);

  const handleOptionClick = useCallback((event, option) => {
    event.stopPropagation();
    const repoID = window.sfMetadataStore.repoId;
    switch (option.value) {
      case OPERATION.OPEN_IN_NEW_TAB: {
        const { record } = option;
        openInNewTab(repoID, record);
        break;
      }
      case OPERATION.OPEN_PARENT_FOLDER: {
        event.preventDefault();
        event.stopPropagation();
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
        generateDescription(record);
        break;
      }
      case OPERATION.IMAGE_CAPTION: {
        const { record } = option;
        if (!record) break;
        imageCaption(record);
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
      default: {
        break;
      }
    }
    setVisible(false);
  }, [onCopySelected, onClearSelected, generateDescription, imageCaption, ocr, deleteRecords, toggleDeleteFolderDialog, selectNone, updateFileDetails, toggleFileTagsRecord]);

  const getMenuPosition = useCallback((x = 0, y = 0) => {
    let menuStyles = {
      top: y,
      left: x
    };
    if (!menuRef.current) return menuStyles;
    const rect = menuRef.current.getBoundingClientRect();
    const tableCanvasContainerRect = getTableCanvasContainerRect();
    const tableContentRect = getTableContentRect();
    const { right: innerWidth, bottom: innerHeight } = tableContentRect;
    menuStyles.top = menuStyles.top - tableCanvasContainerRect.top;
    menuStyles.left = menuStyles.left - tableCanvasContainerRect.left;

    if (y + rect.height > innerHeight - 10) {
      menuStyles.top -= rect.height;
    }
    if (x + rect.width > innerWidth) {
      menuStyles.left -= rect.width;
    }
    if (menuStyles.top < 0) {
      menuStyles.top = rect.bottom > innerHeight ? (innerHeight - 10 - rect.height) / 2 : 0;
    }
    if (menuStyles.left < 0) {
      menuStyles.left = rect.width < innerWidth ? (innerWidth - rect.width) / 2 : 0;
    }
    return menuStyles;
  }, [getTableContentRect, getTableCanvasContainerRect]);

  useEffect(() => {
    const handleShow = (event) => {
      event.preventDefault();
      if (menuRef.current && menuRef.current.contains(event.target)) return;

      setVisible(true);

      const position = getMenuPosition(event.clientX, event.clientY);
      setPosition(position);
    };

    document.addEventListener('contextmenu', handleShow);

    return () => {
      document.removeEventListener('contextmenu', handleShow);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (visible) {
      document.addEventListener('mousedown', handleHide);
    } else {
      document.removeEventListener('mousedown', handleHide);
    }

    return () => {
      document.removeEventListener('mousedown', handleHide);
    };
  }, [visible, handleHide]);

  const renderMenu = useCallback(() => {
    if (!visible) return null;
    if (options.length === 0) return null;
    return (
      <div
        ref={menuRef}
        className='dropdown-menu sf-metadata-contextmenu'
        style={position}
      >
        {options.map((option, index) => (
          <button
            key={index}
            className='dropdown-item sf-metadata-contextmenu-item'
            onClick={(event) => handleOptionClick(event, option)}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }, [visible, options, position, handleOptionClick]);

  return (
    <>
      {renderMenu()}
      {fileTagsRecord && (
        <FileTagsDialog record={fileTagsRecord} onToggle={toggleFileTagsRecord} onSubmit={updateFileTags} />
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
