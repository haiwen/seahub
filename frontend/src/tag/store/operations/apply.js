import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UTC_FORMAT_DEFAULT } from '../../../metadata/constants';
import { OPERATION_TYPE } from './constants';
import { PRIVATE_COLUMN_KEY } from '../../constants';
import { username } from '../../../utils/constants';
import { addRowLinks, removeRowLinks } from '../../utils/link';

dayjs.extend(utc);

export default function apply(data, operation) {
  const { op_type } = operation;

  switch (op_type) {
    case OPERATION_TYPE.ADD_RECORDS: {
      const { tags } = operation;
      const { rows } = data;
      const updatedRows = [...rows, ...tags];
      tags.forEach(tag => {
        const id = tag[PRIVATE_COLUMN_KEY.ID];
        data.id_row_map[id] = tag;
        data.row_ids.push(id);
      });
      data.rows = updatedRows;
      return data;
    }
    case OPERATION_TYPE.MODIFY_RECORDS:
    case OPERATION_TYPE.MODIFY_LOCAL_RECORDS: {
      const { id_original_row_updates, id_row_updates } = operation;
      const { rows } = data;
      const modifyTime = dayjs().utc().format(UTC_FORMAT_DEFAULT);
      const modifier = username;
      let updatedRows = [...rows];

      rows.forEach((row, index) => {
        const { _id: rowId } = row;
        const originalRowUpdates = id_original_row_updates[rowId];
        const rowUpdates = id_row_updates[rowId];
        if (rowUpdates || originalRowUpdates) {
          const updatedRow = Object.assign({}, row, rowUpdates, originalRowUpdates, {
            '_mtime': modifyTime,
            '_last_modifier': modifier,
          });
          updatedRows[index] = updatedRow;
          data.id_row_map[rowId] = updatedRow;
        }
      });

      data.rows = updatedRows;
      return data;
    }
    case OPERATION_TYPE.DELETE_RECORDS: {
      const { tag_ids } = operation;
      const idNeedDeletedMap = tag_ids.reduce((currIdNeedDeletedMap, rowId) => ({ ...currIdNeedDeletedMap, [rowId]: true }), {});
      data.rows = data.rows.filter((row) => !idNeedDeletedMap[row._id]);

      // delete rows in id_row_map
      tag_ids.forEach(rowId => {
        delete data.id_row_map[rowId];
      });

      return data;
    }
    case OPERATION_TYPE.RESTORE_RECORDS: {
      const { original_rows } = operation;
      const currentTime = dayjs().utc().format(UTC_FORMAT_DEFAULT);
      let insertRows = [];
      original_rows.forEach(row => {
        const insertRow = {
          ...row,
          _ctime: currentTime,
          _mtime: currentTime,
          _creator: username,
          _last_modifier: username,
        };
        insertRows.push(insertRow);
        data.id_row_map[row._id] = insertRow;
      });
      data.rows.push(insertRows);
      return data;
    }
    case OPERATION_TYPE.ADD_TAG_LINKS: {
      const { column_key, row_id, other_rows_ids } = operation;
      if (column_key === PRIVATE_COLUMN_KEY.PARENT_LINKS) {
        data.rows = data.rows.map((row) => {
          const currentRowId = row._id;
          if (currentRowId === row_id) {
            // add parent tags to current tag
            row = addRowLinks(row, PRIVATE_COLUMN_KEY.PARENT_LINKS, other_rows_ids);
          }
          if (other_rows_ids.includes(currentRowId)) {
            // add current tag as sub tag to related tags
            row = addRowLinks(row, PRIVATE_COLUMN_KEY.SUB_LINKS, [row_id]);
          }
          return row;
        });
      } else if (column_key === PRIVATE_COLUMN_KEY.SUB_LINKS) {
        data.rows = data.rows.map((row) => {
          const currentRowId = row._id;
          if (currentRowId === row_id) {
            // add sub tags to current tag
            row = addRowLinks(row, PRIVATE_COLUMN_KEY.SUB_LINKS, other_rows_ids);
          }
          if (other_rows_ids.includes(currentRowId)) {
            // add current tag as parent tag to related tags
            row = addRowLinks(row, PRIVATE_COLUMN_KEY.PARENT_LINKS, [row_id]);
          }
          return row;
        });
      }
      return data;
    }
    case OPERATION_TYPE.DELETE_TAG_LINKS: {
      const { column_key, row_id, other_rows_ids } = operation;
      if (column_key === PRIVATE_COLUMN_KEY.PARENT_LINKS) {
        data.rows = data.rows.map((row) => {
          const currentRowId = row._id;
          if (currentRowId === row_id) {
            // remove parent tags from current tag
            row = removeRowLinks(row, PRIVATE_COLUMN_KEY.PARENT_LINKS, other_rows_ids);
          }
          if (other_rows_ids.includes(currentRowId)) {
            // remove current tag as sub tag from related tags
            row = removeRowLinks(row, PRIVATE_COLUMN_KEY.SUB_LINKS, [row_id]);
          }
          return row;
        });
      } else if (column_key === PRIVATE_COLUMN_KEY.SUB_LINKS) {
        data.rows = data.rows.map((row) => {
          const currentRowId = row._id;
          if (currentRowId === row_id) {
            // remove sub tags from current tag
            row = removeRowLinks(row, PRIVATE_COLUMN_KEY.SUB_LINKS, other_rows_ids);
          }
          if (other_rows_ids.includes(currentRowId)) {
            // remove current tag as parent tag from related tags
            row = removeRowLinks(row, PRIVATE_COLUMN_KEY.PARENT_LINKS, [row_id]);
          }
          return row;
        });
      }
      return data;
    }
    default: {
      return data;
    }
  }
}
