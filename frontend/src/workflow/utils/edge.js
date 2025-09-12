import { MarkerType } from '@xyflow/react';
import WorkflowEdge from '../model/edge';
import { STROKE_WIDTH } from '../constants/canvas';
import { EDGE_TYPE } from '../constants/edge';

export const getEdgeById = (edgeId, edges) => {
  if (!Array.isArray(edges) || edges.length === 0 || !edgeId) return null;
  return edges.find((edge) => edge.id === edgeId);
};

export const createRfEdge = (edgeConfig) => {
  let edge = new WorkflowEdge(edgeConfig);
  edge.type = EDGE_TYPE.CUSTOM;
  if (!edge.data) {
    edge.data = {};
  }
  edge.data.startLabel = edgeConfig.label || '';
  edge.markerEnd = {
    type: MarkerType.Arrow,
    color: 'var(--bs-workflow-edge-color)',
    strokeWidth: STROKE_WIDTH,
  };
  edge.animated = false;
  return edge;
};

export const checkHandleHasConnection = (edges, nodeId, handleId) => {
  return edges.some(e => e.source === nodeId && e.sourceHandle === handleId);
};
