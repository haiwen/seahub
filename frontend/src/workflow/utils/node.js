import WorkflowNode from '../model/node';
import { CONDITION_NODE_TYPE, NODE_TYPE } from '../constants/node';

const DEFAULT_SOURCE_HANDLE_ID = 'output_default';

export const getNodeById = (nodeId, nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0 || !nodeId) return null;
  return nodes.find((node) => node.id === nodeId);
};

export const getNodeIndexById = (nodeId, nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0 || !nodeId) return null;
  return nodes.findIndex((node) => node.id === nodeId);
};

export const getNodeHandleById = (handleId, handles) => {
  if (!Array.isArray(handles) || handles.length === 0 || !handleId) return null;
  return handles.find((handle) => handle.id === handleId);
};

export const createAddTriggerPlaceholderNode = () => {
  return {
    id: NODE_TYPE.ADD_NODE_PLACEHOLDER,
    type: NODE_TYPE.ADD_NODE_PLACEHOLDER,
    position: { x: 0, y: 0 },
    selectable: false,
  };
};

export const transToRfNode = (nodeConfig) => {
  const { type, data } = nodeConfig;
  const { config_id } = data;
  let rfNode = { ...nodeConfig };
  switch (type) {
    case NODE_TYPE.CONDITION: {
      if (config_id === CONDITION_NODE_TYPE.IF_ELSE && Array.isArray(data.source_handles)) {
        rfNode.data.rf_source_handles = data.source_handles.map(h => ({ ...h, label: h.id == 'if' ? 'true' : 'false' }));
        break;
      }
      break;
    }
    default: {
      break;
    }
  }
  if (!Array.isArray(rfNode.data.rf_source_handles) || rfNode.data.rf_source_handles.length === 0) {
    rfNode.data.rf_source_handles = [{ id: DEFAULT_SOURCE_HANDLE_ID }];
  }
  return rfNode;
};

export const createRfNode = (nodeConfig) => {
  const node = new WorkflowNode(nodeConfig);
  return transToRfNode(node);
};

export const calculateDragNodeSnap = (dragNode, allNodes) => {
  const THRESHOLD = 6;
  const w = dragNode.width;
  const h = dragNode.height;

  let x = dragNode.position.x;
  let y = dragNode.position.y;

  allNodes.forEach((n) => {
    if (n.id === dragNode.id) return;

    const nodeWidth = n.width;
    const nodeHeight = n.height;

    // center point
    const dragCenterX = x + w / 2;
    const dragCenterY = y + h / 2;
    const otherCenterX = n.position.x + nodeWidth / 2;
    const otherCenterY = n.position.y + nodeHeight / 2;

    // X: center / left / right
    if (Math.abs(dragCenterX - otherCenterX) < THRESHOLD) {
      x = otherCenterX - w / 2;
    }
    if (Math.abs(x - n.position.x) < THRESHOLD) {
      x = n.position.x;
    }
    if (Math.abs(x + w - (n.position.x + nodeWidth)) < THRESHOLD) {
      x = n.position.x + nodeWidth - w;
    }

    // Y: center / left / right
    if (Math.abs(dragCenterY - otherCenterY) < THRESHOLD) {
      y = otherCenterY - h / 2;
    }
    if (Math.abs(y - n.position.y) < THRESHOLD) {
      y = n.position.y;
    }
    if (Math.abs(y + h - (n.position.y + nodeHeight)) < THRESHOLD) {
      y = n.position.y + nodeHeight - h;
    }
  });

  return { x, y };
};
