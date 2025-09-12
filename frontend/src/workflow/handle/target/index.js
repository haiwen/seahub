import PropTypes from 'prop-types';
import { Position } from '@xyflow/react';
import CustomHandle from '../custom';

import './index.css';

const TargetHandle = ({ id }) => {
  return (
    <CustomHandle className="workflow-target-handle" type="target" position={Position.Left} id={id} />
  );
};

TargetHandle.propTypes = {
  id: PropTypes.string,
};

export default TargetHandle;
