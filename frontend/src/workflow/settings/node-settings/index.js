import PropTypes from 'prop-types';
import WorkflowSettingsPanel, { WorkflowSettingsPanelBody } from '../settings-panel';
import WorkflowTriggerFileUploadSettings from './trigger-file-upload';
import WorkflowConditionIfSettings from './condition-if';
import WorkflowActionSetFileStatusSettings from './set-file-status';
import { gettext } from '../../../utils/constants';
import { useWorkflow } from '../../hooks/workflow';
import { getNodeById } from '../../utils/node';
import { ACTION_NODE_TYPE, CONDITION_NODE_TYPE, NODE_TYPE, TRIGGER_NODE_TYPE } from '../../constants/node';

import './index.css';
const WorkflowNodeSettings = ({ closePanel }) => {
  const { nodes, editingNodeId } = useWorkflow();
  const editingNode = getNodeById(editingNodeId, nodes);
  const nodeType = editingNode?.type;
  const nodeConfigId = editingNode?.data?.config_id;

  return (
    <WorkflowSettingsPanel title={gettext('Node settings')} closePanel={closePanel}>
      <WorkflowSettingsPanelBody>
        <div className="workflow-node-settings-wrapper">
          {nodeType === NODE_TYPE.TRIGGER && nodeConfigId === TRIGGER_NODE_TYPE.FILE_UPLOAD && (
            <WorkflowTriggerFileUploadSettings key={`node-settings-${editingNodeId}`} />
          )}
          {nodeType === NODE_TYPE.CONDITION && nodeConfigId === CONDITION_NODE_TYPE.IF_ELSE && (
            <WorkflowConditionIfSettings key={`node-settings-${editingNodeId}`} editingNode={editingNode} />
          )}
          {nodeType === NODE_TYPE.ACTION && nodeConfigId === ACTION_NODE_TYPE.SET_STATUS && (
            <WorkflowActionSetFileStatusSettings key={`node-settings-${editingNodeId}`} editingNode={editingNode} />
          )}
        </div>
      </WorkflowSettingsPanelBody>
    </WorkflowSettingsPanel>
  );
};

WorkflowNodeSettings.propTypes = {
  closePanel: PropTypes.func,
};

export default WorkflowNodeSettings;
