import { isTableRows } from '../../metadata/utils/row';
import { getColumnByKey } from '../../metadata/utils/column';
import { getGroupRows } from '../../metadata/utils/group';
import { getRowsByIds } from '../../components/sf-table/utils/table';
import { OPERATION_TYPE } from './operations';
import { buildTagsTree, setNodeAllChildTagsIds, sortTree } from '../utils/tree';
import { getRecordIdFromRecord } from '../../metadata/utils/cell';
import {
  addTreeChildNode, checkTreeNodeHasChildNodes, createTreeNode, generateNodeKey, getTreeNodeDepth, getTreeNodeId, getTreeNodeKey,
  resetTreeHasChildNodesStatus,
  updatedKeyTreeNodeMap,
} from '../../components/sf-table/utils/tree';

// const DEFAULT_COMPUTER_PROPERTIES_CONTROLLER = {
//   isUpdateSummaries: true,
//   isUpdateColumnColors: true,
// };

// generate formula_rows
// get rendered rows depend on filters/sorts etc.
class DataProcessor {

  static buildTagsTree(rows, table) {
    const { tree, key_tree_node_map } = buildTagsTree(rows, table);
    table.rows_tree = tree;
    table.key_tree_node_map = key_tree_node_map;
  }

  static updateTagsTreeWithNewTags(tags, table) {
    if (!Array.isArray(tags) || tags.length === 0) return;
    const { rows_tree } = table;
    let updated_rows_tree = [...rows_tree];
    tags.forEach((tag) => {
      const tagId = getRecordIdFromRecord(tag);
      const nodeKey = generateNodeKey('', tagId);
      const node = createTreeNode(tagId, nodeKey, 0, false);
      updated_rows_tree.push(node);
      updatedKeyTreeNodeMap(nodeKey, node, table.key_tree_node_map);
    });
    const sortedTree = sortTree(table, updated_rows_tree, table.sort);
    table.rows_tree = sortedTree;
  }

  static updateTagsTreeWithDeletedTagsIds(deletedTagsIds, table) {
    if (!Array.isArray(deletedTagsIds) || deletedTagsIds.length === 0) return;
    const { rows_tree } = table;
    const idTagDeletedMap = deletedTagsIds.reduce((currIdTagDeletedMap, tagId) => ({ ...currIdTagDeletedMap, [tagId]: true }), {});
    const hasDeletedParentNode = rows_tree.some((node) => idTagDeletedMap[getTreeNodeId(node)] && checkTreeNodeHasChildNodes(node));
    if (hasDeletedParentNode) {
      // need re-build tree if some parent nodes deleted
      this.buildTagsTree(table.rows, table);
      return;
    }

    // remove the nodes which has no child nodes directly
    let updated_rows_tree = [];
    rows_tree.forEach((node) => {
      if (!idTagDeletedMap[getTreeNodeId(node)]) {
        updated_rows_tree.push(node);
      }
    });

    // update has_child_nodes status(all child nodes may be deleted)
    resetTreeHasChildNodesStatus(updated_rows_tree);

    // update tag all files links
    setNodeAllChildTagsIds(updated_rows_tree);

    table.key_tree_node_map = {};
    updated_rows_tree.forEach((node) => {
      updatedKeyTreeNodeMap(getTreeNodeKey(node), node, table.key_tree_node_map);
    });
    table.rows_tree = updated_rows_tree;
  }

  static getGroupedRows(table, rows, groupbys, { collaborators }) {
    const tableRows = isTableRows(rows) ? rows : getRowsByIds(table, rows);
    const groups = getGroupRows(table, tableRows, groupbys, { collaborators });
    return groups;
  }

  static updateSummaries(table, rows) {
    // const tableRows = isTableRows(rows) ? rows : getRowsByIds(table, rows);
    // todo
  }

  static hasRelatedGroupby(groupbys, updatedColumnKeyMap) {
    return groupbys.some(groupby => updatedColumnKeyMap[groupby.column_key]);
  }

  static deleteGroupRows(groups, idDeletedRecordMap) {
    groups.forEach(group => {
      const { subgroups, row_ids } = group;
      if (Array.isArray(subgroups) && subgroups.length > 0) {
        this.deleteGroupRows(subgroups, idDeletedRecordMap);
      } else if (row_ids) {
        group.row_ids = row_ids.filter(rowId => !idDeletedRecordMap[rowId]);
      }
    });
  }

  static deleteEmptyGroups = (groups) => {
    return groups.filter(group => {
      const { subgroups, row_ids } = group;
      if (subgroups && subgroups.length > 0) {
        const validSubGroups = this.deleteEmptyGroups(subgroups);
        if (validSubGroups.length === 0) {
          return false;
        }
        return true;
      }
      if (!row_ids || row_ids.length === 0) {
        return false;
      }
      return true;
    });
  };

  static run(table, { collaborators }) {
    this.buildTagsTree(table.rows, table);
  }

