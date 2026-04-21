/**
 * Selection state management for table records.
 * Handles record selection/deselection, selected IDs tracking, and drag-selection logic.
 *
 * Key concepts:
 * - Record selection is stored in `idSelectedRecordMap` (recordId -> boolean)
 * - "Record" refers to the data model row in table data
 * - Used by SelectionMask, CellMask, and other selection-related components
 */

function selectRecord(recordId, recordMetrics) {
  if (isRecordSelected(recordId, recordMetrics)) {
    return;
  }
  recordMetrics.idSelectedRecordMap[recordId] = true;
}

function selectRecordsById(recordIds, recordMetrics) {
  recordIds.forEach(recordId => {
    selectRecord(recordId, recordMetrics);
  });
}

function deselectRecord(recordId, recordMetrics) {
  if (!isRecordSelected(recordId, recordMetrics)) {
    return;
  }
  delete recordMetrics.idSelectedRecordMap[recordId];
}

function deselectAllRecords(recordMetrics) {
  recordMetrics.idSelectedRecordMap = {};
}

function isRecordSelected(recordId, recordMetrics) {
  return recordMetrics.idSelectedRecordMap[recordId];
}

function getSelectedIds(recordMetrics) {
  return Object.keys(recordMetrics.idSelectedRecordMap);
}

function hasSelectedRecords(recordMetrics) {
  return getSelectedIds(recordMetrics).length > 0;
}

function isSelectedAll(recordIds, recordMetrics) {
  const selectedRecordsLen = getSelectedIds(recordMetrics).length;
  if (selectedRecordsLen === 0) {
    return false;
  }
  return recordIds.every(recordId => isRecordSelected(recordId, recordMetrics));
}

function getDraggedRecordsIds(draggingRecordId, recordMetrics) {
  const selectedRecordIds = getSelectedIds(recordMetrics);
  if (selectedRecordIds.includes(draggingRecordId)) {
    return selectedRecordIds;
  }
  return [draggingRecordId];
}

export const RecordMetrics = {
  selectRecord,
  selectRecordsById,
  deselectRecord,
  deselectAllRecords,
  isRecordSelected,
  getSelectedIds,
  hasSelectedRecords,
  isSelectedAll,
  getDraggedRecordsIds,
};
