import classnames from 'classnames';
import { Handle } from '@xyflow/react';

import './index.css';

const CustomHandle = ({ className, children, style, ...props }) => {
  return (
    <Handle
      {...props}
      className={classnames('workflow-custom-handle', className)}
      style={style}
    >
      {children}
    </Handle>
  );
};

export default CustomHandle;
