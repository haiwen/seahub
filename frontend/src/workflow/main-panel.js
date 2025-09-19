import { useMemo } from 'react';
import PropTypes from 'prop-types';
import WorkflowToolbar from './toolbar';
import WorkflowCanvas from './canvas';
import { useWorkflows } from './hooks/workflows';
import { getWorkflowById } from './utils/common';

const MainPanel = ({ mainPanelDOMRef, isSidePanelFolded, onToggleSidePanelFolded }) => {
  const { workflows, selectedWorkflowId } = useWorkflows();
  const selectedWorkflow = useMemo(() => getWorkflowById(selectedWorkflowId, workflows), [selectedWorkflowId, workflows]);

  return (
    <div className="main-panel" ref={mainPanelDOMRef}>
      <div className="main-panel-center flex-row">
        <div className="cur-view-container">
          <WorkflowToolbar
            selectedWorkflow={selectedWorkflow}
            isSidePanelFolded={isSidePanelFolded}
            onToggleSidePanelFolded={onToggleSidePanelFolded}
          />
          <div className="cur-view-content">
            <WorkflowCanvas />
          </div>
        </div>
      </div>
    </div>
  );
};

MainPanel.propTypes = {
  mainPanelDOMRef: PropTypes.object,
  isSidePanelFolded: PropTypes.bool,
  onToggleSidePanelFolded: PropTypes.func,
};

export default MainPanel;
