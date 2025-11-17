import { createRfEdge } from './edge';
import { createRfNode, getNodeById, getNodeHandleById } from './node';

export const normalizeWorkflowNodes = (nodes) => {
  if (!Array.isArray(nodes) || nodes.length === 0) return [];
  return nodes.filter(Boolean).map(node => createRfNode(node));
};

export const normalizeWorkflowEdges = (edges, nodes) => {
  if (!Array.isArray(edges) || edges.length === 0) return [];
  return edges.filter(Boolean).map(edge => {
    const sourceNode = getNodeById(edge.source, nodes);
    const sourceHandle = getNodeHandleById(edge.sourceHandle, sourceNode?.data?.rf_source_handles);
    const edgeConfig = { ...edge, label: sourceHandle?.label };
    return createRfEdge(edgeConfig);
  });
};

export const normalizeWorkflowGraph = (graph) => {
  const normalizedGraph = graph || {};
  normalizedGraph.nodes = normalizeWorkflowNodes(normalizedGraph.nodes);
  normalizedGraph.edges = normalizeWorkflowEdges(normalizedGraph.edges, normalizedGraph.nodes);
  return normalizedGraph;
};
