import { getRecordsIdsByTreeNodeKeys } from './tree';

const checkIsTreeNodeSelected = (nodeKey, treeMetrics) => {
  return treeMetrics.idSelectedNodeMap[nodeKey];
};

const selectTreeNode = (nodeKey, treeMetrics) => {
  if (checkIsTreeNodeSelected(nodeKey, treeMetrics)) {
    return;
  }
  treeMetrics.idSelectedNodeMap[nodeKey] = true;
};

const selectTreeNodesByKeys = (nodeKeys, treeMetrics) => {
  nodeKeys.forEach((nodeKey) => {
    selectTreeNode(nodeKey, treeMetrics);
  });
};

const deselectTreeNode = (nodeKey, treeMetrics) => {
  if (!checkIsTreeNodeSelected(nodeKey, treeMetrics)) {
    return;
  }
  delete treeMetrics.idSelectedNodeMap[nodeKey];
};

const deselectAllTreeNodes = (treeMetrics) => {
  treeMetrics.idSelectedNodeMap = {};
};

const getSelectedTreeNodesKeys = (treeMetrics) => {
  return Object.keys(treeMetrics.idSelectedNodeMap);
};

const getSelectedIds = (treeMetrics, treeNodeKeyRecordIdMap) => {
  const selectedNodesKeys = getSelectedTreeNodesKeys(treeMetrics);
  return getRecordsIdsByTreeNodeKeys(selectedNodesKeys, treeNodeKeyRecordIdMap);
};

const checkHasSelectedTreeNodes = (treeMetrics) => {
  return getSelectedTreeNodesKeys(treeMetrics).length > 0;
};

const checkIsSelectedAll = (nodeKeys, treeMetrics) => {
  const selectedNodesKeysLen = getSelectedTreeNodesKeys(treeMetrics).length;
  if (selectedNodesKeysLen === 0) {
    return false;
  }
  return nodeKeys.every(nodeKey => checkIsTreeNodeSelected(nodeKey, treeMetrics));
};

const getDraggedTreeNodesKeys = (draggingTreeNodeKey, treeMetrics) => {
  const selectedNodeKeys = getSelectedTreeNodesKeys(treeMetrics);
  if (selectedNodeKeys.includes(draggingTreeNodeKey)) {
    return selectedNodeKeys;
  }
  return [draggingTreeNodeKey];
};

export const TreeMetrics = {
  checkIsTreeNodeSelected,
  selectTreeNode,
  selectTreeNodesByKeys,
  deselectTreeNode,
  deselectAllTreeNodes,
  getSelectedTreeNodesKeys,
  getSelectedIds,
  checkHasSelectedTreeNodes,
  checkIsSelectedAll,
  getDraggedTreeNodesKeys,
};
