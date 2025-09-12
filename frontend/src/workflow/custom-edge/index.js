import classname from 'classnames';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  useReactFlow,
} from '@xyflow/react';
import { memo } from 'react';
import Icon from '../../components/icon';

import './index.css';
import { gettext } from '../../utils/constants';

const EdgeLabel = ({ transform, label }) => {
  return (
    <div className="workflow-custom-edge-label nodrag nopan" style={{ transform }}>{label}</div>
  );
};

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data }) => {
  const { setEdges } = useReactFlow();
  let paths = [];
  if (targetX < sourceX) {
    paths = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 20,
    });
  } else {
    paths = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  }
  const edgePath = paths[0];
  const labelX = paths[1];
  const labelY = paths[2];
  return (
    <>
      <BaseEdge id={id} path={edgePath} labelX={labelX} labelY={labelY} markerEnd={markerEnd} className={classname({ '--hovered': data.hovered })} />
      <EdgeLabelRenderer>
        {data.startLabel && (
          <EdgeLabel
            transform={`translate(0%, -50%) translate(${sourceX}px,${sourceY}px)`}
            label={data.startLabel}
          />
        )}
        {data.hovered && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan d-flex flex-direction-row"
          >
            <div className="workflow-custom-edge-btn width-[24px] height-[24px] border-radius-[3px] d-flex align-items-center justify-content-center" title={gettext('Add')}><i className="sf3-font-new sf3-font"></i></div>
            <div
              className="workflow-custom-edge-btn width-[24px] height-[24px] border-radius-[3px] d-flex align-items-center justify-content-center"
              onClick={() => {
                setEdges((es) => es.filter((e) => e.id !== id));
              }}
              title={gettext('Delete')}
            >
              <Icon symbol="delete" />
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
};

export default memo(CustomEdge);
