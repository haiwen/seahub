import { memo, useState } from 'react';
import classnames from 'classnames';
import { useReactFlow } from '@xyflow/react';
import Icon from '../../../components/icon';
import SourceHandle from '../../handle/source';
import TargetHandle from '../../handle/target';
import { gettext } from '../../../utils/constants';
import { useWorkflows } from '../../hooks/workflows';
import { useWorkflow } from '../../hooks/workflow';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { getNodeById } from '../../utils/node';

import './index.css';

const CustomNode = ({ id, data, label, iconSymbol, customIcon, classname, borderClassname, bgColorClassname, boxShadowClassname }) => {
  const { workflowEventBus } = useWorkflows();
  const { nodes } = useWorkflow();
  const { deleteElements } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const { config_id: node_type, rf_source_handles } = data || {};
  const onDeleteCurrentNode = (event) => {
    event.stopPropagation(); // not select node via click handle
    const nodeToDelete = getNodeById(id, nodes);
    if (!nodeToDelete) return;
    deleteElements({ nodes: [nodeToDelete] });
  };

  const handleClickNode = () => {
    workflowEventBus.dispatch(EVENT_BUS_TYPE.SHOW_NODE_SETTINGS, id);
  };

  return (
    <>
      <div
        className={classnames(
          'workflow-custom-node-container',
          `workflow-custom-node_${node_type}`,
          'border-radius-[5px] position-relative',
          classname,
          (borderClassname || 'custom-node-border'),
          (bgColorClassname || 'custom-node-bg-color'),
          (boxShadowClassname || 'custom-node-box-shadow'),
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClickNode}
      >
        <div className={classnames('workflow-custom-node-content position-relative width-[240px]', boxShadowClassname)}>
          <div className="workflow-custom-node-body">
            {customIcon || null}
            {(!customIcon && iconSymbol) && <Icon symbol={iconSymbol} />}
            {label && <span className="workflow-custom-node-label">{label}</span>}
          </div>
        </div>
        {hovered && (
          <div className="workflow-custom-node-toolbar position-absolute d-flex align-items-center justify-content-start">
            <div
              className="workflow-custom-node-toolbar-btn width-[24px] height-[24px] border-radius-[3px] d-flex align-items-center justify-content-center"
              title={gettext('Delete')}
              onClick={onDeleteCurrentNode}
            >
              <Icon symbol="delete" />
            </div>
          </div>
        )}
      </div>
      {Array.isArray(rf_source_handles) && rf_source_handles.map((handle, index) => {
        const handleTop = `${String(parseFloat(((100 / (rf_source_handles.length + 1)) * (index + 1)).toFixed(4)))}%`;
        return (
          <SourceHandle key={`custom-node-handle-${index}`} index={index} id={handle.id} nodeId={id} top={handleTop} label={handle.label} />
        );
      })}
      <TargetHandle id={`in-${id}`} />
    </>
  );
};

export default memo(CustomNode);
