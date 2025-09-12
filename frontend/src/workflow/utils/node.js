import { CUSTOM_NODE_WIDTH, FLOW_NODE_TYPE, NODE_TYPE } from '../constants/node';

export const createAddTriggerPlaceholderNode = () => {
  return {
    id: FLOW_NODE_TYPE.ADD_NODE_PLACEHOLDER,
    type: FLOW_NODE_TYPE.ADD_NODE_PLACEHOLDER,
    position: { x: 0, y: 0 },
    selectable: false,
  };
};

export const createFileUploadNode = () => {
  return {
    id: 'file_upload',
    type: 'custom',
    position: { x: 0, y: 0 },
    data: { node_type: NODE_TYPE.FILE_UPLOAD },
  };
};

export const createConditionNode = () => {
  return {
    id: 'if_else',
    type: 'custom',
    position: { x: 0, y: 0 },
    data: { node_type: NODE_TYPE.IF_ELSE },
  };
};

export const createSetStatusNode = (index, position) => {
  return {
    id: 'set_status' + index,
    type: 'custom',
    position: position || { x: 0, y: 0 },
    data: { node_type: NODE_TYPE.SET_STATUS },
  };
};

export const createAddNodePlaceholder = (parentNode) => {
  return {
    id: 'add_node_placeholder',
    type: 'custom',
    position: { x: parentNode.position.x + CUSTOM_NODE_WIDTH + 100, y: parentNode.position.y },
    data: { node_type: NODE_TYPE.ADD_NODE_PLACEHOLDER },
  };
};
