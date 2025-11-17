import { CONDITION_NODE_TYPE, DEFAULT_NODE_POSITION, NODE_TYPE } from '../constants/node';

class WorkflowNode {

  constructor(object) {
    this.id = object.id || '';
    this.type = object.type || '';
    this.position = object.position || DEFAULT_NODE_POSITION;
    this.data = this.optimizeNodeData(object.data);
  }

  optimizeSourceHandles = (source_handles, config_id) => {
    if (Array.isArray(source_handles)) return source_handles;

    // init node handles
    if (this.type === NODE_TYPE.CONDITION && config_id === CONDITION_NODE_TYPE.IF_ELSE) {
      return [
        { id: 'if' },
        { id: 'else' },
      ];
    }
    return [];
  };

  optimizeNodeData = (data) => {
    const { config_id, params, source_handles } = data || {};
    let optimizedData = {
      config_id: config_id || '',
    };
    if (params) {
      optimizedData.params = params;
    }
    const optimizedSourceHandles = this.optimizeSourceHandles(source_handles, config_id);
    if (optimizedSourceHandles.length > 0) {
      optimizedData.source_handles = optimizedSourceHandles;
    }
    return optimizedData;
  };
}

export default WorkflowNode;
