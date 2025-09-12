import { NODE_TYPE } from '../constants/node';
import WorkflowEdge from '../model/edge';
import WorkflowNode from '../model/node';

const optimizeWorkflowEdgesStorage = (edges) => {
  if (!Array.isArray(edges) || edges.length === 0) return [];
  return edges.filter(Boolean).map(edge => new WorkflowEdge(edge));
};

const optimizeWorkflowNodesStorage = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];
  return nodes.filter(node => {
    return node?.id && node?.type !== NODE_TYPE.ADD_NODE_PLACEHOLDER;
  }).map(node => new WorkflowNode(node));
};

const optimizeWorkflowGraphStorage = (graph) => {
  return {
    nodes: optimizeWorkflowNodesStorage(graph?.nodes),
    edges: optimizeWorkflowEdgesStorage(graph?.edges),
  };
};

export const serializeWorkflowGraphForSave = (graph) => {
  const optimizedGraph = optimizeWorkflowGraphStorage(graph);
  return JSON.stringify(optimizedGraph);
};
