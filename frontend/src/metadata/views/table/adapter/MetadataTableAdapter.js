/**
 * MetadataTableAdapter
 *
 * Bridges sf-table's interface with metadata table's GridUtils.
 * Allows sf-table to leverage metadata's complete GridUtils implementation
 * while maintaining a clean separation of concerns.
 *
 * This adapter:
 * 1. Wraps metadata's GridUtils to match sf-table's expected interface
 * 2. Provides metadata-specific canModifyRow/canModifyColumn checks via window.sfMetadataContext
 * 3. Handles Tags/Links updates with the correct API format
 */

import React, { useMemo } from 'react';
import GridUtils from '../utils/grid-utils';

class MetadataGridUtilsAdapter {

  constructor(metadata, api) {
    this.metadata = metadata;
    this.api = api;
    // Create metadata's GridUtils instance
    this.gridUtils = new GridUtils(metadata, api);
  }

  /**
   * Get copied content from selection
   * Delegates to metadata's GridUtils
   */
  getCopiedContent({ type, copied, isGroupView, columns }) {
    return this.gridUtils.getCopiedContent({ type, copied, isGroupView, columns });
  }

  /**
   * Get records to be updated during drag-fill
   * Delegates to metadata's GridUtils which handles:
   * - TAGS updates via updateFileTags API
   * - Other column types via modifyRecords
   */
  getUpdateDraggedRecords(draggedRange, shownColumns, rows, idRowMap, groupMetrics) {
    return this.gridUtils.getUpdateDraggedRecords(draggedRange, shownColumns, rows, idRowMap, groupMetrics);
  }
}

/**
 * Hook to create a MetadataTableAdapter instance
 */
export const useMetadataTableAdapter = ({
  metadata,
  modifyRecord,
  modifyRecords,
  recordGetterByIndex,
  recordGetterById,
  modifyColumnData,
  updateFileTags,
}) => {
  return useMemo(() => {
    const api = {
      modifyRecord,
      modifyRecords,
      recordGetterByIndex,
      recordGetterById,
      modifyColumnData,
      updateFileTags,
    };
    return new MetadataGridUtilsAdapter(metadata, api);
  }, [metadata, modifyRecord, modifyRecords, recordGetterByIndex, recordGetterById, modifyColumnData, updateFileTags]);
};

/**
 * Props adapter that transforms sf-table props to metadata's expected format
 */
export const adaptSfTablePropsToMetadata = (sfTableProps, metadataProps) => {
  const {
    table,
    visibleColumns,
    recordsIds,
    groupbys,
    groups,
    modifyRecords,
    recordGetterByIndex,
    recordGetterById,
    getUpdateDraggedRecords,
    getCopiedRecordsAndColumnsFromRange,
  } = sfTableProps;

  return {
    table,
    columns: visibleColumns,
    recordIds: recordsIds,
    groupbys,
    groups,
    modifyRecords,
    recordGetterByIndex,
    recordGetterById,
    gridUtils: metadataProps?.gridUtils,
    getUpdateDraggedRecords,
    getCopiedRecordsAndColumnsFromRange,
  };
};

export default MetadataGridUtilsAdapter;
