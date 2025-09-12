import { getBezierPath, getSmoothStepPath } from '@xyflow/react';
import { STROKE_WIDTH } from './constants/canvas';

const CustomConnectionLine = ({ fromX, fromY, toX, toY }) => {
  let pathD = '';
  if (toX < fromX) {
    pathD = getSmoothStepPath({ sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY, borderRadius: 20 })[0];
  } else {
    pathD = getBezierPath({ sourceX: fromX, sourceY: fromY, targetX: toX, targetY: toY })[0];
  }
  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke="var(--bs-workflow-edge-color)"
        strokeWidth={STROKE_WIDTH}
        markerEnd={`url(#1__color=var(--bs-workflow-edge-color)&strokeWidth=${STROKE_WIDTH}&type=arrow)`}
      />
    </g>
  );
};

export default CustomConnectionLine;
