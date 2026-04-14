/**
 * GridUtils adapter for DirTableView.
 * Provides copy/paste and drag-fill operations for file metadata.
 */
import { TRANSFER_TYPES, PASTE_SOURCE } from '@/components/sf-table/constants/transfer-types';
import { getColumnByIndex, getColumnOriginName } from '@/components/sf-table/utils/column';
import { getCellValueByColumn } from '@/components/sf-table/utils/cell';
import { CellType } from '@/metadata/constants';

class DirTableGridUtilsAdapter {
  /**
   * @param {Object} options
   * @param {Array} options.renderRecordsIds - Array of record IDs (row_ids)
   * @param {Function} options.recordGetterById - Get record by ID
   * @param {Function} options.recordGetterByIndex - Get record by index
   * @param {Function} options.modifyRecords - Update records with metadata updates
   * @param {Function} options.updateFileTags - Update file tags
   * @param {Function} options.getTagsData - Get tags data
   * @param {Function} options.getCollaborators - Get collaborators list
   */
  constructor(options) {
    this.renderRecordsIds = options.renderRecordsIds || [];
    this.api = {
      recordGetterById: options.recordGetterById,
      recordGetterByIndex: options.recordGetterByIndex,
      modifyRecords: options.modifyRecords,
      updateFileTags: options.updateFileTags,
      getTagsData: options.getTagsData || (() => ({})),
      getCollaborators: options.getCollaborators || (() => []),
    };
  }

  /**
   * Get copied content for paste operation
   * @param {Object} params
   * @param {string} params.type - Transfer type
   * @param {Object} params.copied - Copied data { selectedRecordIds, copiedRange }
   * @param {boolean} params.isGroupView - Whether in group view
   * @param {Array} params.columns - Available columns
   * @returns {Object} { copiedRecords, copiedColumns }
   */
  getCopiedContent({ type, copied, isGroupView, columns }) {
    if (type === TRANSFER_TYPES.METADATA_FRAGMENT) {
      const { selectedRecordIds, copiedRange } = copied;

      // Copy from selected rows (via checkbox selection)
      if (Array.isArray(selectedRecordIds) && selectedRecordIds.length > 0) {
        return {
          copiedRecords: selectedRecordIds.map(id => this.api.recordGetterById(id)),
          copiedColumns: [...columns],
        };
      }

      // Copy from selected range (via drag selection)
      if (copiedRange) {
        let copiedRecords = [];
        let copiedColumns = [];
        const { topLeft, bottomRight } = copiedRange;
        const { rowIdx: minRecordIndex, idx: minColumnIndex } = topLeft;
        const { rowIdx: maxRecordIndex, idx: maxColumnIndex } = bottomRight;

        for (let i = minRecordIndex; i <= maxRecordIndex; i++) {
          const record = this.api.recordGetterByIndex({ isGroupView, recordIndex: i });
          if (record) {
            copiedRecords.push(record);
          }
        }

        for (let i = minColumnIndex; i <= maxColumnIndex; i++) {
          copiedColumns.push(getColumnByIndex(i, columns));
        }

        return { copiedRecords, copiedColumns };
      }
    }

    // External copy as fallback
    const { copiedRecords, copiedColumns } = copied || {};
    return { copiedRecords: copiedRecords || [], copiedColumns: copiedColumns || [] };
  }

  /**
   * Get updated records for drag-fill operation
   * @param {Object} draggedRange - The dragged range
   * @param {Array} shownColumns - Columns to update
   * @param {Array} rows - All rows
   * @param {Object} idRowMap - Map of row id to row
   * @param {Object} groupMetrics - Group metrics for group view
   * @param {Function} canModifyRow - Permission function
   * @param {Function} canModifyColumn - Permission function
   * @returns {Object} { updateRecordIds, idRecordUpdates }
   */
  getUpdateDraggedRecords(draggedRange, shownColumns, rows, idRowMap, groupMetrics, canModifyRow, canModifyColumn) {
    const { topLeft, bottomRight } = draggedRange;
    if (!topLeft || !bottomRight) {
      return { updateRecordIds: [], idRecordUpdates: {} };
    }

    const { rowIdx: minRecordIndex, idx: minColumnIndex } = topLeft;
    const { rowIdx: maxRecordIndex, idx: maxColumnIndex } = bottomRight;

    const updateRecordIds = [];
    const idRecordUpdates = {};

    // Only support single column drag-fill currently
    if (minColumnIndex !== maxColumnIndex) {
      return { updateRecordIds: [], idRecordUpdates: {} };
    }

    const sourceColumn = getColumnByIndex(minColumnIndex, shownColumns);
    if (!sourceColumn || !sourceColumn.editable) {
      return { updateRecordIds: [], idRecordUpdates: {} };
    }

    // Get source values
    const sourceValues = [];
    for (let i = minRecordIndex; i <= maxRecordIndex; i++) {
      const record = rows[i];
      if (record) {
        const cellValue = getCellValueByColumn(record, sourceColumn);
        sourceValues.push(cellValue);
      }
    }

    if (sourceValues.length === 0) {
      return { updateRecordIds: [], idRecordUpdates: {} };
    }

    // Apply drag-fill to all records below/above the source
    const totalRecords = rows.length;
    const fillStartIndex = maxRecordIndex + 1;

    for (let i = fillStartIndex; i < totalRecords; i++) {
      const record = rows[i];
      if (!record) continue;

      const recordId = record._id;
      const canModify = canModifyRow ? canModifyRow(record) : true;
      if (!canModify) continue;

      const columnName = getColumnOriginName(sourceColumn);
      if (!columnName) continue;

      // Calculate fill value based on sequence detection
      const fillValue = this.calculateFillValue(sourceValues, i - maxRecordIndex, sourceColumn);

      if (fillValue !== undefined) {
        updateRecordIds.push(recordId);
        idRecordUpdates[recordId] = {
          ...idRecordUpdates[recordId],
          [columnName]: fillValue,
        };
      }
    }

    return {
      recordIds: updateRecordIds,
      idRecordUpdates,
      idOriginalRecordUpdates: {},
      idOldRecordData: {},
      idOriginalOldRecordData: {},
    };
  }

