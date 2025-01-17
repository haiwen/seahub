import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UTC_FORMAT_DEFAULT } from '../../../metadata/constants';
import { OPERATION_TYPE } from './constants';
import { PRIVATE_COLUMN_KEY } from '../../constants';
import { username } from '../../../utils/constants';
import { addRowLinks, removeRowLinks } from '../../utils/link';
import { getRecordIdFromRecord } from '../../../metadata/utils/cell';

dayjs.extend(utc);

export default function apply(data, operation) {
  const { op_type } = operation;

  switch (op_type) {
    case OPERATION_TYPE.ADD_RECORDS: {
      const { tags } = operation;
      const { rows } = data;
      const updatedRows = [...rows];
      tags.forEach(tag => {
        const tagID = tag[PRIVATE_COLUMN_KEY.ID];
        const rowIndex = updatedRows.findIndex(r => r._id === tagID);
        data.id_row_map[tagID] = tag;
        if (rowIndex === -1) {
          data.row_ids.push(tagID);
          updatedRows.push(tag);
        } else {
          updatedRows[rowIndex] = tag;
        }
      });
      data.rows = updatedRows;
      return data;
    }
    case OPERATION_TYPE.ADD_CHILD_TAG: {
      const { tag, parent_tag_id } = operation;
      const tagId = getRecordIdFromRecord(tag);
      if (!tagId || !parent_tag_id) {
        return data;
      }

      const { rows } = data;
      const updatedRows = [...rows];

      // add parent link
      const updatedTag = addRowLinks(tag, PRIVATE_COLUMN_KEY.PARENT_LINKS, [parent_tag_id]);

      // add child link
      const parentTagIndex = rows.findIndex((tag) => getRecordIdFromRecord(tag) === parent_tag_id);
      if (parentTagIndex > -1) {
        const parentTag = updatedRows[parentTagIndex];
        const updatedParentTag = addRowLinks(parentTag, PRIVATE_COLUMN_KEY.SUB_LINKS, [tagId]);
        updatedRows[parentTagIndex] = updatedParentTag;
        data.id_row_map[parent_tag_id] = updatedParentTag;
      }

      updatedRows.push(updatedTag);
      data.row_ids.push(tagId);
      data.id_row_map[tagId] = updatedTag;
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
      data.row_ids = data.row_ids.filter((rowId) => !idNeedDeletedMap[rowId]);

      // delete rows in id_row_map
      tag_ids.forEach(rowId => {
        delete data.id_row_map[rowId];
      });

      // remove parent/sub links
      data.rows.forEach((row, index) => {
        // update parent links
        const parentLinks = row[PRIVATE_COLUMN_KEY.PARENT_LINKS];
        const hasRelatedParentLinks = Array.isArray(parentLinks) && parentLinks.some((link) => idNeedDeletedMap[link.row_id]);
        if (hasRelatedParentLinks) {
          const updatedParentLinks = parentLinks.filter((link) => !idNeedDeletedMap[link.row_id]);
          const updatedRow = {
            ...row,
            [PRIVATE_COLUMN_KEY.PARENT_LINKS]: updatedParentLinks,
          };
          data.rows[index] = updatedRow;
          data.id_row_map[row._id] = updatedRow;
        }

        // update sub links
        const subLinks = row[PRIVATE_COLUMN_KEY.SUB_LINKS];
        const hasRelatedSubLinks = Array.isArray(subLinks) && subLinks.some((link) => idNeedDeletedMap[link.row_id]);
        if (hasRelatedSubLinks) {
          const updatedSubLinks = subLinks.filter((link) => !idNeedDeletedMap[link.row_id]);
          const updatedRow = {
            ...row,
            [PRIVATE_COLUMN_KEY.SUB_LINKS]: updatedSubLinks,
          };
          data.rows[index] = updatedRow;
          data.id_row_map[row._id] = updatedRow;
        }
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
      data.rows = [...data.rows];
      if (column_key === PRIVATE_COLUMN_KEY.PARENT_LINKS) {
        data.rows.forEach((row, index) => {
          const currentRowId = row._id;
          let updatedRow = { ...row };
          if (currentRowId === row_id) {
            // add parent tags to current tag
            updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.PARENT_LINKS, other_rows_ids);
            data.rows[index] = updatedRow;
            data.id_row_map[currentRowId] = updatedRow;
          }
          if (other_rows_ids.includes(currentRowId)) {
            // add current tag as child tag to related tags
            updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, [row_id]);
            data.rows[index] = updatedRow;
            data.id_row_map[currentRowId] = updatedRow;
          }
        });
      } else if (column_key === PRIVATE_COLUMN_KEY.SUB_LINKS) {
        data.rows.forEach((row, index) => {
          const currentRowId = row._id;
          let updatedRow = { ...row };
          if (currentRowId === row_id) {
            // add child tags to current tag
            updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, other_rows_ids);
            data.rows[index] = updatedRow;
            data.id_row_map[currentRowId] = updatedRow;
          }
          if (other_rows_ids.includes(currentRowId)) {
            // add current tag as parent tag to related tags
            updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.PARENT_LINKS, [row_id]);
            data.rows[index] = updatedRow;
            data.id_row_map[currentRowId] = updatedRow;
          }
        });
      }
      return data;
    }
    case OPERATION_TYPE.DELETE_TAG_LINKS: {
      const { column_key, row_id, other_rows_ids } = operation;
      data.rows = [...data.rows];
      if (column_key === PRIVATE_COLUMN_KEY.PARENT_LINKS) {
        data.rows.forEach((row, index) => {
          const currentRowId = row._id;
          let updatedRow = { ...row };
          if (currentRowId === row_id) {
            // remove parent tags from current tag
            updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.PARENT_LINKS, other_rows_ids);
            data.rows[index] = updatedRow;
            data.id_row_map[currentRowId] = updatedRow;
          }
          if (other_rows_ids.includes(currentRowId)) {
            // remove current tag as child tag from related tags
            updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, [row_id]);
            data.rows[index] = updatedRow;
            data.id_row_map[currentRowId] = updatedRow;
          }
        });
      } else if (column_key === PRIVATE_COLUMN_KEY.SUB_LINKS) {
        data.rows.forEach((row, index) => {
          const currentRowId = row._id;
          let updatedRow = { ...row };
          if (currentRowId === row_id) {
            // remove child tags from current tag
            updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, other_rows_ids);
            data.rows[index] = updatedRow;
            data.id_row_map[currentRowId] = updatedRow;
          }
          if (other_rows_ids.includes(currentRowId)) {
            // remove current tag as parent tag from related tags
            updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.PARENT_LINKS, [row_id]);
            data.rows[index] = updatedRow;
            data.id_row_map[currentRowId] = updatedRow;
          }
        });
      }
      return data;
    }
    case OPERATION_TYPE.MODIFY_COLUMN_WIDTH: {
      const { column_key, new_width } = operation;
      const columnIndex = data.columns.findIndex(column => column.key === column_key);
      if (columnIndex < 0) {
        return data;
      }
      let updatedColumns = [...data.columns];
      updatedColumns[columnIndex].width = new_width;
      data.columns = updatedColumns;
      return data;
    }
    default: {
      return data;
    }
  }
}
