import TRANSFER_TYPES from '../constants/transfer-types';
import { getColumnByIndex } from './column';
import { toggleSelection } from './toggle-selection';

const { TEXT, FRAGMENT } = TRANSFER_TYPES;

function setEventTransfer({
  type, selectedRecordIds, copiedRange, copiedColumns, copiedRecords, copiedTableId, tableData, copiedText,
  recordGetterById, isGroupView, recordGetterByIndex, getClientCellValueDisplayString, event = {},
}) {
  const transfer = event.dataTransfer || event.clipboardData;
  if (type === TRANSFER_TYPES.METADATA_FRAGMENT) {
    const copiedText = Array.isArray(selectedRecordIds) && selectedRecordIds.length > 0 ?
      getCopiedTextFormSelectedRecordIds(selectedRecordIds, tableData, recordGetterById, getClientCellValueDisplayString) :
      getCopiedTextFromSelectedCells(copiedRange, tableData, isGroupView, recordGetterByIndex, getClientCellValueDisplayString);
    const copiedGrid = {
      selectedRecordIds,
      copiedRange,
      copiedColumns,
      copiedRecords,
      copiedTableId,
    };
    const serializeCopiedGrid = JSON.stringify(copiedGrid);
    if (transfer) {
      transfer.setData(TEXT, copiedText);
      transfer.setData(FRAGMENT, serializeCopiedGrid);
    } else {
      execCopyWithNoEvents(copiedText, serializeCopiedGrid);
    }
  } else {
    let format = TRANSFER_TYPES[type.toUpperCase()];
    if (transfer) {
      transfer.setData(format, copiedText);
    } else {
      execCopyWithNoEvents(copiedText, { format });
    }
  }
}

function getCopiedTextFormSelectedRecordIds(selectedRecordIds, tableData, recordGetterById, getClientCellValueDisplayString) {
  const records = selectedRecordIds.map(recordId => recordGetterById(recordId));
  return getCopiedText(records, tableData.columns, getClientCellValueDisplayString);
}

function getCopiedTextFromSelectedCells(copiedRange, tableData, isGroupView, recordGetterByIndex, getClientCellValueDisplayString) {
  const { topLeft, bottomRight } = copiedRange;
  const { rowIdx: minRecordIndex, idx: minColumnIndex, groupRecordIndex } = topLeft;
  const { rowIdx: maxRecordIndex, idx: maxColumnIndex } = bottomRight;
  const { columns } = tableData;
  let currentGroupRecordIndex = groupRecordIndex;
  let operateRecords = [];
  let operateColumns = [];
  for (let i = minRecordIndex; i <= maxRecordIndex; i++) {
    operateRecords.push(recordGetterByIndex({ isGroupView, groupRecordIndex: currentGroupRecordIndex, recordIndex: i }));
    if (isGroupView) {
      currentGroupRecordIndex++;
    }
  }
  for (let i = minColumnIndex; i <= maxColumnIndex; i++) {
    operateColumns.push(getColumnByIndex(i, columns));
  }
  return getCopiedText(operateRecords, operateColumns, getClientCellValueDisplayString);
}

function getCopiedText(records, columns, getClientCellValueDisplayString) {
  const lastRecordIndex = records.length - 1;
  const lastColumnIndex = columns.length - 1;
  let copiedText = '';
  records.forEach((record, recordIndex) => {
    columns.forEach((column, columnIndex) => {
      copiedText += (record && getClientCellValueDisplayString && getClientCellValueDisplayString(record, column)) || '';
      if (columnIndex < lastColumnIndex) {
        copiedText += '\t';
      }
    });
    if (recordIndex < lastRecordIndex) {
      copiedText += '\n';
    }
  });
  return copiedText;
}

export function execCopyWithNoEvents(text, serializeContent) {
  let reselectPrevious;
  let range;
  let selection;
  let mark;
  let success = false;
  try {
    reselectPrevious = toggleSelection();
    range = document.createRange();
    selection = document.getSelection();
    mark = document.createElement('span');
    mark.textContent = text;
    mark.addEventListener('copy', function (e) {
      e.stopPropagation();
      e.preventDefault();
      let transfer = e.dataTransfer || e.clipboardData;
      transfer.clearData();
      transfer.setData(TEXT, text);
      transfer.setData(FRAGMENT, serializeContent);
    });
    document.body.appendChild(mark);
    range.selectNodeContents(mark);
    selection.addRange(range);
    success = document.execCommand('copy');
    if (!success) {
      return false;
    }
  } catch {
    return false;
  } finally {
    if (mark) {
      document.body.removeChild(mark);
    }
    reselectPrevious();
  }
}

export default setEventTransfer;
