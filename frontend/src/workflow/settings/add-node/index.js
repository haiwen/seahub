import { useCallback } from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../components/icon';
import WorkflowSettingsPanel, { WorkflowSettingsPanelBody } from '../settings-panel';
import { gettext } from '../../../utils/constants';
import { ACTION_NODE_TYPE, CONDITION_NODE_TYPE, NODE_TYPE, TRIGGER_NODE_TYPE } from '../../constants/node';
import { EVENT_BUS_TYPE } from '../../constants/event-bus-type';
import { useWorkflows } from '../../hooks/workflows';

import './index.css';

const SUPPORT_TRIGGER_TYPES = [
  { config_id: TRIGGER_NODE_TYPE.FILE_UPLOAD, icon_symbol: 'trigger', text: gettext('When a file is added') },
];

const CONDITION_NODE_TYPES = [
  { config_id: CONDITION_NODE_TYPE.IF_ELSE, icon_symbol: 'judgment-condition', text: gettext('If') },
];

const ACTION_NODE_TYPES = [
  { config_id: ACTION_NODE_TYPE.SET_STATUS, icon_symbol: 'perform-action', text: gettext('Set file status') },
];

const WorkflowSettingsAddNode = ({ addNode, closePanel }) => {
  const { workflowEventBus } = useWorkflows();

  const handleAddNode = useCallback((type, config_id) => {
    addNode({ type, config_id });
    workflowEventBus.dispatch(EVENT_BUS_TYPE.HIDE_PANEL);
  }, [addNode, workflowEventBus]);

  const renderNode = useCallback(({ type, config_id, iconSymbol, text }) => {
    return (
      <div key={`workflow-settings-available-node-${config_id}`} className="workflow-settings-available-node d-flex align-items-center" onClick={() => handleAddNode(type, config_id)}>
        <Icon symbol={iconSymbol} />
        <span className="workflow-settings-available-node-text">{text || ''}</span>
      </div>
    );
  }, [handleAddNode]);

  return (
    <WorkflowSettingsPanel title={gettext('Nodes')} closePanel={closePanel}>
      <WorkflowSettingsPanelBody>
        <div className="workflow-settings-available-nodes">
          {SUPPORT_TRIGGER_TYPES.map((trigger) => {
            return renderNode({ type: NODE_TYPE.TRIGGER, config_id: trigger.config_id, iconSymbol: trigger.icon_symbol, text: trigger.text });
          })}
          {CONDITION_NODE_TYPES.map((condition) => {
            return renderNode({ type: NODE_TYPE.CONDITION, config_id: condition.config_id, iconSymbol: condition.icon_symbol, text: condition.text });
          })}
          {ACTION_NODE_TYPES.map((action) => {
            return renderNode({ type: NODE_TYPE.ACTION, config_id: action.config_id, iconSymbol: action.icon_symbol, text: action.text });
          })}
        </div>
      </WorkflowSettingsPanelBody>
    </WorkflowSettingsPanel>
  );
};

WorkflowSettingsAddNode.propTypes = {
  addNode: PropTypes.func,
  closePanel: PropTypes.func,
};

export default WorkflowSettingsAddNode;
