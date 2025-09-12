import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import NavWorkflow from './nav-workflow';
import WorkflowNavFolder from './nav-folder';
import { useWorkflows } from '../hooks/workflows';
import { WORKFLOW_NAV_TYPE_MAP } from '../constants/nav';
import { getWorkflowById } from '../utils/common';

const WorkflowNavTree = ({ leftIndent }) => {
  const { navigation, workflows } = useWorkflows();

  const handleGetWorkflowById = useCallback((workflowId) => {
    return getWorkflowById(workflowId, workflows);
  }, [workflows]);

  return (
    <div className="workflow-nav-tree">
      <div className="workflow-nav-tree-children">
        <DndProvider backend={HTML5Backend}>
          {navigation.map((nav) => {
            const { id: navId, type: navType } = nav || {};
            if (navType === WORKFLOW_NAV_TYPE_MAP.FOLDER) {
              return (
                <WorkflowNavFolder
                  key={`workflow-nav-folder-${navId}`}
                  folder={nav}
                  leftIndent={leftIndent}
                  getWorkflowById={handleGetWorkflowById}
                />
              );
            }
            if (navType === WORKFLOW_NAV_TYPE_MAP.WORKFLOW) {
              const workflow = handleGetWorkflowById(navId);
              if (!workflow) return null;
              return (
                <NavWorkflow
                  key={`workflow-nav-${navId}`}
                  workflow={workflow}
                  leftIndent={leftIndent}
                />
              );
            }
            return null;
          })}
        </DndProvider>
      </div>
    </div>
  );
};

WorkflowNavTree.propTypes = {
  leftIndent: PropTypes.number,
};

export default WorkflowNavTree;
