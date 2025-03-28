import { TREE_NODE_KEY } from '../constants/tree';

export const generateNodeKey = (parentKey, currentNodeId) => {
  return `${parentKey ? parentKey + '_' : ''}${currentNodeId}`;
};

export const createTreeNode = (nodeId, nodeKey, depth, hasChildNodes) => {
  return {
    [TREE_NODE_KEY.ID]: nodeId,
    [TREE_NODE_KEY.KEY]: nodeKey,
    [TREE_NODE_KEY.DEPTH]: depth,
    [TREE_NODE_KEY.HAS_CHILD_NODES]: hasChildNodes,
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
      selectedIds.push(selectedId);
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

export const updatedKeyTreeNodeMap = (nodeKey, node, keyTreeNodeMap) => {
  if (!nodeKey || !node || !keyTreeNodeMap) return;
  keyTreeNodeMap[nodeKey] = node;
};

export const getTreeNodeByKey = (nodeKey, keyTreeNodeMap) => {
  if (!nodeKey || !keyTreeNodeMap) return null;
  return keyTreeNodeMap[nodeKey];
};

export const getTreeNodeById = (nodeId, tree) => {
  if (!nodeId || !Array.isArray(tree) || tree.length === 0) return null;
  return tree.find((node) => getTreeNodeId(node) === nodeId);
};

export const getTreeNodeId = (node) => {
  return node ? node[TREE_NODE_KEY.ID] : '';
};

export const getTreeNodeKey = (node) => {
  return node ? node[TREE_NODE_KEY.KEY] : '';
};

export const getTreeNodeDepth = (node) => {
  return node ? node[TREE_NODE_KEY.DEPTH] : 0;
};

export const checkTreeNodeHasChildNodes = (node) => {
  return node ? node[TREE_NODE_KEY.HAS_CHILD_NODES] : false;
};

export const resetTreeHasChildNodesStatus = (tree) => {
  if (!Array.isArray(tree) || tree.length === 0) {
    return;
  }
  tree.forEach((node, index) => {
    const nextNode = tree[index + 1];
    const nextNodeKey = getTreeNodeKey(nextNode);
    const currentNodeKey = getTreeNodeKey(node);
    if (checkTreeNodeHasChildNodes(node) && (!nextNode || !nextNodeKey.includes(currentNodeKey))) {
      tree[index][TREE_NODE_KEY.HAS_CHILD_NODES] = false;
    }
  });
};

export const addTreeChildNode = (newChildNode, parentNode, tree) => {
  if (!parentNode || !Array.isArray(tree) || tree.length === 0) {
    return;
  }
  const parentNodeKey = getTreeNodeKey(parentNode);
  const parentNodeDepth = getTreeNodeDepth(parentNode);
  const parentNodeIndex = tree.findIndex((node) => getTreeNodeKey(node) === parentNodeKey);
  if (parentNodeIndex < 0) {
    return;
  }

  if (!checkTreeNodeHasChildNodes(parentNode)) {
    tree[parentNodeIndex] = { ...parentNode, [TREE_NODE_KEY.HAS_CHILD_NODES]: true };
  }

  const childNodeDepth = parentNodeDepth + 1;
  let lastChildNodeIndex = parentNodeIndex;
  for (let i = parentNodeIndex + 1, len = tree.length; i < len; i++) {
    const currentNode = tree[i];
    if (!getTreeNodeKey(currentNode).includes(parentNodeKey)) {
      break;
    }

    // insert new child tag behind the last child tag
    if (getTreeNodeDepth(currentNode) === childNodeDepth) {
      lastChildNodeIndex = i;
    }
  }
  tree.splice(lastChildNodeIndex + 1, 0, newChildNode);
};

export const getAllSubTreeNodes = (nodeIndex, tree) => {
  const treeLen = Array.isArray(tree) ? tree.length : 0;
  const parentNode = tree[nodeIndex];
  const parentNodeKey = getTreeNodeKey(parentNode);
  if (!parentNodeKey || nodeIndex === treeLen - 1) return [];

  let subNodes = [];
  for (let i = nodeIndex + 1, len = treeLen; i < len; i++) {
    const currNodeKey = getTreeNodeKey(tree[i]);
    if (!currNodeKey || !currNodeKey.includes(parentNodeKey)) {
      break;
    }
    subNodes.push(tree[i]);
  }
  return subNodes;
};

export const getTreeChildNodes = (parentNode, tree) => {
  const parentNodeKey = getTreeNodeKey(parentNode);
  const parentNodeIndex = tree.findIndex((node) => getTreeNodeKey(node) === parentNodeKey);
  if (parentNodeIndex < 0) {
    return [];
  }

  const parentNodeDepth = getTreeNodeDepth(parentNode);
  const childNodeDepth = parentNodeDepth + 1;
  let childNodes = [];
  for (let i = parentNodeIndex + 1, len = tree.length; i < len; i++) {
    const currentNode = tree[i];
    if (!getTreeNodeKey(currentNode).includes(parentNodeKey)) {
      break;
    }

    if (getTreeNodeDepth(currentNode) === childNodeDepth) {
      childNodes.push({ ...currentNode });
    }
  }
  return childNodes;
};

export const getNodesWithAncestors = (node, tree) => {
  const nodeKey = getTreeNodeKey(node);

  let nodesWithAncestors = [];
  tree.forEach((node, i) => {
    if (!nodeKey.includes(getTreeNodeKey(node))) {
      return;
    }
    nodesWithAncestors.push({ ...node, node_index: i });
  });
  return nodesWithAncestors;
};