  static updateDataWithModifyRecords(table, relatedColumnKeyMap, rowIds, { collaborators }) {
    // todo
  }

  static updatePageDataWithDeleteRecords(deletedTagsIds, table) {
    this.updateTagsTreeWithDeletedTagsIds(deletedTagsIds, table);
  }

  static handleReloadedRecords(table, reloadedRecords, relatedColumnKeyMap) {
    const idReloadedRecordMap = reloadedRecords.reduce((map, record) => {
      map[record._id] = record;
      return map;
    }, {});
    table.rows.forEach((row, index) => {
      const rowId = row._id;
      const reloadedRecord = idReloadedRecordMap[rowId];
      const newRecord = Object.assign({}, table.rows[index], reloadedRecord);
      if (reloadedRecord) {
        table.rows[index] = newRecord;
        table.id_row_map[rowId] = newRecord;
      }
    });

    this.buildTagsTree(table.rows, table);
    this.updateDataWithModifyRecords();
    this.updateSummaries();
  }

  static handleNotExistRecords(table, idRecordNotExistMap) {
    let notExistRecords = [];
    let existRecords = [];
    table.rows.forEach((record) => {
      const recordId = record._id;
      if (idRecordNotExistMap[recordId]) {
        notExistRecords.push(record);
        delete table.id_row_map[recordId];
      } else {
        existRecords.push(record);
      }
    });
    table.rows = table.rows.filter((record) => !idRecordNotExistMap[record._id]);

    this.buildTagsTree(table.rows, table);
    this.updateSummaries();
  }

  static syncOperationOnData(table, operation, { collaborators }) {
    switch (operation.op_type) {
      case OPERATION_TYPE.MODIFY_RECORDS: {
        const { id_original_row_updates, row_ids } = operation;
        let relatedColumnKeyMap = {};
        let relatedColumnKeys = [];
        row_ids.forEach(rowId => {
          const id_original_row_update = id_original_row_updates[rowId];
          if (id_original_row_update) {
            relatedColumnKeys.push(...Object.keys(id_original_row_update));
          }
        });
        relatedColumnKeys.forEach(columnKey => {
          if (!relatedColumnKeyMap[columnKey]) {
            const column = getColumnByKey(table.columns, columnKey);
            if (column) {
              relatedColumnKeyMap[columnKey] = true;
            }
          }
        });
        this.updateDataWithModifyRecords(table, relatedColumnKeyMap, row_ids, { collaborators });
        this.updateSummaries();
        break;
      }
      case OPERATION_TYPE.MODIFY_RECORD_VIA_BUTTON: {
        const { original_updates } = operation;
        const relatedColumnKeyMap = {};
        for (let columnKey in original_updates) {
          const column = getColumnByKey(table.columns, columnKey);
          if (column) {
            relatedColumnKeyMap[columnKey] = true;
          }
        }
        this.updateDataWithModifyRecords();
        this.updateSummaries();
        break;
      }
      case OPERATION_TYPE.DELETE_RECORDS: {
        const { tag_ids } = operation;
        this.updatePageDataWithDeleteRecords(tag_ids, table);
        this.updateSummaries();
        break;
      }
      case OPERATION_TYPE.RESTORE_RECORDS: {
        // todo
        break;
      }
      case OPERATION_TYPE.ADD_RECORDS: {
        const { tags } = operation;
        this.updateTagsTreeWithNewTags(tags, table);
        break;
      }
      case OPERATION_TYPE.ADD_CHILD_TAG: {
        const { tag, parent_tag_id } = operation;
        const tagId = getRecordIdFromRecord(tag);
        if (!tagId || !parent_tag_id) return;
        const { rows_tree } = table;
        rows_tree.forEach((node) => {
          const nodeId = getTreeNodeId(node);
          if (nodeId === parent_tag_id) {
            const parentNodeKey = getTreeNodeKey(node);
            const parentNodeDepth = getTreeNodeDepth(node);
            const subNodeKey = generateNodeKey(parentNodeKey, tagId);
            const childNode = createTreeNode(tagId, subNodeKey, parentNodeDepth + 1, false);
            addTreeChildNode(childNode, node, rows_tree);
            updatedKeyTreeNodeMap(subNodeKey, childNode, table.key_tree_node_map);
          }
        });
        break;
      }
      case OPERATION_TYPE.ADD_TAG_LINKS:
      case OPERATION_TYPE.DELETE_TAG_LINKS:
      case OPERATION_TYPE.DELETE_TAGS_LINKS:
      case OPERATION_TYPE.MERGE_TAGS: {
        this.buildTagsTree(table.rows, table);
        break;
      }
      case OPERATION_TYPE.MODIFY_TAGS_SORT: {
        const { sort } = operation;
        const oldTree = table.rows_tree;
        const sortedTree = sortTree(table, oldTree, sort);
        table.rows_tree = sortedTree;
        break;
      }
      default: {
        break;
      }
    }
  }
}

export default DataProcessor;
