import { TRANSFER_TYPES } from '../constants/transfer-types';
import { getColumnByIndex } from './column';
import { getCopiedData } from './copied-data-cache';

const { FRAGMENT, HTML, TEXT } = TRANSFER_TYPES;
const { TEXT: TEXT_TYPE, FRAGMENT: FRAGMENT_TYPE } = TRANSFER_TYPES;

function getEventTransfer(event) {
  const transfer = event.dataTransfer || event.clipboardData;
  let dtableFragment = getType(transfer, FRAGMENT);
  let html = getType(transfer, HTML);
  let text = getType(transfer, TEXT);
  let files = getFiles(transfer);

  // paste sf-metadata
  if (dtableFragment) {
    const parsedFragment = JSON.parse(dtableFragment);
    // If there's a cache ID, retrieve the copied records and columns from cache
    if (parsedFragment._cacheId) {
      const cachedData = getCopiedData(parsedFragment._cacheId);
      if (cachedData) {
        parsedFragment.copiedRecords = cachedData.copiedRecords;
        parsedFragment.copiedColumns = cachedData.copiedColumns;
      }
    }
    return { [TRANSFER_TYPES.METADATA_FRAGMENT]: parsedFragment, type: TRANSFER_TYPES.METADATA_FRAGMENT };
  }

  // paste html
  if (html) {
    let copiedTableNode = (new DOMParser()).parseFromString(html, HTML).querySelector('table');
    if (copiedTableNode) {
      return { [TRANSFER_TYPES.METADATA_FRAGMENT]: html2TableFragment(copiedTableNode), html, text, type: 'html' };
    }
    return { [TRANSFER_TYPES.METADATA_FRAGMENT]: text2TableFragment(text), html, text, type: 'html' };
  }

  // paste local picture or other files here
  if (files && files.length) {
    return { [TRANSFER_TYPES.METADATA_FRAGMENT]: text2TableFragment(text), 'files': files, type: 'files' };
  }

  // paste text
  if (text) {
    return { [TRANSFER_TYPES.METADATA_FRAGMENT]: text2TableFragment(text), text, type: 'text' };
  }
}

function getType(transfer, type) {
  if (!transfer.types || !transfer.types.length) {
    // COMPAT: In IE 11, there is no `types` field but `getData('Text')`
    // is supported`. (2017/06/23)
    return type === TEXT ? transfer.getData('Text') || null : null;
  }

  return transfer.getData(type);
}

function text2TableFragment(data) {
  let formattedData = data ? data.replace(/\r/g, '') : '';
  let dataSplitted = formattedData.split('\n');
  let rowSplitted = dataSplitted[0].split('\t');
  let copiedColumns = rowSplitted.map((value, j) => ({ key: `col${j}`, type: 'text' }));
  let copiedRecords = [];
  dataSplitted.forEach((row) => {
    let obj = {};
    if (row) {
      row = row.split('\t');
      row.forEach((col, j) => {
        obj[`col${j}`] = col;
      });
    }
    copiedRecords.push(obj);
  });

  return { copiedRecords, copiedColumns };
}

function html2TableFragment(tableNode) {
  let trs = tableNode.querySelectorAll('tr');
  let tds = trs[0].querySelectorAll('td');
  let copiedColumns = [];
  let copiedRecords = [];
  tds.forEach((td, i) => {
    copiedColumns.push({ key: `col${i}`, type: 'text' });
  });
  trs.forEach((tr) => {
    let row = {};
    let cells = tr.querySelectorAll('td');
    cells.forEach((cell, i) => {
      row[`col${i}`] = cell.innerText;
    });
    copiedRecords.push(row);
  });
  return { copiedRecords, copiedColumns };
}

function getFiles(transfer) {
  let files;
  try {
    // Get and normalize files if they exist.
    if (transfer.items && transfer.items.length) {
      files = Array.from(transfer.items)
        .map(item => (item.kind === 'file' ? item.getAsFile() : null))
        .filter(exists => exists);
    } else if (transfer.files && transfer.files.length) {
      files = Array.from(transfer.files);
    }
  } catch (err) {
    if (transfer.files && transfer.files.length) {
      files = Array.from(transfer.files);
    }
  }
  return files;
}

function setEventTransfer({
  type, selectedRecordIds, copiedRange, copiedColumns, copiedRecords, copiedTableId, tableData, copiedText,
  recordGetterById, isGroupView, recordGetterByIndex, getClientCellValueDisplayString, event = {},
}) {
  const transfer = event.dataTransfer || event.clipboardData;
  if (type === TRANSFER_TYPES.METADATA_FRAGMENT) {
    const copiedText = Array.isArray(selectedRecordIds) && selectedRecordIds.length > 0 ?
      getCopiedTextFormSelectedRecordIds(selectedRecordIds, tableData, recordGetterById, getClientCellValueDisplayString) :
      getCopiedTextFromSelectedCells(copiedRange, tableData, isGroupView, recordGetterByIndex, getClientCellValueDisplayString);

    // Store copied records and columns in cache to avoid circular reference errors
    // Use a unique ID to retrieve them later during paste
    const { setCopiedData } = require('./copied-data-cache');
    const cacheId = setCopiedData({ copiedRecords, copiedColumns });

    const copiedGrid = {
      selectedRecordIds,
      copiedRange,
      copiedTableId,
      _cacheId: cacheId, // Reference to cached data for paste retrieval
    };
    const serializeCopiedGrid = JSON.stringify(copiedGrid);
    if (transfer) {
      transfer.setData(TEXT_TYPE, copiedText);
      transfer.setData(FRAGMENT_TYPE, serializeCopiedGrid);
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
      transfer.setData(TEXT_TYPE, text);
      transfer.setData(FRAGMENT_TYPE, serializeContent);
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

export function toggleSelection() {
  let selection = document.getSelection();
  if (!selection.rangeCount) {
    return function () {};
  }
  let active = document.activeElement;
  let ranges = [];
  for (let i = 0; i < selection.rangeCount; i++) {
    ranges.push(selection.getRangeAt(i));
  }

  switch (active.tagName.toUpperCase()) { // .toUpperCase handles XHTML
    case 'INPUT':
    case 'TEXTAREA':
      active.blur();
      break;
    default:
      active = null;
      break;
  }

  selection.removeAllRanges();
  return function () {
    selection.type === 'Caret' &&
    selection.removeAllRanges();
    if (!selection.rangeCount) {
      ranges.forEach(function (range) {
        selection.addRange(range);
      });
    }
    active &&
    active.focus();
  };
}

export { text2TableFragment };

export default getEventTransfer;
export { setEventTransfer };
