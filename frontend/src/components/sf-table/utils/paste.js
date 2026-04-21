import { getColumnByIndex, getColumnOriginName } from './column';
import { getCellValueByColumn, getFileNameFromRecord, isCellValueChanged } from './cell';
import { PASTE_SOURCE, TRANSFER_TYPES } from '../constants/transfer-types';
import { CellType, PRIVATE_COLUMN_KEY } from '../../../metadata/constants';
import { Utils } from '@/utils/utils';
import { convertCellValue } from './convert-utils';

const isCopyPaste = true;

/**
 * Paste utility for sf-table
 * Handles paste operations including:
 * - Multi-row/column paste
 * - Type conversion between different column types
 * - TAGS field special handling via updateFileTags API
 * - Cut-paste operations (clearing source after paste)
 */
class PasteUtils {
  constructor(metadata, api) {
    this.metadata = metadata;
    this.api = api;
  }

  /**
   * Clear cut data from source cells when pasting from cut operation
   * @param {Object} cutPosition - Position where cut started
   * @param {Object} cutData - Data that was cut { copiedRecords, copiedColumns }
   * @param {boolean} isGroupView - Whether in group view mode
   * @param {Function} canModifyRow - Permission function: (record) => boolean
   */
  clearCutData(cutPosition, cutData, isGroupView, canModifyRow) {
    let { rowIdx: startRecordIndex, groupRecordIndex } = cutPosition;
    const { copiedColumns, copiedRecords } = cutData;
    let updateRecordIds = [];
    let idRecordUpdates = {};
    let idOldRecordData = {};
    let updateTags = [];

    copiedRecords.forEach((record, index) => {
      const cutRowIdx = startRecordIndex + index;
      const cutRecord = this.api.recordGetterByIndex({ isGroupView, groupRecordIndex: groupRecordIndex, recordIndex: cutRowIdx });
      groupRecordIndex++;
      const cutRecordId = cutRecord._id;
      const canModify = canModifyRow ? canModifyRow(cutRecord) : true;
      if (canModify) {
        updateRecordIds.push(cutRecordId);
        copiedColumns.forEach((copiedColumn) => {
          if (copiedColumn.editable) {
            const cellValue = getCellValueByColumn(cutRecord, copiedColumn);
            const copiedColumnName = getColumnOriginName(copiedColumn);
            if (copiedColumn.type === CellType.TAGS) {
              const oldValue = Array.isArray(cellValue) ? cellValue : [];
              if (oldValue.length > 0) {
                updateTags.push({
                  record_id: cutRecordId,
                  tags: [],
                  old_tags: oldValue.map(i => i.row_id),
                });
              }
            } else {
              idRecordUpdates[cutRecordId] = Object.assign({}, idRecordUpdates[cutRecordId], { [copiedColumnName]: null });
              idOldRecordData[cutRecordId] = Object.assign({}, idOldRecordData[cutRecordId], { [copiedColumnName]: cellValue });
            }
          }
        });
      }
    });

    if (Object.keys(idRecordUpdates).length > 0) {
      this.api.modifyRecords(updateRecordIds, idRecordUpdates, idRecordUpdates, idOldRecordData, idOldRecordData, true);
    }

    if (updateTags.length > 0) {
      this.api.updateFileTags(updateTags);
    }
  }

