import { useCallback } from 'react';
import {
  ReactFlow, Background, MiniMap,
  applyNodeChanges, applyEdgeChanges, addEdge, useViewport,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import CustomControls from './custom-controls';
import CustomNode from './nodes/custom-node';
import CustomEdge from './custom-edge';
import CustomConnectionLine from './custom-connection-line';
import { MAX_ZOOM, MIN_ZOOM, STROKE_WIDTH } from './constants/canvas';
import { createAddTriggerPlaceholderNode, createConditionNode, createFileUploadNode, createSetStatusNode } from './utils/node';

import '@xyflow/react/dist/style.css';
import './canvas.css';

const THRESHOLD = 6; // 吸附阈值

// 计算吸附位置
const computeSnap = (dragNode, allNodes) => {
  const w = dragNode.width;
  const h = dragNode.height;

  let x = dragNode.position.x;
  let y = dragNode.position.y;

  allNodes.forEach((n) => {
    if (n.id === dragNode.id) return;

    const nw = n.width;
    const nh = n.height;

    // 中心点
    const dragCenterX = x + w / 2;
    const dragCenterY = y + h / 2;
    const otherCenterX = n.position.x + nw / 2;
    const otherCenterY = n.position.y + nh / 2;

    // X 对齐（中心 / 左 / 右）
    if (Math.abs(dragCenterX - otherCenterX) < THRESHOLD) {
      x = otherCenterX - w / 2;
    }
    if (Math.abs(x - n.position.x) < THRESHOLD) {
      x = n.position.x;
    }
    if (Math.abs(x + w - (n.position.x + nw)) < THRESHOLD) {
      x = n.position.x + nw - w;
    }

    // Y 对齐（中心 / 上 / 下）
    if (Math.abs(dragCenterY - otherCenterY) < THRESHOLD) {
      y = otherCenterY - h / 2;
    }
    if (Math.abs(y - n.position.y) < THRESHOLD) {
      y = n.position.y;
    }
    if (Math.abs(y + h - (n.position.y + nh)) < THRESHOLD) {
      y = n.position.y + nh - h;
    }
  });

  return { x, y };
};


const nodeTypes = {
  custom: CustomNode,
  // add_trigger_placeholder: AddTriggerPlaceholder,
  // trigger: TriggerAddFile,
};

const edgeTypes = {
  custom: CustomEdge,
};

const initialNodes = [
  // {
  //   id: '1',
  //   type: 'input',
  //   data: { label: 'Node 1' },
  //   position: { x: 0, y: 25 },
  //   sourcePosition: Position.Right,
  // },
  // {
  //   id: '2',
  //   type: 'custom',
  //   data: {},
  //   position: { x: 250, y: 50 },
  // },
  // {
  //   id: '3',
  //   type: 'input',
  //   data: { label: 'Node 2' },
  //   position: { x: 0, y: 0 },
  //   sourcePosition: Position.Right,
  // },
];
// const fileUploadNode = createFileUploadNode();
// initialNodes.push(createAddTriggerPlaceholderNode());
// initialNodes.push(fileUploadNode);
initialNodes.push(createConditionNode());
initialNodes.push(createSetStatusNode(1, { x: 360, y: -80 }));
initialNodes.push(createSetStatusNode(2, { x: 360, y: 80 }));
const initialEdges = [
  {
    id: 'e1-2',
    source: 'if_else',
    sourceHandle: 'output-1',
    target: 'set_status1',
    // targetHandle: 'in',
    animated: false,
    data: {
      startLabel: 'true',
    },
    markerEnd: {
      type: MarkerType.Arrow,
      color: 'var(--bs-workflow-edge-color)',
      strokeWidth: STROKE_WIDTH,
    },
    type: 'custom',
  },
  {
    id: 'e1-3',
    source: 'if_else',
    sourceHandle: 'output-2',
    target: 'set_status2',
    animated: false,
    data: {
      startLabel: 'false',
    },
    markerEnd: {
      type: MarkerType.Arrow,
      color: 'var(--bs-workflow-edge-color)',
      strokeWidth: STROKE_WIDTH,
    },
    type: 'custom',
  },
];

const WorkflowCanvas = () => {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  const { zoom } = useViewport();

  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [setNodes],
  );

  const handleEdgesChange = (changes) => {
    setEdges((eds) => {
      const newEds = eds.map((e) => {
        const change = changes.find((c) => c.id === e.id);
        if (!change) return e;
        if (change.selected !== undefined) {
          // 根据 selected 状态修改箭头颜色
          return {
            ...e,
            selected: change.selected,
            zIndex: change.selected ? 1 : 0,
            markerEnd: {
              ...e.markerEnd,
              color: change.selected ? 'var(--bs-workflow-edge-selected-color)' : '#bdbdbd',
            },
          };
        }
        return e;
      });
      return applyEdgeChanges(changes, newEds);
    });
  };

  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) =>
      addEdge({
        ...params, animated: false,
        data: {
          endLabel: 'false',
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: 'var(--bs-workflow-edge-color)',
          strokeWidth: STROKE_WIDTH,
        },
        type: 'custom'
      }, edgesSnapshot)),
    [setEdges],
  );

  // 拖拽中：实时吸附
  const onNodeDrag = useCallback(
    (_, node) => {
      const { x, y } = computeSnap(node, nodes);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, position: { x, y } } : n
        )
      );
    },
    [nodes, setNodes]
  );

  // 松手时：再吸附一次，保证最终位置
  const onNodeDragStop = useCallback(
    (_, node) => {
      const { x, y } = computeSnap(node, nodes);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, position: { x, y } } : n
        )
      );
    },
    [nodes, setNodes]
  );

  const onEdgeMouseEnter = (event, edge) => {
    setEdges((eds) => {
      return eds.map((e) => {
        if (e.id !== edge.id) return e;
        const newE = { ...e, data: Object.assign({}, e.data, { hovered: true }) };
        if (edge.selected) {
          return newE;
        }
        return { ...newE, zIndex: 1, markerEnd: { ...e.markerEnd, color: 'var(--bs-workflow-edge-hover-color)' } };
      });
    }
    );
  };

  const onEdgeMouseLeave = (event, edge) => {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== edge.id) return e;
        const newE = { ...e, data: Object.assign({}, e.data, { hovered: false }) };
        if (edge.selected) {
          return newE;
        }
        return { ...newE, zIndex: 0, markerEnd: { ...e.markerEnd, color: 'var(--bs-workflow-edge-color)' } };
      })
    );
  };

  return (
    <div className="workflow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
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
        selectionOnDrag={true}
        multiSelectionKeyCode={null}
        attributionPosition="bottom-left"
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
      >
        <MiniMap
          position="bottom-left"
          style={{
            width: 200,
            height: 120,
            bottom: 53,
            border: '1px solid #eaeaea'
          }}
          bgColor="#f5f5f5"
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
    </div>
  );
};

export default WorkflowCanvas;
