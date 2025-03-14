import { checkTreeNodeHasChildNodes, createTreeNode, generateNodeKey, getAllSubTreeNodes, getTreeNodeId, getTreeNodeKey } from '../../components/sf-table/utils/tree';
import { getRowById, getRowsByIds } from '../../components/sf-table/utils/table';
import { getRecordIdFromRecord } from '../../metadata/utils/cell';
import { getParentLinks, getChildLinks } from './cell';
import { PRIVATE_COLUMN_KEY } from '../constants';
import { compareTwoString } from '../../utils/compare-two-string';
import { ALL_TAGS_SORT_KEY, TAGS_DEFAULT_SORT } from '../constants/sort';

const KEY_ALL_CHILD_TAGS_IDS = 'all_child_tags_ids';

const findAllChildTagIds = (nodeIndex, tree) => {
  const targetNode = tree[nodeIndex];
  if (!checkTreeNodeHasChildNodes(targetNode)) {
    return [];
  }

  let allChildTagsIds = [];
  const allSubNodes = getAllSubTreeNodes(nodeIndex, tree);
  allSubNodes.forEach((subNode) => {
    const nodeId = getTreeNodeId(subNode);
    if (!allChildTagsIds.includes(nodeId)) {
      allChildTagsIds.push(nodeId);
    }
  });
  return allChildTagsIds;
};

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

export const setNodeAllChildTagsIds = (tree) => {
  tree.forEach((node, nodeIndex) => {
    node[KEY_ALL_CHILD_TAGS_IDS] = findAllChildTagIds(nodeIndex, tree);
  });
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

  // set node all file links
  setNodeAllChildTagsIds(tree);

  let key_tree_node_map = {};
  tree.forEach((node) => {
    key_tree_node_map[getTreeNodeKey(node)] = node;
  });

  return { tree, key_tree_node_map };
};

export const getAllChildTagsIdsFromNode = (node) => {
  return (node && node[KEY_ALL_CHILD_TAGS_IDS]) || [];
};

export const sortTree = (table, tree, sort = TAGS_DEFAULT_SORT) => {
  const getAllFileCount = (node) => {
    let count = 0;
    count += getRowById(table, getTreeNodeId(node))[PRIVATE_COLUMN_KEY.TAG_FILE_LINKS]?.length || 0;
    node.all_child_tags_ids.forEach((id) => {
      const row = getRowById(table, id);
      const links = row[PRIVATE_COLUMN_KEY.TAG_FILE_LINKS] || [];
      count += links.length;
    });
    return count;
  };

  const compare = (a, b) => {
    let valueA;
    let valueB;

    switch (sort.sortBy) {
      case ALL_TAGS_SORT_KEY.NAME:
        const rowA = getRowById(table, getTreeNodeId(a));
        const rowB = getRowById(table, getTreeNodeId(b));
        valueA = rowA[PRIVATE_COLUMN_KEY.TAG_NAME] || '';
        valueB = rowB[PRIVATE_COLUMN_KEY.TAG_NAME] || '';
        break;
      case ALL_TAGS_SORT_KEY.CHILD_TAGS_COUNT:
        valueA = (a.children || []).length;
        valueB = (b.children || []).length;
        break;
      case ALL_TAGS_SORT_KEY.TAG_FILE_COUNT:
        valueA = getAllFileCount(a);
        valueB = getAllFileCount(b);
        break;
      default:
        throw new Error(`Unsupported sortBy parameter: ${sort.sortBy}`);
    }

    const result =
    sort.sortBy === ALL_TAGS_SORT_KEY.NAME
      ? compareTwoString(valueA, valueB) // String comparison for name
      : valueA - valueB; // Numeric comparison for count

    return sort.order === 'asc' ? result : -result;
  };

  const sortNodesRecursively = (nodes, allNodes) => {
    const sortedNodes = [];

    nodes.forEach((node) => {
      sortedNodes.push(node);

      const children = allNodes.filter(
        (child) => child.node_key.startsWith(node.node_key) && child.node_depth === node.node_depth + 1
      );

      if (children.length > 0) {
        const sortedChildren = sortNodesRecursively(children, allNodes);
        sortedNodes.push(...sortedChildren);
      }
    });

    return sortedNodes;
  };

  tree.sort(compare);

  const topLevelNodes = tree.filter((node) => node.node_depth === 0);
  return sortNodesRecursively(topLevelNodes, tree);
};