  /**
   * Calculate fill value for drag-fill sequence
   */
  calculateFillValue(sourceValues, offset, column) {
    if (!sourceValues || sourceValues.length === 0) return undefined;

    const lastValue = sourceValues[sourceValues.length - 1];
    const secondLastValue = sourceValues.length > 1 ? sourceValues[sourceValues.length - 2] : null;

    // Detect sequence type and calculate next value
    if (column.type === CellType.NUMBER) {
      return this.calculateNumberSequence(lastValue, secondLastValue, offset);
    }

    // For other types, just repeat the last value
    return lastValue;
  }

  calculateNumberSequence(lastValue, secondLastValue, offset) {
    if (typeof lastValue !== 'number') return lastValue;

    // Detect increment
    if (secondLastValue !== null && typeof secondLastValue === 'number') {
      const diff = lastValue - secondLastValue;
      return lastValue + diff * offset;
    }

    // Default: keep incrementing by 1
    return lastValue + offset;
  }

  /**
   * Main paste operation
   * @param {Object} params - Paste parameters
   * @param {string} params.type - Transfer type
   * @param {Object} params.copied - Copied data { copiedRecords, copiedColumns }
   * @param {boolean} params.multiplePaste - Whether this is a multi-cell paste
   * @param {Object} params.pasteRange - Target paste range { topLeft, bottomRight }
   * @param {boolean} params.isGroupView - Whether in group view
   * @param {Array} params.columns - Available columns
   * @param {string} params.pasteSource - Paste source (CUT, COPY)
   * @param {Object} params.cutPosition - Position where cut started
   * @param {Function} params.canModifyRow - Permission function
   * @param {Function} params.canModifyColumn - Permission function
   */
  paste({
    type,
    copied,
    multiplePaste,
    pasteRange,
    isGroupView,
    columns,
    pasteSource,
    cutPosition,
    canModifyRow,
    canModifyColumn,
  }) {
    const { topLeft, bottomRight = {} } = pasteRange || {};
    if (!topLeft || !copied) {
      return;
    }

    const { rowIdx: startRecordIndex, idx: startColumnIndex } = topLeft;
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

    const pasteRecordsLen = multiplePaste ? (endRecordIndex - startRecordIndex + 1) : copiedRecordsLen;
    const pasteColumnsLen = multiplePaste ? (endColumnIndex - startColumnIndex + 1) : copiedColumnsLen;

    // Handle cut-paste: clear source data if pasting within same view
    const isFromCut = pasteSource === PASTE_SOURCE.CUT && type === TRANSFER_TYPES.METADATA_FRAGMENT;
    if (isFromCut) {
      this.clearCutData(cutPosition, copied, isGroupView, canModifyRow);
    }

    let updateTags = [];
    let updateRecordIds = [];
    let idRecordUpdates = {};
    let idOldRecordData = {};

    for (let i = 0; i < pasteRecordsLen; i++) {
      const pasteRecord = this.api.recordGetterByIndex({
        isGroupView,
        recordIndex: startRecordIndex + i,
      });

      if (!pasteRecord) {
        continue;
      }

      const updateRecordId = pasteRecord._id;
      const canModify = canModifyRow ? canModifyRow(pasteRecord) : true;
      if (!canModify) continue;

      const copiedRecordIndex = i % copiedRecordsLen;
      const copiedRecord = copiedRecords[copiedRecordIndex];

      for (let j = 0; j < pasteColumnsLen; j++) {
        const pasteColumn = getColumnByIndex(j + startColumnIndex, columns);
        if (!pasteColumn) continue;

        // Check column permissions
        const canModifyCol = canModifyColumn ? canModifyColumn(pasteColumn) : true;
        if (!canModifyCol) continue;

        if (!pasteColumn.editable) continue;

        const copiedColumnIndex = j % copiedColumnsLen;
        const copiedColumn = copiedColumns[copiedColumnIndex];
        if (!copiedColumn) continue;

        // Check type compatibility between source and target columns
        if (pasteColumn.type !== copiedColumn.type) {
          continue;
        }

        const cellValue = getCellValueByColumn(copiedRecord, copiedColumn);
        const columnName = getColumnOriginName(pasteColumn);

        if (pasteColumn.type === CellType.TAGS) {
          // For tags, we need to use updateFileTags API
          const pasteCellValue = getCellValueByColumn(pasteRecord, pasteColumn);
          const oldTags = Array.isArray(pasteCellValue) ? pasteCellValue.map(tag => tag.row_id) : [];
          const newTags = Array.isArray(cellValue) ? cellValue.map(tag => tag.row_id) : [];
          if (newTags.length > 0) {
            updateTags.push({
              record_id: updateRecordId,
              tags: newTags,
              old_tags: oldTags,
            });
          }
        } else if (pasteColumn.type === CellType.COLLABORATOR) {
          const originalCellValue = getCellValueByColumn(pasteRecord, pasteColumn);
          if (!updateRecordIds.includes(updateRecordId)) {
            updateRecordIds.push(updateRecordId);
          }
          idRecordUpdates[updateRecordId] = Object.assign({}, idRecordUpdates[updateRecordId], { [columnName]: cellValue });
          idOldRecordData[updateRecordId] = Object.assign({}, idOldRecordData[updateRecordId], { [columnName]: originalCellValue });
        } else {
          const originalCellValue = getCellValueByColumn(pasteRecord, pasteColumn);
          if (!updateRecordIds.includes(updateRecordId)) {
            updateRecordIds.push(updateRecordId);
          }
          idRecordUpdates[updateRecordId] = Object.assign({}, idRecordUpdates[updateRecordId], { [columnName]: cellValue });
          idOldRecordData[updateRecordId] = Object.assign({}, idOldRecordData[updateRecordId], { [columnName]: originalCellValue });
        }
      }
    }

    if (Object.keys(idRecordUpdates).length > 0) {
      this.api.modifyRecords(updateRecordIds, idRecordUpdates);
    }

    if (updateTags.length > 0) {
      this.api.updateFileTags(updateTags);
    }
  }

