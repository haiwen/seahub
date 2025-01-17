import { createTreeNode, generateNodeKey } from '../../components/sf-table/utils/tree';
import { getRecordIdFromRecord } from '../../metadata/utils/cell';
import { getRowsByIds } from '../../metadata/utils/table';
import { getParentLinks, getChildLinks } from './cell';

const setChildNodes = (row, parentDepth, parentKey, idNodeInCurrentTreeMap, idNodeCreatedMap, tree, table) => {
  const nodeId = getRecordIdFromRecord(row);

  idNodeCreatedMap[nodeId] = true;
  idNodeInCurrentTreeMap[nodeId] = true; // for preventing circular dependencies

  const nodeKey = generateNodeKey(parentKey, nodeId); // the unique ID of each node
  const subLinks = getChildLinks(row);
  const subRowsIds = subLinks.map((link) => link.row_id);
  const subRows = getRowsByIds(table, subRowsIds);
  const validSubRows = subRows.filter((row) => row && !idNodeInCurrentTreeMap[row._id]);

  const node = createTreeNode(nodeId, nodeKey, parentDepth, validSubRows.length > 0);
  tree.push(node);

  if (validSubRows) {
    const nextNodeDepth = parentDepth + 1;
    validSubRows.forEach((subRow) => {
      setChildNodes(subRow, nextNodeDepth, nodeKey, { ...idNodeInCurrentTreeMap }, idNodeCreatedMap, tree, table);
    });
  }

  delete idNodeInCurrentTreeMap[nodeId];
};

/**
 * generate tree for display in table
 * @param {array} rows tags
 * @returns {array} tree
 * tree: [
 *  { _id, node_depth, node_key, has_child_nodes, ... }
 *  ...
 * ]
 */
export const buildTagsTree = (rows, table) => {
  const idNodeCreatedMap = {}; // mark each row has created tree node
  const tree = [];
  rows.forEach((row) => {
    const nodeId = getRecordIdFromRecord(row);
    const parentLinks = getParentLinks(row);
    if (parentLinks.length === 0 && !idNodeCreatedMap[nodeId]) {
      setChildNodes(row, 0, '', {}, idNodeCreatedMap, tree, table);
    }
  });

  // rows which may be from circular dependencies
  const noneCreatedRows = rows.filter((row) => !idNodeCreatedMap[getRecordIdFromRecord(row)]);
  noneCreatedRows.forEach((row) => {
    const nodeId = getRecordIdFromRecord(row);
    if (!idNodeCreatedMap[nodeId]) {
      setChildNodes(row, 0, '', {}, idNodeCreatedMap, tree, table);
    }
  });

  return tree;
};
