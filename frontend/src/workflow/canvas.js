import { useCallback, useRef } from 'react';
import { ReactFlow, Background, MiniMap } from '@xyflow/react';
import { UncontrolledTooltip } from 'reactstrap';
import CustomControls from './custom-controls';
import AddNodePlaceholder from './nodes/add-node-placeholder';
import TriggerNode from './nodes/trigger-node';
import ConditionNode from './nodes/condition-node';
import ActionNode from './nodes/action-node';
import CustomEdge from './custom-edge';
import CustomConnectionLine from './custom-connection-line';
import WorkflowSettingsAddNode from './settings/add-node';
import WorkflowNodeSettings from './settings/node-settings';
import { MAX_ZOOM, MIN_ZOOM } from './constants/canvas';
import { calculateDragNodeSnap } from './utils/node';
import { DEFAULT_NODE_POSITION, NODE_TYPE } from './constants/node';
import { EDGE_TYPE } from './constants/edge';
import { useWorkflow } from './hooks/workflow';
import { gettext } from '../utils/constants';

import '@xyflow/react/dist/style.css';
import './canvas.css';

const nodeTypes = {
  [NODE_TYPE.ADD_NODE_PLACEHOLDER]: AddNodePlaceholder,
  [NODE_TYPE.TRIGGER]: TriggerNode,
  [NODE_TYPE.CONDITION]: ConditionNode,
  [NODE_TYPE.ACTION]: ActionNode,
};

const edgeTypes = {
  [EDGE_TYPE.CUSTOM]: CustomEdge,
};

const WorkflowCanvas = () => {
  const {
    zoom, nodes, edges, connectingSource, editingNodeId, setNodes, setEdges,
    handleSetNoneEditingNode, handleSetConnectingSource, handleSetNoneConnectingSource, handleNodesChange, handleEdgesChange,
    handleConnect, handleConnectEnd, addNode,
  } = useWorkflow();

  const addNodeControlBtnRef = useRef(null);

  const handleNodeDrag = useCallback((_, node) => {
    const { x, y } = calculateDragNodeSnap(node, nodes);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, position: { x, y } } : n
      )
    );
  }, [nodes, setNodes]);

  const handleNodeDragStop = useCallback((_, node) => {
    const { x, y } = calculateDragNodeSnap(node, nodes);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, position: { x, y } } : n
      )
    );
  }, [nodes, setNodes]);

  const handleEdgeMouseEnter = useCallback((_, edge) => {
    setEdges((eds) => {
      return eds.map((e) => {
        if (e.id !== edge.id || edge.selected) return e;
        return {
          ...e,
          data: Object.assign({}, e.data, { hovered: true }),
          markerEnd: { ...e.markerEnd, color: 'var(--bs-workflow-edge-hover-color)' } // set marker-end hover color
        };
      });
    });
  }, [setEdges]);

  const handleEdgeMouseLeave = useCallback((_, edge) => {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== edge.id || edge.selected) return e;
        return {
          ...e,
          zIndex: 0,
          data: Object.assign({}, e.data, { hovered: false }),
          markerEnd: { ...e.markerEnd, color: 'var(--bs-workflow-edge-color)' } // restore marker-end color
        };
      })
    );
  }, [setEdges]);

  return (
    <div className="workflow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ maxZoom: 1, minZoom: 1 }}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineComponent={CustomConnectionLine}
        colorMode="light"
        panOnScroll={true}
        panOnDrag={false}
        selectionOnDrag={false}
        selectionKeyCode={false}
        multiSelectionKeyCode={null}
        attributionPosition="bottom-left"
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
      >
        <MiniMap
          position="bottom-left"
          style={{
            width: 200,
            height: 120,
            bottom: 53,
            border: '1px solid #eaeaea'
          }}
          zoomable
          pannable
          nodeColor={(node) => node.data?.color}
        />
        <CustomControls />
        <Background
          className="workflow-canvas-bg"
          gap={[14 / zoom, 14 / zoom]}
          size={1 / zoom}
          color="var(--bs-workflow-canvas-dot-color)"
        />
      </ReactFlow>
      <div className="workflow-node-button-wrapper">
        <div className="workflow-custom-control-button" ref={addNodeControlBtnRef} onClick={() => handleSetConnectingSource({ position: DEFAULT_NODE_POSITION })}><i className="sf3-font-new sf3-font"></i></div>
        <UncontrolledTooltip
          target={addNodeControlBtnRef}
          hidden={connectingSource}
          placement="left"
          trigger="hover"
          delay={{ show: 300, hide: 0 }}
          fade={false}
          hideArrow={true}
        >
          {gettext('Add node')}
        </UncontrolledTooltip>
      </div>
      {connectingSource && (
        <WorkflowSettingsAddNode addNode={addNode} closePanel={handleSetNoneConnectingSource} />
      )}
      {editingNodeId && (
        <WorkflowNodeSettings closePanel={handleSetNoneEditingNode} />
      )}
    </div>
  );
};

export default WorkflowCanvas;