  /**
   * Main paste operation
   * @param {Object} params - Paste parameters
   * @param {string} params.type - Transfer type (METADATA_FRAGMENT, TEXT, HTML, etc.)
   * @param {Object} params.copied - Copied data { copiedRecords, copiedColumns }
   * @param {boolean} params.multiplePaste - Whether this is a multi-cell paste range
   * @param {Object} params.pasteRange - Target paste range { topLeft, bottomRight }
   * @param {boolean} params.isGroupView - Whether in group view mode
   * @param {Array} params.columns - Available columns
   * @param {string} params.viewId - Current view ID
   * @param {string} params.pasteSource - Paste source type (CUT, COPY)
   * @param {Object} params.cutPosition - Position where cut started (for cut-paste)
   * @param {Function} params.canModifyRow - Permission function: (record) => boolean
   * @param {Function} params.canModifyColumn - Permission function: (column) => boolean
   */
  async paste({
    type,
    copied,
    multiplePaste,
    pasteRange,
    isGroupView,
    columns,
    viewId,
    pasteSource,
    cutPosition,
    canModifyRow,
    canModifyColumn,
  }) {
    const { row_ids: renderRecordIds } = this.metadata || {};
    const { topLeft, bottomRight = {} } = pasteRange;
    const { rowIdx: startRecordIndex, idx: startColumnIndex, groupRecordIndex } = topLeft;
    const { rowIdx: endRecordIndex, idx: endColumnIndex } = bottomRight;
    const { copiedRecords, copiedColumns } = copied || {};

    if (!Array.isArray(copiedRecords) || !Array.isArray(copiedColumns)) {
      return;
    }

    const copiedRecordsLen = copiedRecords.length;
    const copiedColumnsLen = copiedColumns.length;

    if (copiedRecordsLen === 0 || copiedColumnsLen === 0) {
      return;
    }

    const pasteRecordsLen = multiplePaste ? endRecordIndex - startRecordIndex + 1 : copiedRecordsLen;
    const pasteColumnsLen = multiplePaste ? endColumnIndex - startColumnIndex + 1 : copiedColumnsLen;
    const renderRecordsCount = Array.isArray(renderRecordIds) ? renderRecordIds.length : 0;

    // Handle cut-paste: clear source data if pasting within same view
    const isFromCut = pasteSource === PASTE_SOURCE.CUT && type === TRANSFER_TYPES.METADATA_FRAGMENT;
    if (isFromCut) {
      const { search } = window.location;
      const urlParams = new URLSearchParams(search);
      const currentViewId = urlParams.has('view') && urlParams.get('view');
      if (currentViewId === viewId) {
        this.clearCutData(cutPosition, copied, isGroupView);
      }
    }

    // Need expand records
    const startExpandRecordIndex = renderRecordsCount - startRecordIndex;

    if (renderRecordsCount === 0 || isNaN(startExpandRecordIndex) || (copiedRecordsLen > startExpandRecordIndex)) {
      return;
    }

    let updateTags = [];
    let updateRecordIds = [];
    let idRecordUpdates = {};
    let idOriginalRecordUpdates = {};
    let idOldRecordData = {};
    let idOriginalOldRecordData = {};
    let currentGroupRecordIndex = groupRecordIndex;

    for (let i = 0; i < pasteRecordsLen; i++) {
      const pasteRecord = this.api.recordGetterByIndex({
        isGroupView,
        groupRecordIndex: currentGroupRecordIndex,
        recordIndex: startRecordIndex + i,
      });

      if (isGroupView) {
        currentGroupRecordIndex++;
      }

      if (!pasteRecord) {
        continue;
      }

      const updateRecordId = pasteRecord._id;
      const copiedRecordIndex = i % copiedRecordsLen;
      const copiedRecord = copiedRecords[copiedRecordIndex];

      let originalUpdate = {};
      let originalKeyUpdate = {};
      let originalOldRecordData = {};
      let originalKeyOldRecordData = {};

      const filename = getFileNameFromRecord(pasteRecord);

      for (let j = 0; j < pasteColumnsLen; j++) {
        const pasteColumn = getColumnByIndex(j + startColumnIndex, columns);

        if (!pasteColumn) {
          continue;
        }

        // Check modify permissions
        if (canModifyRow && !canModifyRow(pasteRecord)) {
          continue;
        }
        if (canModifyColumn && !canModifyColumn(pasteColumn)) {
          continue;
        }

        // Skip capture_time for non-image/video files
        if (pasteColumn.key === PRIVATE_COLUMN_KEY.CAPTURE_TIME) {
          if (!(Utils.imageCheck(filename) || Utils.videoCheck(filename))) {
            continue;
          }
        }

        const copiedColumnIndex = j % copiedColumnsLen;
        const copiedColumn = getColumnByIndex(copiedColumnIndex, copiedColumns);
        const pasteColumnName = getColumnOriginName(pasteColumn);
        const copiedColumnName = getColumnOriginName(copiedColumn);

        const pasteCellValue = Object.prototype.hasOwnProperty.call(pasteRecord, pasteColumnName)
          ? getCellValueByColumn(pasteRecord, pasteColumn)
          : null;
        const copiedCellValue = Object.prototype.hasOwnProperty.call(copiedRecord, copiedColumnName)
          ? getCellValueByColumn(copiedRecord, copiedColumn)
          : null;

        // Convert cell value based on column types
        const update = convertCellValue(copiedCellValue, pasteCellValue, pasteColumn, copiedColumn, this.api);

        if (!isCellValueChanged(pasteCellValue, update, pasteColumn.type)) {
          continue;
        }

        // Handle TAGS type specially
        if (pasteColumn.type === CellType.TAGS) {
          updateTags.push({
            record_id: updateRecordId,
            tags: Array.isArray(update) ? update.map(i => i.row_id) : [],
            old_tags: Array.isArray(pasteCellValue) ? pasteCellValue.map(i => i.row_id) : [],
          });
          continue;
        }

        originalUpdate[pasteColumnName] = update;
        originalKeyUpdate[pasteColumn.key] = update;
        originalOldRecordData[pasteColumnName] = pasteCellValue;
        originalKeyOldRecordData[pasteColumn.key] = pasteCellValue;
      }

      if (Object.keys(originalUpdate).length > 0) {
        updateRecordIds.push(updateRecordId);
        idRecordUpdates[updateRecordId] = originalUpdate;
        idOriginalRecordUpdates[updateRecordId] = originalKeyUpdate;
        idOldRecordData[updateRecordId] = originalOldRecordData;
        idOriginalOldRecordData[updateRecordId] = originalKeyOldRecordData;
      }
    }

    // Apply updates
    if (updateTags.length > 0 && this.api.updateFileTags) {
      this.api.updateFileTags(updateTags);
    }

    if (updateRecordIds.length === 0) {
      return;
    }

    this.api.modifyRecords(
      updateRecordIds,
      idRecordUpdates,
      idOriginalRecordUpdates,
      idOldRecordData,
      idOriginalOldRecordData,
      isCopyPaste
    );
  }
}

export default PasteUtils;
