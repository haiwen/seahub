import PropTypes from 'prop-types';
import { getBezierPath, getSmoothStepPath } from '@xyflow/react';
import { STROKE_WIDTH } from './constants/canvas';

const CustomConnectionLine = ({ fromX, fromY, toX, toY, fromPosition: sourcePosition, toPosition: targetPosition }) => {
  let pathD = '';
  if (toX < fromX) {
    pathD = getSmoothStepPath({
      sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY,
      sourcePosition, targetPosition,
      borderRadius: 20
    })[0];
  } else {
    pathD = getBezierPath({
      sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY,
      sourcePosition, targetPosition,
    })[0];
  }
  return (
    <g>
      <defs>
        <marker
          id="custom-arrow"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 10 5 L 0 10"
            fill="none"
            stroke="var(--bs-workflow-edge-color)"
            strokeWidth={2}
          />
        </marker>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke="var(--bs-workflow-edge-color)"
        strokeWidth={STROKE_WIDTH}
        markerEnd="url(#custom-arrow)"
      />
    </g>
  );
};

CustomConnectionLine.propTypes = {
  fromX: PropTypes.number,
  fromY: PropTypes.number,
  toX: PropTypes.number,
  toY: PropTypes.number,
  fromPosition: PropTypes.string,
  toPosition: PropTypes.string,
};

export default CustomConnectionLine;
