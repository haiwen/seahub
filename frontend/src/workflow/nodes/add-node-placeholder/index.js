import { gettext } from '../../../utils/constants';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { DEFAULT_NODE_POSITION } from '../../constants/node';
import { useWorkflows } from '../../hooks/workflows';

import './index.css';

const AddNodePlaceholder = () => {
  const { workflowEventBus } = useWorkflows();

  const onAddNode = () => {
    workflowEventBus.dispatch(EVENT_BUS_TYPE.SHOW_ADD_NODE, { position: DEFAULT_NODE_POSITION });
  };

  return (
    <div className="workflow-add-node-placeholder-container border-radius-[5px] position-relative" onClick={onAddNode}>
      <div className="workflow-add-node-placeholder-content position-relative width-[240px]">
        <div className="workflow-add-node-placeholder-body">
          <i className="sf3-font-new sf3-font mr-2"></i>
          <span className="workflow-custom-node-label">{gettext('Add node')}</span>
        </div>
      </div>
    </div>
  );
};

export default AddNodePlaceholder;
