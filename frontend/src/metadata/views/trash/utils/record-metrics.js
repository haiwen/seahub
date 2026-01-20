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

const recordMetrics = {
  selectRecord,
  selectRecordsById,
  deselectRecord,
  deselectAllRecords,
  isRecordSelected,
  getSelectedIds,
  hasSelectedRecords,
  isSelectedAll,
};

export default recordMetrics;
