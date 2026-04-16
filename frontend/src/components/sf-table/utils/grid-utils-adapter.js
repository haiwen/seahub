/**
 * Unified GridUtils adapter for SFTable.
 * Provides copy/paste, drag-fill, and clear-cut operations for both
 * metadata table and DirTableView with full functionality.
 */
import GridUtils from './grid';
import PasteUtils from './paste';

class GridUtilsAdapter {
  /**
   * @param {Object} options
   * @param {Array} options.renderRecordsIds - Array of record IDs (row_ids)
   * @param {Object} options.api - API methods
   * @param {Function} options.api.recordGetterById - Get record by ID
   * @param {Function} options.api.recordGetterByIndex - Get record by index
   * @param {Function} options.api.modifyRecords - Update records
   * @param {Function} options.api.updateFileTags - Update file tags
   * @param {Function} options.api.getTagsData - Get tags data
   * @param {Function} options.api.getCollaborators - Get collaborators
   */
  constructor({ renderRecordsIds = [], api }) {
    this.api = api;

    // GridUtils handles getCopiedContent and getUpdateDraggedRecords
    this.gridUtils = new GridUtils(renderRecordsIds, api);

    // PasteUtils handles paste and clearCutData
    // PasteUtils expects metadata with row_ids field
    this.pasteUtils = new PasteUtils({ row_ids: renderRecordsIds }, api);
  }

  /**
   * Get copied content for paste operation
   * @param {string} params.type - Transfer type
   * @param {Object} params.copied - Copied data
   * @param {boolean} params.isGroupView - Whether in group view
   * @param {Array} params.columns - Available columns
   * @returns {Object} { copiedRecords, copiedColumns }
   */
  getCopiedContent({ type, copied, isGroupView, columns }) {
    return this.gridUtils.getCopiedContent({ type, copied, isGroupView, columns });
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
   * @returns {Object} { recordIds, idRecordUpdates, ... }
   */
  getUpdateDraggedRecords(draggedRange, shownColumns, rows, idRowMap, groupMetrics, canModifyRow, canModifyColumn) {
    return this.gridUtils.getUpdateDraggedRecords(draggedRange, shownColumns, rows, idRowMap, groupMetrics, canModifyRow, canModifyColumn);
  }

  /**
   * Paste operation
   * @param {Object} params - Paste parameters
   */
  paste(params) {
    return this.pasteUtils.paste(params);
  }

  /**
   * Clear cut data from source cells when pasting from cut operation
   * @param {Object} cutPosition - Position where cut started
   * @param {Object} cutData - Data that was cut
   * @param {boolean} isGroupView - Whether in group view mode
   * @param {Function} canModifyRow - Permission function
   */
  clearCutData(cutPosition, cutData, isGroupView, canModifyRow) {
    return this.pasteUtils.clearCutData(cutPosition, cutData, isGroupView, canModifyRow);
  }
}

// Backward compatibility alias
const MetadataGridUtilsAdapter = GridUtilsAdapter;

export { GridUtilsAdapter, MetadataGridUtilsAdapter };
export default GridUtilsAdapter;
