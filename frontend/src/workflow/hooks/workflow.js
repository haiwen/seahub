import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { applyNodeChanges, applyEdgeChanges, addEdge, useViewport, useNodesState, useEdgesState, useReactFlow } from '@xyflow/react';
import deepCopy from 'deep-copy';
import { generatorUniqueBase64Code } from '../../utils/utils';
import { useWorkflows } from './workflows';
import { EVENT_BUS_TYPE } from '../constants/event-bus-type';
import { DEFAULT_NODE_POSITION, NODE_TYPE } from '../constants/node';
import { getWorkflowById } from '../utils/common';
import { normalizeWorkflowGraph } from '../utils/graph';
import { calculateNextNodePositionsFromHandles, findBlankPosition } from '../utils/canvas';
import { createAddTriggerPlaceholderNode, createRfNode, getNodeById, getNodeHandleById, getNodeIndexById } from '../utils/node';
import { createRfEdge } from '../utils/edge';
import { gettext } from '../../utils/constants';

const WorkflowContext = createContext();

const NODE_UPDATE_TYPES = ['dimensions', 'remove', 'position'];
const EDGE_UPDATE_TYPES = ['remove'];

export const WorkflowProvider = ({ children }) => {
  const { selectedWorkflowId, workflows, workflowEventBus, modifyWorkflow, addNewWorkflow } = useWorkflows();
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const { zoom } = useViewport();

  const [isChanged, setIsChanged] = useState(false);
  const [connectingSource, setConnectingSource] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);

  const isInitNodesRef = useRef(false);
  const cachedSelectedWorkflowIdRef = useRef('');

  const handleNodesChange = useCallback((changes) => {
    if (!isInitNodesRef.current) {
      isInitNodesRef.current = true;
    } else {
      const hasNodeUpdates = changes.some(change => NODE_UPDATE_TYPES.includes(change.type));
      if (hasNodeUpdates) {
        setIsChanged(true);
      }
    }

    return setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot));
  }, [setNodes]);

  const handleEdgesChange = useCallback((changes) => {
    const hasEdgeUpdates = changes.some(change => EDGE_UPDATE_TYPES.includes(change.type));
    if (hasEdgeUpdates) {
      setIsChanged(true);
    }
    setIsChanged(true);
    setEdges((eds) => {
      const newEds = eds.map((e) => {
        const change = changes.find((c) => c.id === e.id);
        if (!change) return e;
        if (change.selected !== undefined) {
          return {
            ...e,
            selected: change.selected,
            zIndex: change.selected ? 1 : 0,
            markerEnd: {
              ...e.markerEnd,
              color: change.selected ? 'var(--bs-workflow-edge-selected-color)' : 'var(--bs-workflow-edge-color)',
            },
          };
        }
        return e;
      });
      return applyEdgeChanges(changes, newEds);
    });
  }, [setEdges]);

  const handleConnect = useCallback((params) => {
    const { source: sourceNodeId, sourceHandle: sourceHandleId, target: targetNodeId } = params;
    const targetNode = getNodeById(targetNodeId, nodes);
    if (!targetNode || targetNode.type === NODE_TYPE.TRIGGER) {
      // disabled connect to trigger node
      return;
    }
    const sourceNode = getNodeById(sourceNodeId, nodes);
    const sourceHandles = sourceNode?.data?.rf_source_handles;
    const sourceHandle = getNodeHandleById(sourceHandleId, sourceHandles);
    if (!sourceHandle) return;

    const edsIds = edges.map(e => e.id);
    const newEdgeId = generatorUniqueBase64Code(4, edsIds);
    setIsChanged(true);
    return setEdges((edgesSnapshot) => {
      const newEdge = createRfEdge({ id: newEdgeId, source: sourceNodeId, sourceHandle: sourceHandleId, target: targetNodeId, label: sourceHandle.label });
      return addEdge(newEdge, edgesSnapshot);
    });
  }, [setEdges, nodes, edges]);

  const handleConnectEnd = useCallback((event, params) => {
    const { fromNode, fromHandle, toNode } = params;
    if (!toNode) {
      // wait to add node
      setConnectingSource({ sourceNodeId: fromNode.id, sourceHandleId: fromHandle.id, position: screenToFlowPosition({ x: event.clientX, y: event.clientY }) });
      return;
    }
  }, [screenToFlowPosition]);

  const handleSetNoneEditingNode = useCallback(() => {
    setEditingNodeId(null);
  }, []);

  const handleSetNoneConnectingSource = useCallback(() => {
    setConnectingSource(null);
  }, []);

  const handleSetEditingNode = useCallback((nodeId) => {
    if (connectingSource) {
      handleSetNoneConnectingSource();
    }
    setEditingNodeId(nodeId);
  }, [handleSetNoneConnectingSource, connectingSource]);

  const handleSetConnectingSource = useCallback((connectingSource) => {
    if (editingNodeId) {
      handleSetNoneEditingNode();
    }
    setConnectingSource(connectingSource);
  }, [handleSetNoneEditingNode, editingNodeId]);

  const addNode = useCallback(({ type, config_id }) => {
    const { sourceNodeId, sourceHandleId, position } = connectingSource;
    const ndsIds = nodes.map(n => n.id);
    const newNodeId = generatorUniqueBase64Code(4, ndsIds);
    const sourceNode = getNodeById(sourceNodeId, nodes);
    const sourceHandles = sourceNode?.data?.rf_source_handles;
    const sourceHandlesCount = Array.isArray(sourceHandles) ? sourceHandles.length : 0;
    const sourceHandle = getNodeHandleById(sourceHandleId, sourceHandles);
    let newNodePosition = position;
    if (!newNodePosition && sourceNode && sourceHandle) {
      const { position: sourceNodePosition, measured } = sourceNode;
      const sourceHandleIndex = sourceHandles.indexOf(sourceHandle);
      const positions = calculateNextNodePositionsFromHandles(sourceNodePosition.x, sourceNodePosition.y, measured.width, sourceHandlesCount);
      newNodePosition = positions[sourceHandleIndex];
    }
    newNodePosition = findBlankPosition(newNodePosition, nodes);
    const newNode = createRfNode({ id: newNodeId, type, position: newNodePosition || DEFAULT_NODE_POSITION, data: { config_id } });
    let newNodes = nodes.filter(n => n.id !== NODE_TYPE.ADD_NODE_PLACEHOLDER).map(n => {
      return n.selected ? { ...n, selected: false } : n;
    });
    newNodes.push({ ...newNode, selected: true });
    setNodes(newNodes);
    handleSetEditingNode(newNodeId);

    if (type === NODE_TYPE.TRIGGER) {
      // not support connect new trigger node
      return;
    }
    if (sourceNode && sourceHandle) {
      const edsIds = edges.map(e => e.id);
      const newEdgeId = generatorUniqueBase64Code(4, edsIds);
      const newEdge = createRfEdge({ id: newEdgeId, source: sourceNodeId, sourceHandle: sourceHandleId, target: newNode.id, label: sourceHandle.label });
      setEdges((eds) => [...eds, newEdge]);
    }
  }, [setNodes, setEdges, handleSetEditingNode, nodes, edges, connectingSource]);

  const modifyNodeParams = useCallback((nodeId, paramUpdates) => {
    const index = getNodeIndexById(nodeId, nodes);
    if (index < 0) return;
    let newNode = deepCopy(nodes[index]);
    if (!newNode.data) {
      newNode.data = {};
    }
    newNode.data.params = Object.assign({}, newNode.data?.params, paramUpdates);
    let newNodes = [...nodes];
    newNodes[index] = newNode;
    setIsChanged(true);
    setNodes(newNodes);
  }, [setNodes, nodes]);

  const saveChanges = useCallback(({ successCallback, failCallback }) => {
    const triggerNode = nodes.find(n => n.type === NODE_TYPE.TRIGGER);
    const triggerFrom = triggerNode?.data?.config_id || '';
    const graph = { nodes, edges };
    if (!selectedWorkflowId) {
      addNewWorkflow(
        { graph, trigger_from: triggerFrom, name: gettext('Untitled workflow') },
        {
          successCallback: () => {
            setIsChanged(false);
            successCallback && successCallback();
          },
          failCallback,
        }
      );
    } else {
      modifyWorkflow(
        selectedWorkflowId,
        { graph, trigger_from: triggerFrom },
        {
          successCallback: () => {
            setIsChanged(false);
            successCallback && successCallback();
          },
          failCallback,
        }
      );
    }

  }, [modifyWorkflow, addNewWorkflow, selectedWorkflowId, nodes, edges]);

  useEffect(() => {
    const unsubscribeSetConnectingSource = workflowEventBus.subscribe(EVENT_BUS_TYPE.SHOW_ADD_NODE, handleSetConnectingSource);
    return () => {
      unsubscribeSetConnectingSource();
    };
  }, [workflowEventBus, handleSetConnectingSource]);

  useEffect(() => {
    const unsubscribeSetEditingNode = workflowEventBus.subscribe(EVENT_BUS_TYPE.SHOW_NODE_SETTINGS, handleSetEditingNode);
    return () => {
      unsubscribeSetEditingNode();
    };
  }, [workflowEventBus, handleSetEditingNode]);

  useEffect(() => {
    if (selectedWorkflowId !== cachedSelectedWorkflowIdRef.current) {
      // process graph while switch workflow
      cachedSelectedWorkflowIdRef.current = selectedWorkflowId;
      const selectedWorkflow = getWorkflowById(selectedWorkflowId, workflows);
      const graph = normalizeWorkflowGraph(selectedWorkflow?.graph);
      const { nodes, edges } = graph;
      let initialNodes = [...nodes];
      let initialEdges = [...edges];
      if (initialNodes.length === 0) {
        initialNodes.push(createAddTriggerPlaceholderNode());
      }
      isInitNodesRef.current = false;
      setIsChanged(false);
      setEdges(initialEdges);
      setNodes(initialNodes);
      fitView({ maxZoom: 1, minZoom: 1 });
    }
  }, [selectedWorkflowId, workflows, setNodes, setEdges, fitView]);

  useEffect(() => {
    if (isChanged && nodes.length === 0) {
      setNodes([createAddTriggerPlaceholderNode()]);
    }
  }, [isChanged, nodes, setNodes]);

  useEffect(() => {
    window.onbeforeunload = (event) => {
      if (isChanged) {
        event.preventDefault();
        event.returnValue = gettext('If you don\'t save, you will lose your changes.'); // compatible old browsers
        return;
      }
    };
    return () => {
      window.onbeforeunload = null;
    };
  }, [saveChanges, isChanged]);

  return (
    <WorkflowContext.Provider value={{
      zoom,
      nodes,
      edges,
      isChanged,
      connectingSource,
      editingNodeId,
      setNodes,
      setEdges,
      handleSetNoneEditingNode,
      handleSetEditingNode,
      handleSetConnectingSource,
      handleSetNoneConnectingSource,
      handleNodesChange,
      handleEdgesChange,
      handleConnect,
      handleConnectEnd,
      addNode,
      modifyNodeParams,
      saveChanges,
    }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('\'WorkflowContext\' is null');
  return context;
};
