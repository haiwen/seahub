import { TREE_NODE_KEY } from '../constants/tree';

export const createTreeNode = (nodeId, nodeKey, depth, hasSubNodes) => {
  return {
    [TREE_NODE_KEY.ID]: nodeId,
    [TREE_NODE_KEY.KEY]: nodeKey,
    [TREE_NODE_KEY.DEPTH]: depth,
    [TREE_NODE_KEY.HAS_SUB_NODES]: hasSubNodes,
  };
};

/**
 * for get row by node key from 'tree_node_key_row_id_map' directly
 * @param {array} tree
 * @returns tree_node_key_row_id_map
 * tree_node_key_row_id_map: { [node_key]: _id, ... }
 */
export const generateKeyTreeNodeRowIdMap = (tree) => {
  let tree_node_key_row_id_map = {};
  tree.forEach((node) => {
    tree_node_key_row_id_map[node[TREE_NODE_KEY.KEY]] = node[TREE_NODE_KEY.ID];
  });
  return tree_node_key_row_id_map;
};


export const getValidKeyTreeNodeFoldedMap = (keyTreeNodeFoldedMap, treeNodeKeyRecordIdMap) => {
  if (!keyTreeNodeFoldedMap) return {};

  let validKeyTreeNodeFoldedMap = {};
  Object.keys(keyTreeNodeFoldedMap).forEach((nodeKey) => {
    if (treeNodeKeyRecordIdMap[nodeKey]) {
      // just keep the folded status of exist nodes
      validKeyTreeNodeFoldedMap[nodeKey] = keyTreeNodeFoldedMap[nodeKey];
    }
  });
  return validKeyTreeNodeFoldedMap;
};

export const getRecordIdByTreeNodeKey = (nodeKey, treeNodeKeyRecordIdMap) => {
  return treeNodeKeyRecordIdMap[nodeKey];
};

export const getRecordsIdsByTreeNodeKeys = (nodesKeys, treeNodeKeyRecordIdMap) => {
  if (!Array.isArray(nodesKeys) || nodesKeys.length === 0 || !treeNodeKeyRecordIdMap) {
    return [];
  }
  let idExistMap = {};
  let selectedIds = [];
  nodesKeys.forEach((nodeKey) => {
    const selectedId = treeNodeKeyRecordIdMap[nodeKey];
    if (selectedId && !idExistMap[selectedId]) {
      selectedIds.push(nodeKey);
      idExistMap[selectedId] = true;
    }
  });
  return selectedIds;
};

export const checkIsTreeNodeShown = (nodeKey, keyFoldedNodeMap) => {
  const foldedNodeKeys = keyFoldedNodeMap && Object.keys(keyFoldedNodeMap);
  if (!Array.isArray(foldedNodeKeys) || foldedNodeKeys.length === 0) {
    return true;
  }

  // parent node is folded
  return !foldedNodeKeys.some((foldedNodeKey) => nodeKey !== foldedNodeKey && nodeKey.includes(foldedNodeKey));
};

export const getTreeNodeId = (node) => {
  return node ? node[TREE_NODE_KEY.ID] : '';
};

export const getTreeNodeKey = (node) => {
  return node ? node[TREE_NODE_KEY.KEY] : '';
};
