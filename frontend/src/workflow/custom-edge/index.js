import { memo } from 'react';
import PropTypes from 'prop-types';
import classname from 'classnames';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  useReactFlow,
} from '@xyflow/react';
import Icon from '../../components/icon';
import { useWorkflow } from '../hooks/workflow';
import { gettext } from '../../utils/constants';
import { getEdgeById } from '../utils/edge';

import './index.css';

const EdgeLabel = ({ transform, label }) => {
  return (
    <div className="workflow-custom-edge-label nodrag nopan" style={{ transform }}>{label}</div>
  );
};

EdgeLabel.propTypes = {
  transform: PropTypes.string,
  label: PropTypes.string,
};

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data }) => {
  const { edges } = useWorkflow();
  const { deleteElements } = useReactFlow();
  const { hovered, startLabel } = data || {};
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
      <BaseEdge id={id} path={edgePath} labelX={labelX} labelY={labelY} markerEnd={markerEnd} className={classname({ '--hovered': !!hovered })} type='source' />
      <EdgeLabelRenderer>
        {startLabel && (
          <EdgeLabel
            transform={`translate(0%, -50%) translate(${sourceX}px,${sourceY}px)`}
            label={startLabel}
          />
        )}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan d-flex flex-direction-row"
          >
            {/* // TODO: support add node between two nodes */}
            {/* <div className="workflow-custom-edge-btn width-[24px] height-[24px] border-radius-[3px] d-flex align-items-center justify-content-center" title={gettext('Add')}><i className="sf3-font-new sf3-font"></i></div> */}
            <div
              className="workflow-custom-edge-btn width-[24px] height-[24px] border-radius-[3px] d-flex align-items-center justify-content-center"
              onClick={() => {
                const edgeToDelete = getEdgeById(id, edges);
                if (!edgeToDelete) return;
                deleteElements({ edges: [edgeToDelete] });
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

CustomEdge.propTypes = {
  id: PropTypes.string,
  sourceX: PropTypes.number,
  sourceY: PropTypes.number,
  targetX: PropTypes.number,
  targetY: PropTypes.number,
  sourcePosition: PropTypes.string,
  targetPosition: PropTypes.string,
  markerEnd: PropTypes.string,
  data: PropTypes.object,
};

export default memo(CustomEdge);
