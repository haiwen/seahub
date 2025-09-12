export const getWorkflowById = (workflowId, workflows) => {
  if (!Array.isArray(workflows) || workflows.length === 0 || !workflowId) return null;
  return workflows.find((workflow) => workflow.id === workflowId);
};
