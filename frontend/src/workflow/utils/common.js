import Workflow from '../model/workflow';

export const getWorkflowById = (workflowId, workflows) => {
  if (!Array.isArray(workflows) || workflows.length === 0 || !workflowId) return null;
  return workflows.find((workflow) => workflow.id === workflowId);
};

export const normalizeWorkflows = (workflows) => {
  if (!Array.isArray(workflows) || workflows.length === 0) return [];
  return workflows.filter(Boolean).map(workflow => new Workflow(workflow));
};
