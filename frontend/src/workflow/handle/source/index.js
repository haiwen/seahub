import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Position, useConnection, useStore } from '@xyflow/react';
import CustomHandle from '../../handle/custom';
import { useWorkflows } from '../../hooks/workflows';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { checkHandleHasConnection } from '../../utils/edge';

import './index.css';
const SourceHandle = ({ id, nodeId, top, label }) => {
  const { workflowEventBus } = useWorkflows();
  const edges = useStore(state => state.edges);
  const connection = useConnection();
  const fromNodeId = connection?.fromNode?.id;
  const fromHandleId = connection?.fromHandle?.id;
  const hasConnection = checkHandleHasConnection(edges, nodeId, id);
  const isDraggingHandle = fromNodeId && fromHandleId && fromNodeId == nodeId && fromHandleId == id;

  const onClickHandle = useCallback((event) => {
    event.stopPropagation(); // not select node via click handle
    workflowEventBus.dispatch(EVENT_BUS_TYPE.SHOW_ADD_NODE, { sourceNodeId: nodeId, sourceHandleId: id });
  }, [workflowEventBus, nodeId, id]);

  return (
    <CustomHandle className="workflow-source-handle" type="source" position={Position.Right} id={id} style={{ top }}>
      <div className="workflow-handle-add-wrapper position-absolute d-flex flex-row align-items-center pe-none" onClick={onClickHandle}>
        <div className="circle pe-auto"></div>
        {(!isDraggingHandle && !hasConnection) && (
          <>
            {label && <span className="workflow-custom-handle-label pe-auto">{label}</span>}
            <div className="line pe-auto"></div>
            <div className="workflow-handle-btn-add-node width-[20px] height-[20px] border-radius-[3px] d-flex align-items-center justify-content-center pe-auto"><i className="sf3-font-new sf3-font"></i></div>
          </>
        )}
      </div>
    </CustomHandle>
  );
};

CustomHandle.propTypes = {
  id: PropTypes.string,
  nodeId: PropTypes.string,
  top: PropTypes.string,
  label: PropTypes.string,
};

export default SourceHandle;
