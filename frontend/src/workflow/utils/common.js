export const getWorkflowById = (workflowId, workflows) => {
  if (!Array.isArray(workflows) || workflows.length === 0 || !workflowId) return null;
  return workflows.find((workflow) => workflow.id === workflowId);
};

export const normalizeWorkflowGraph = (graph) => {
  const normalizedGraph = graph || {};
  if (!Array.isArray(normalizedGraph.nodes)) {
    normalizedGraph.nodes = [];
  }
  if (!Array.isArray(normalizedGraph.edges)) {
    normalizedGraph.edges = [];
  }
  return normalizedGraph;
};
