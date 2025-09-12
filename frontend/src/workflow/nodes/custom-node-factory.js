import AddTriggerPlaceholder from './add-trigger-placeholder';
import { NODE_TYPE } from '../constants/node';

const TYPE_CUSTOM_NODE = {
  [NODE_TYPE.ADD_TRIGGER_PLACEHOLDER]: <AddTriggerPlaceholder />
};

export const createCustomNode = (customType) => {
  return TYPE_CUSTOM_NODE[customType];
};