  /**
   * Clear cut data from source cells when pasting from cut operation
   * @param {Object} cutPosition - Position where cut started
   * @param {Object} cutData - Data that was cut { copiedRecords, copiedColumns }
   * @param {boolean} isGroupView - Whether in group view mode
   * @param {Function} canModifyRow - Permission function
   */
  clearCutData(cutPosition, cutData, isGroupView, canModifyRow) {
    let { rowIdx: startRecordIndex } = cutPosition;
    const { copiedColumns, copiedRecords } = cutData;
    let updateRecordIds = [];
    let idRecordUpdates = {};
    let idOldRecordData = {};
    let updateTags = [];

    copiedRecords.forEach((record, index) => {
      const cutRowIdx = startRecordIndex + index;
      const cutRecord = this.api.recordGetterByIndex({ isGroupView, recordIndex: cutRowIdx });
      if (!cutRecord) return;

      const cutRecordId = cutRecord._id;
      const canModify = canModifyRow ? canModifyRow(cutRecord) : true;
      if (!canModify) return;

      copiedColumns.forEach((copiedColumn) => {
        if (copiedColumn.editable) {
          const cellValue = getCellValueByColumn(cutRecord, copiedColumn);
          const columnName = getColumnOriginName(copiedColumn);

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
            if (!updateRecordIds.includes(cutRecordId)) {
              updateRecordIds.push(cutRecordId);
            }
            idRecordUpdates[cutRecordId] = Object.assign({}, idRecordUpdates[cutRecordId], { [columnName]: null });
            idOldRecordData[cutRecordId] = Object.assign({}, idOldRecordData[cutRecordId], { [columnName]: cellValue });
          }
        }
      });
    });

    if (Object.keys(idRecordUpdates).length > 0) {
      this.api.modifyRecords(updateRecordIds, idRecordUpdates, {}, idOldRecordData, {}, true);
    }

    if (updateTags.length > 0) {
      this.api.updateFileTags(updateTags);
    }
  }
}

export default DirTableGridUtilsAdapter;
