import { memo, useState } from 'react';
import classnames from 'classnames';
import { useReactFlow } from '@xyflow/react';
import Icon from '../../../components/icon';
import SourceHandle from '../../handle/source';
import TargetHandle from '../../handle/target';
import { NODE_TYPE_CONFIG } from '../node-types';
import { gettext } from '../../../utils/constants';

import './index.css';

const CustomNode = ({ id, data }) => {
  const { setNodes } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const { node_type, deletable } = data || {};
  const nodeConfig = NODE_TYPE_CONFIG[node_type] || {};
  if (!nodeConfig) return null;
  const {
    classname, custom_icon, icon_symbol, label,
    border_classname, bg_color_classname, shadow_classname,
  } = nodeConfig;
  const borderClassname = border_classname || 'custom-node-border';
  const bgColorClassname = bg_color_classname || 'custom-node-bg-color';
  const boxShadowClassname = shadow_classname || 'custom-node-box-shadow';

  return (
    <>
      <div
        className={classnames(
          'workflow-custom-node-container', `workflow-custom-node_${node_type}`, 'border-radius-[5px] position-relative',
          classname, borderClassname, bgColorClassname)
        }
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className={classnames('workflow-custom-node-content position-relative width-[240px]', boxShadowClassname)}>
          <div className="workflow-custom-node-body">
            {custom_icon || null}
            {(!custom_icon && icon_symbol) && <Icon symbol={icon_symbol} />}
            {label && <span className="workflow-custom-node-label">{label}</span>}
          </div>
        </div>
        {hovered && (
          <div className="workflow-custom-node-toolbar position-absolute d-flex align-items-center justify-content-start">
            <div className="workflow-custom-node-toolbar-btn width-[24px] height-[24px] border-radius-[3px] d-flex align-items-center justify-content-center" title={gettext('Delete')} onClick={() => {
              setNodes((nodes) => nodes.filter((n) => n.id !== id));
            }}>
              <Icon symbol="delete" />
            </div>
          </div>
        )}
      </div>
      {id === 'if_else' && (
        <>
          <SourceHandle id="output-1" nodeId={id} top='33.3333%' label="true" />
          <SourceHandle id="output-2" nodeId={id} top='66.6667%' label="false" />
        </>
      )}
      {id && id.includes('set_status') && (
        <SourceHandle id="output-1" nodeId={id} top='50%' />
      )}
      <TargetHandle id={`in-${id}`} />
    </>
  );
};

export default memo(CustomNode);
