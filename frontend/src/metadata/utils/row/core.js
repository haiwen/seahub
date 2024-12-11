import { siteRoot } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { PRIVATE_COLUMN_KEY } from '../../constants';
import { getFileNameFromRecord, getParentDirFromRecord } from '../cell';
import { getTableById } from '../table';

/**
 * Check is table rows
 * @param {array} rows e.g. table rows: [{ _id, xxx }, ...] | view rows: [ row._id, ... ]
 * @returns bool
 */
const isTableRows = (rows) => (
  Array.isArray(rows) && typeof rows[0] === 'object'
);

const updateTableRowsWithRowsData = (tables, tableId, recordsData = []) => {
  let table = getTableById(tables, tableId);
  let idRowDataMap = {};
  recordsData.forEach((recordData) => idRowDataMap[recordData._id] = recordData);
  table.rows.forEach((row, index) => {
    const rowId = row._id;
    const newRowData = idRowDataMap[rowId];
    if (!newRowData) {
      return;
    }
    const newRow = Object.assign({}, row, newRowData);
    table.rows[index] = newRow;
    table.id_row_map[rowId] = newRow;
  });
};

const checkIsDir = (record) => {
  if (!record) return false;
  const isDir = record[PRIVATE_COLUMN_KEY.IS_DIR];
  if (typeof isDir === 'string') {
    return isDir.toUpperCase() === 'TRUE';
  }
  return isDir;
};

const openInNewTab = (record) => {
  const repoID = window.sfMetadataStore.repoId;
  const isDir = checkIsDir(record);
  const parentDir = getParentDirFromRecord(record);
  const name = getFileNameFromRecord(record);
  const url = isDir
    ? window.location.origin + window.location.pathname + Utils.encodePath(Utils.joinPath(parentDir, name))
    : `${siteRoot}lib/${repoID}/file${Utils.encodePath(Utils.joinPath(parentDir, name))}`;

  window.open(url, '_blank');
};

const openParentFolder = (record) => {
  let parentDir = getParentDirFromRecord(record);

  if (window.location.pathname.endsWith('/')) {
    parentDir = parentDir.slice(1);
  }

  const url = window.location.origin + window.location.pathname + Utils.encodePath(parentDir);
  window.open(url, '_blank');
};

export {
  isTableRows,
  updateTableRowsWithRowsData,
  checkIsDir,
  openInNewTab,
  openParentFolder,
};
