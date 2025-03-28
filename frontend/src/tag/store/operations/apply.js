import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UTC_FORMAT_DEFAULT } from '../../../metadata/constants';
import { OPERATION_TYPE } from './constants';
import { PRIVATE_COLUMN_KEY } from '../../constants';
import { username } from '../../../utils/constants';
import { addRowLinks, removeRowLinks } from '../../utils/link';
import { getRecordIdFromRecord } from '../../../metadata/utils/cell';
import { getRowById, getRowsByIds } from '../../../components/sf-table/utils/table';
import { getChildLinks, getParentLinks, getTagFilesLinks } from '../../utils/cell';

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
          }
          if (other_rows_ids.includes(currentRowId)) {
            // add current tag as child tag to related tags
            updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, [row_id]);
          }
          data.rows[index] = updatedRow;
          data.id_row_map[currentRowId] = updatedRow;
        });
      } else if (column_key === PRIVATE_COLUMN_KEY.SUB_LINKS) {
        data.rows.forEach((row, index) => {
          const currentRowId = row._id;
          let updatedRow = { ...row };
          if (currentRowId === row_id) {
            // add child tags to current tag
            updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, other_rows_ids);

          }
          if (other_rows_ids.includes(currentRowId)) {
            // add current tag as parent tag to related tags
            updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.PARENT_LINKS, [row_id]);
          }
          data.rows[index] = updatedRow;
          data.id_row_map[currentRowId] = updatedRow;
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
          }
          if (other_rows_ids.includes(currentRowId)) {
            // remove current tag as child tag from related tags
            updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, [row_id]);
          }
          data.rows[index] = updatedRow;
          data.id_row_map[currentRowId] = updatedRow;
        });
      } else if (column_key === PRIVATE_COLUMN_KEY.SUB_LINKS) {
        data.rows.forEach((row, index) => {
          const currentRowId = row._id;
          let updatedRow = { ...row };
          if (currentRowId === row_id) {
            // remove child tags from current tag
            updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, other_rows_ids);
          }
          if (other_rows_ids.includes(currentRowId)) {
            // remove current tag as parent tag from related tags
            updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.PARENT_LINKS, [row_id]);
          }
          data.rows[index] = updatedRow;
          data.id_row_map[currentRowId] = updatedRow;
        });
      }
      return data;
    }
    case OPERATION_TYPE.DELETE_TAGS_LINKS: {
      const { column_key, id_linked_rows_ids_map } = operation;
      const operatedIds = id_linked_rows_ids_map && Object.keys(id_linked_rows_ids_map);
      if (!operatedIds || operatedIds.length === 0) {
        return data;
      }
      data.rows = [...data.rows];
      if (column_key === PRIVATE_COLUMN_KEY.PARENT_LINKS) {
        data.rows.forEach((row, index) => {
          const currentRowId = row._id;
          const other_rows_ids = id_linked_rows_ids_map[currentRowId];
          let updatedRow = { ...row };
          if (other_rows_ids) {
            // remove parent tags from current tag
            updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.PARENT_LINKS, other_rows_ids);
          }

          // remove current tag as child tag from related tags
          operatedIds.forEach((operatedId) => {
            const other_rows_ids = id_linked_rows_ids_map[operatedId];
            if (other_rows_ids && other_rows_ids.includes(currentRowId)) {
              updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, [operatedId]);
            }
          });
          data.rows[index] = updatedRow;
          data.id_row_map[currentRowId] = updatedRow;
        });
      } else if (column_key === PRIVATE_COLUMN_KEY.SUB_LINKS) {
        data.rows.forEach((row, index) => {
          const currentRowId = row._id;
          const other_rows_ids = id_linked_rows_ids_map[currentRowId];
          let updatedRow = { ...row };
          if (other_rows_ids) {
            // remove child tags from current tag
            updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, other_rows_ids);
          }

          // remove current tag as parent tag from related tags
          operatedIds.forEach((operatedId) => {
            const other_rows_ids = id_linked_rows_ids_map[operatedId];
            if (other_rows_ids && other_rows_ids.includes(currentRowId)) {
              updatedRow = removeRowLinks(updatedRow, PRIVATE_COLUMN_KEY.PARENT_LINKS, [operatedId]);
            }
          });
          data.rows[index] = updatedRow;
          data.id_row_map[currentRowId] = updatedRow;
        });
      }
      return data;
    }
    case OPERATION_TYPE.MERGE_TAGS: {
      const { target_tag_id, merged_tags_ids } = operation;
      const targetTag = getRowById(data, target_tag_id);
      const mergedTags = getRowsByIds(data, merged_tags_ids);
      if (!targetTag || mergedTags.length === 0) {
        return data;
      }
      const opTagsIds = [target_tag_id, ...merged_tags_ids];
      const parentLinks = getParentLinks(targetTag);
      const childLinks = getChildLinks(targetTag);
      const fileLinks = getTagFilesLinks(targetTag);
      const idParentLinkExistMap = parentLinks.reduce((currIdParentLinkExist, link) => ({ ...currIdParentLinkExist, [link.row_id]: true }), {});
      const idChildLinkExistMap = childLinks.reduce((currIdChildLinkExist, link) => ({ ...currIdChildLinkExist, [link.row_id]: true }), {});
      const idFileLinkExistMap = fileLinks.reduce((currIdFileLinkExistMap, link) => ({ ...currIdFileLinkExistMap, [link.row_id]: true }), {});

      // 1. get unique parent/child/file links from merged tags which not exist in target tag
      let newParentTagsIds = [];
      let newChildTagsIds = [];
      let newFilesIds = [];
      mergedTags.forEach((mergedTag) => {
        const currParentLinks = getParentLinks(mergedTag);
        const currChildLinks = getChildLinks(mergedTag);
        const currFileLinks = getTagFilesLinks(mergedTag);
        currParentLinks.forEach((parentLink) => {
          const parentLinkedTagId = parentLink.row_id;
          if (!opTagsIds.includes(parentLinkedTagId) && !idParentLinkExistMap[parentLinkedTagId]) {
            newParentTagsIds.push(parentLinkedTagId);
            idParentLinkExistMap[parentLinkedTagId] = true;
          }
        });
        currChildLinks.forEach((childLink) => {
          const childLinkedTagId = childLink.row_id;
          if (!opTagsIds.includes(childLinkedTagId) && !idChildLinkExistMap[childLinkedTagId]) {
            newChildTagsIds.push(childLinkedTagId);
            idChildLinkExistMap[childLinkedTagId] = true;
          }
        });
        currFileLinks.forEach((fileLink) => {
          const linkedFileId = fileLink.row_id;
          if (!idFileLinkExistMap[linkedFileId]) {
            newFilesIds.push(linkedFileId);
            idFileLinkExistMap[linkedFileId] = true;
          }
        });
      });

      // 2. delete merged tags
      const idTagMergedMap = mergedTags.reduce((currIdTagMergedMap, tag) => ({ ...currIdTagMergedMap, [tag._id]: true }), {});
      let updatedRows = [];
      data.rows.forEach((tag) => {
        const currentTagId = tag._id;
        if (idTagMergedMap[currentTagId]) {
          delete data.id_row_map[currentTagId];
        } else {
          updatedRows.push(tag);
        }
      });

      // 3. merge parent links into target tag
      // 4. merge child links into target tag
      // 5. merge file links into target tag
      const hasNewParentLinks = newParentTagsIds.length > 0;
      const hasNewChildLinks = newChildTagsIds.length > 0;
      const hasNewFileLinks = newFilesIds.length > 0;
      if (hasNewParentLinks || hasNewChildLinks || hasNewFileLinks) {
        updatedRows.forEach((row, index) => {
          const currentRowId = row._id;
          let updatedRow = { ...row };
          if (currentRowId === target_tag_id) {
            if (hasNewParentLinks) {
              // add parent links
              updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.PARENT_LINKS, newParentTagsIds);
            }
            if (hasNewChildLinks) {
              // add child links
              updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, newChildTagsIds);
            }
            if (hasNewFileLinks) {
              // add file links
              updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.TAG_FILE_LINKS, newFilesIds);
            }
          }

          if (newParentTagsIds.includes(currentRowId)) {
            // add target tag as child tag to related tags
            updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.SUB_LINKS, [target_tag_id]);
          }
          if (newChildTagsIds.includes(currentRowId)) {
            // add target tag as parent tag to related tags
            updatedRow = addRowLinks(updatedRow, PRIVATE_COLUMN_KEY.PARENT_LINKS, [target_tag_id]);
          }
          updatedRows[index] = updatedRow;
          data.id_row_map[currentRowId] = updatedRow;
        });
      }

      data.rows = updatedRows;
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
    case OPERATION_TYPE.MODIFY_LOCAL_FILE_TAGS: {
      const { file_id, tags_ids } = operation;
      const { rows } = data;
      const updatedRows = [...rows];

      if (file_id) {
        // remove file link from related tags
        updatedRows.forEach((tag, index) => {
          const tagFilesLinks = getTagFilesLinks(tag);
          if (Array.isArray(tagFilesLinks) && tagFilesLinks.length > 0 && tagFilesLinks.findIndex((link) => link.row_id === file_id) > -1) {
            let updatedTag = { ...tag };
            updatedTag = removeRowLinks(updatedTag, PRIVATE_COLUMN_KEY.TAG_FILE_LINKS, [file_id]);
            updatedRows[index] = updatedTag;
            data.id_row_map[tag._id] = updatedTag;
          }
        });
      }

      if (Array.isArray(tags_ids) && tags_ids.length > 0) {
        // add new file link to related tags
        const idUpdatedTagMap = tags_ids.reduce((currIdUpdatedTagMap, tagId) => ({ ...currIdUpdatedTagMap, [tagId]: true }), {});
        updatedRows.forEach((tag, index) => {
          if (idUpdatedTagMap[tag._id]) {
            let updatedTag = { ...tag };
            updatedTag = addRowLinks(updatedTag, PRIVATE_COLUMN_KEY.TAG_FILE_LINKS, [file_id]);
            updatedRows[index] = updatedTag;
            data.id_row_map[tag._id] = updatedTag;
          }
        });
      }

      data.rows = updatedRows;
      return data;
    }
    case OPERATION_TYPE.MODIFY_TAGS_SORT: {
      const { sort } = operation;
      data.sort = sort;
      return data;
    }
    default: {
      return data;
    }
  }
}
