import classnames from 'classnames';
import { Position } from '@xyflow/react';
import Icon from '../../components/icon';
import CustomHandle from '../handle/custom';


const BaseNode = ({ className, widthClassname, heightClassname, borderRadiusClassname, borderClassname, bgColorClassname, boxShadowClassname, nodeType, customIcon, iconSymbol, label, selected }) => {
  return (
    <>
      <div
        className={classnames('workflow-custom-node-container', `workflow-custom-node_${nodeType}`, className, borderRadiusClassname, borderClassname, bgColorClassname)}
      >
        <div className={classnames('workflow-custom-node-content', widthClassname, heightClassname, boxShadowClassname)}>
          <div className="workflow-custom-node-body">
            {customIcon || null}
            {(!customIcon && iconSymbol) && <Icon symbol={iconSymbol} />}
            {label && <span className="workflow-custom-node-label">{label}</span>}
          </div>
        </div>
      </div>
      <CustomHandle type="source" position={Position.Right} />
    </>
  );
};

export default BaseNode;
