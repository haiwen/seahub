import { Position } from '@xyflow/react';
import CustomHandle from '../custom';

import './index.css';

const TargetHandle = ({ id }) => {
  return (
    <CustomHandle className="workflow-target-handle" type="target" position={Position.Left} id={id} />
  );
};

export default TargetHandle;
