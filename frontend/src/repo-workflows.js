import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import ReactFlow, {
  MiniMap,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import workflowAPI from './utils/workflow-api';
import { metadataAPI } from './metadata';
import Icon from './components/icon';
import toaster from './components/toast';


const globalStyles = `
  .react-flow__wrapper {
    width: 100% !important;
    height: 100% !important;
  }
  .react-flow__renderer {
    width: 100% !important;
    height: 100% !important;
  }
  .workflow-container {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }
`;

if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = globalStyles;
  document.head.appendChild(styleElement);
}

// Simplified node configuration
const nodeConfigs = {
  trigger: [
    {
      id: 'file_upload',
      name: 'file upload',
      description: 'Execute when the corresponding action occurs',
      icon: <Icon symbol="file" style={{ width: 16, height: 16 }} />
    }
  ],
  condition: [
    {
      id: 'if_else',
      name: 'If-Else condition',
      description: 'Branch based on condition',
      icon: <Icon symbol="more-level" style={{ width: 16, height: 16 }} />,
      params: [
        {
          id: 'file_type',
          name: 'options',
          label: 'file type',
          type: 'select',
          options: [
            { id: 'sdoc', label: 'sdoc' },
            { id: 'pdf', label: 'pdf' },
            { id: 'docx', label: 'docx' },
            { id: 'pptx', label: 'pptx' },
            { id: 'xlsx', label: 'xlsx' },
            { id: 'txt', label: 'txt' },
            { id: 'jpg', label: 'jpg' },
            { id: 'jpeg', label: 'jpeg' },
            { id: 'png', label: 'png' },
            { id: 'gif', label: 'gif' }
          ],
          default: 'pdf'
        }
      ]
    }
  ],
  action: [
    {
      id: 'set_status',
      name: 'Set file status',
      description: 'Change the file status tag',
      icon: <Icon symbol="send" style={{ width: 16, height: 16 }} />,
      params: [
        {
          id: 'status',
          name: 'status',
          label: 'File status',
          type: 'select',
        }
      ]
    }
  ]
};

// Node types list
const nodeTypesList = [
  { type: 'trigger', label: '触发器', color: '#f59e0b', icon: <Icon symbol="monitor" style={{ width: 16, height: 16 }} />, description: '工作流开始节点' },
  { type: 'condition', label: '判断条件', color: '#60a5fa', icon: <Icon symbol="more-level" style={{ width: 16, height: 16 }} />, description: 'If-Else 分支' },
  { type: 'action', label: '执行动作', color: '#a78bfa', icon: <Icon symbol="send" style={{ width: 16, height: 16 }} />, description: '设置文件状态' },
];

// Node styles
const nodeTypeStyles = {
  trigger: {
    background: '#ffffff',
    border: '2px solid #f59e0b',
    color: '#a16207'
  },
  condition: {
    background: '#ffffff',
    border: '2px solid #60a5fa',
    color: '#1d4ed8'
  },
  action: {
    background: '#ffffff',
    border: '2px solid #a78bfa',
    color: '#6d28d9'
  },
};

// Node configuration panel
function NodeConfigPanel({ node, onConfigChange, onDelete, onAddIfBranch, onAddElseBranch, statusOptions }) {
  const [selectedConfigId, setSelectedConfigId] = useState(node?.data?.configId || '');
  const [configParams, setConfigParams] = useState(node?.data?.params || {});

  const nodeType = node?.type;
  const baseConfigs = nodeConfigs[nodeType] || [];
  const availableConfigs = baseConfigs.map(cfg => {
    if (nodeType === 'action') {
      const newParams = (cfg.params || []).map(p => {
        if (p.name === 'status') {
          return { ...p, options: Array.isArray(statusOptions) ? statusOptions : [] };
        }
        return p;
      });
      return { ...cfg, params: newParams };
    }
    return cfg;
  });
  const selectedConfig = availableConfigs.find(c => c.id === selectedConfigId);

  useEffect(() => {
    setSelectedConfigId(node?.data?.configId || '');
    setConfigParams(node?.data?.params || {});
  }, [node]);

  const handleConfigSelect = useCallback((configId) => {
    setSelectedConfigId(configId);
    const config = availableConfigs.find(c => c.id === configId);
    if (config) {
      const defaultParams = {};
      config.params?.forEach(param => {
        if (param.default !== undefined) {
          const paramKey = param.id || param.name;
          defaultParams[paramKey] = param.default;
        }
      });
      setConfigParams(defaultParams);
      onConfigChange(configId, defaultParams);
    }
  }, [availableConfigs, onConfigChange]);

  const handleParamChange = useCallback((paramKey, value) => {
    const newParams = { ...configParams, [paramKey]: value };
    setConfigParams(newParams);
    onConfigChange(selectedConfigId, newParams);
  }, [configParams, selectedConfigId, onConfigChange]);

  const renderParamInput = (param) => {
    const paramKey = param.id || param.name;
    const value = configParams[paramKey] ?? param.default ?? '';

    switch (param.type) {
      case 'select': {
        const normalizedOptions = (param.options || []).map(opt =>
          typeof opt === 'string' ? { id: opt, label: opt } : opt
        );
        return (
          <select
            value={value}
            onChange={(e) => handleParamChange(paramKey, e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              fontSize: 14
            }}
          >
            {normalizedOptions.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        );
      }
      default: // text
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleParamChange(paramKey, e.target.value)}
            placeholder={param.placeholder}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              fontSize: 14
            }}
          />
        );
    }
  };

  if (!node) {
    return (
      <div style={{
        background: 'white',
        padding: 32,
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        textAlign: 'center',
        color: '#9ca3af'
      }}>
        <Icon symbol="set-up" style={{ width: 32, height: 32, marginBottom: 16, opacity: 0.5 }} />
        <div style={{ fontSize: 16, marginBottom: 8 }}>Select a node to configure</div>
        <div style={{ fontSize: 14, lineHeight: 1.4 }}>
          Drag a node from the left onto the canvas to start building the workflow
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', padding: 20, borderRadius: 8, border: '1px solid #e5e7eb' }}>
      {/* Node basic info */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8
        }}>
          {nodeTypesList.find(n => n.type === node.type)?.icon}
          {node.data.label || 'Unnamed node'}
        </div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>
          {nodeTypesList.find(n => n.type === node.type)?.description}
        </div>
      </div>

      {/* Configuration selection */}
      <div style={{ marginBottom: 20 }}>
        <label style={{
          display: 'block',
          fontSize: 14,
          fontWeight: 'bold',
          color: '#374151',
          marginBottom: 8
        }}>
          {node?.type === 'trigger' ? 'Trigger condition' : 'Configuration type'}
        </label>
        <select
          value={selectedConfigId}
          onChange={(e) => handleConfigSelect(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
            background: 'white'
          }}
        >
          <option value="">Select configuration...</option>
          {availableConfigs.map(config => (
            <option key={config.id} value={config.id}>{config.name}</option>
          ))}
        </select>

        {selectedConfig && (
          <div style={{
            background: '#f9fafb',
            padding: 16,
            borderRadius: 6,
            border: '1px solid #e5e7eb',
            marginTop: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              {selectedConfig.icon}
              <span style={{ fontSize: 14, fontWeight: '500' }}>{selectedConfig.name}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>
              {selectedConfig.description}
            </div>
          </div>
        )}
      </div>

      {/* Parameter configuration (not shown for trigger) */}
      {selectedConfig && node?.type !== 'trigger' && selectedConfig.params && selectedConfig.params.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 'bold',
            color: '#374151',
            marginBottom: 12
          }}>
            Parameter settings
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {selectedConfig.params.map(param => (
              <div key={param.name}>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 6
                }}>
                  {param.label}
                </label>
                {renderParamInput(param)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick add branches */}
      {(node?.type === 'condition' || node?.type === 'trigger') && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          background: '#f0f9ff',
          borderRadius: 6,
          border: '1px solid #bae6fd'
        }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#0369a1', marginBottom: 8 }}>
            {node?.type === 'trigger' ? '触发分支' : '条件分支'}
          </div>

          {node?.type === 'trigger' ? (
            /* 触发器分支 - 只有一个主分支 */
            <div>
              <div style={{ fontSize: 12, color: '#0369a1', marginBottom: 6 }}>添加后续节点</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => onAddIfBranch && onAddIfBranch(node, 'action')}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  + 动作节点
                </button>
                <button
                  onClick={() => onAddIfBranch && onAddIfBranch(node, 'condition')}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    background: '#60a5fa',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  + 判断节点
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* If分支 */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#0369a1', marginBottom: 6 }}>If分支（条件为真时）</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => onAddIfBranch && onAddIfBranch(node, 'action')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    + 动作节点
                  </button>
                  <button
                    onClick={() => onAddIfBranch && onAddIfBranch(node, 'condition')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      background: '#60a5fa',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    + 判断节点
                  </button>
                </div>
              </div>

              {/* Else分支 */}
              <div>
                <div style={{ fontSize: 12, color: '#0369a1', marginBottom: 6 }}>Else分支（条件为假时）</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => onAddElseBranch && onAddElseBranch(node, 'action')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    + 动作节点
                  </button>
                  <button
                    onClick={() => onAddElseBranch && onAddElseBranch(node, 'condition')}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    + 判断节点
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={onDelete}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px',
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: '500',
          transition: 'background 0.2s ease'
        }}
        onMouseEnter={e => e.target.style.background = '#dc2626'}
        onMouseLeave={e => e.target.style.background = '#ef4444'}
      >
        <Icon symbol="delete" style={{ width: 16, height: 16 }} />
        Delete Node
      </button>
    </div>
  );
}

// Custom node component
function CustomNode({ data, type, selected }) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || '');

  useEffect(() => {
    setLabel(data.label || '');
  }, [data.label]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    setIsEditing(false);
    if (data.onLabelChange) {
      data.onLabelChange(label);
    }
  }, [label, data]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setLabel(data.label || '');
    }
  }, [handleSave, data.label]);

  const nodeTypeInfo = nodeTypesList.find(n => n.type === type);
  const nodeConfig = data.configId ? nodeConfigs[type]?.find(config => config.id === data.configId) : null;

  const displayIcon = nodeConfig?.icon || nodeTypeInfo?.icon;
  const displayName = nodeConfig?.name || label || `${nodeTypeInfo?.label}`;
  const isConfigured = !!data.configId;

  if (!nodeTypeInfo) {
    return null;
  }

  return (
    <div style={{
      ...nodeTypeStyles[type],
      borderRadius: 10,
      padding: 16,
      minWidth: 180,
      minHeight: 88,
      boxShadow: selected
        ? '0 0 0 3px rgba(245, 158, 11, 0.4), 0 4px 12px rgba(0, 0, 0, 0.08)'
        : '0 2px 8px rgba(0, 0, 0, 0.06)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
      opacity: isConfigured ? 1 : 0.9,
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#cbd5e1',
          width: 8,
          height: 8,
          top: -4
        }}
      />

      {/* Configuration state indicator */}
      {isConfigured && (
        <div style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#10b981',
          boxShadow: '0 0 0 2px white'
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {displayIcon}
        <div style={{ fontSize: 12, fontWeight: 'bold', opacity: 0.7 }}>
          {nodeTypeInfo?.label}
        </div>
      </div>

      {isEditing ? (
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyPress}
          autoFocus
          style={{
            width: '100%',
            border: 'none',
            background: 'rgba(255,255,255,0.9)',
            padding: 6,
            borderRadius: 4,
            fontSize: 14,
            fontWeight: '500'
          }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          style={{
            fontSize: 14,
            fontWeight: '500',
            wordBreak: 'break-word',
            lineHeight: 1.3,
            marginBottom: 6,
            minHeight: 20
          }}
        >
          {displayName}
        </div>
      )}

      {!isConfigured && (
        <div style={{
          fontSize: 11,
          color: '#ef4444',
          fontWeight: '500',
          textAlign: 'center'
        }}>
          Click to configure →
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#cbd5e1',
          width: 8,
          height: 8,
          bottom: -4
        }}
      />

      {data.isExecuting && (
        <div style={{
          position: 'absolute',
          top: -3,
          right: -3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#10b981',
          animation: 'pulse 1.5s infinite',
          zIndex: 10
        }} />
      )}
    </div>
  );
}

const nodeTypes = {
  trigger: (props) => <CustomNode {...props} type="trigger" />,
  condition: (props) => <CustomNode {...props} type="condition" />,
  action: (props) => <CustomNode {...props} type="action" />,
};

function RepoWorkflows() {
  const { repoID } = window.app.pageOptions;

  const reactFlowWrapper = useRef(null);

  const shouldFitOnNextLoad = useRef(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [workflowName, setWorkflowName] = useState('My Workflow');
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);

  // page mode: no ESC-close logic

  useEffect(() => {
    if (!repoID) return;
    metadataAPI.getColumnInfo(repoID).then((res) => {
      const columns_info = res.data.columns || [];
      const statusDict = columns_info.find(column => column.key === '_status');
      const result = [];
      statusDict?.data?.options?.forEach(option => {
        if (option?.name) result.push(option.name);
      });
      setStatusOptions(result);
    }).catch(() => {
      setStatusOptions([]);
    });
  }, [repoID]);

  const parseGraphNodesEdges = (wf) => {
    let graph = wf.graph_data || wf.graph;
    if (typeof graph === 'string') {
      try { graph = JSON.parse(graph); } catch (_) { graph = null; }
    }

    if (!graph || typeof graph !== 'object') {
      return { nodes: [], edges: [] };
    }

    const rawNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const rawEdges = Array.isArray(graph?.edges) ? graph.edges : [];

    // Normalize nodes for React Flow
    const nodes = rawNodes
      .filter(n => n && (n.id !== undefined && n.id !== null))
      .map(n => ({
        ...n,
        id: String(n.id),
        type: n.type || 'action',
        position: n.position && typeof n.position.x === 'number' && typeof n.position.y === 'number'
          ? n.position
          : { x: Math.random() * 300, y: Math.random() * 300 },
        data: {
          ...n.data,
          onLabelChange: (newLabel) => {
            setNodes(nds => nds.map(node =>
              node.id === n.id
                ? { ...node, data: { ...node.data, label: newLabel } }
                : node
            ));
          }
        },
      }));

    // Normalize edges for React Flow
    const edges = rawEdges
      .filter(e => e && e.source != null && e.target != null)
      .map(e => ({
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        ...e,
        id: e.id != null ? String(e.id) : `${String(e.source)}-${String(e.target)}`,
        source: String(e.source),
        target: String(e.target),
      }));

    return { nodes, edges };
  };

  const loadWorkflows = useCallback(async () => {
    if (!repoID) return;
    setIsLoading(true);
    try {
      const res = await workflowAPI.listWorkflows(repoID);
      const list = res?.data?.workflows || [];
      setWorkflows(list);
      if (list.length > 0) {
        const wf = list.find(w => w.id === currentWorkflowId) || list[0];
        setCurrentWorkflowId(wf.id);
        setWorkflowName(wf.name);
        const { nodes: nextNodes, edges: nextEdges } = parseGraphNodesEdges(wf);
        setNodes(nextNodes);
        setEdges(nextEdges);
        shouldFitOnNextLoad.current = true;
      } else {
        setCurrentWorkflowId(null);
        setWorkflowName('My workflow');
        setNodes([]);
        setEdges([]);
      }
    } catch (err) {
      toaster.warning(err);
    } finally {
      setIsLoading(false);
    }
  }, [repoID, currentWorkflowId, setNodes, setEdges]);

  useEffect(() => {
    if (repoID) {
      loadWorkflows();
    }
  }, [repoID, loadWorkflows]);

  // Auto fit view only after load/select (not on every small node change)
  useEffect(() => {
    if (!reactFlowInstance) return;
    if (shouldFitOnNextLoad.current) {
      const hasItems = nodes.length > 0 || edges.length > 0;
      if (hasItems) {
        setTimeout(() => {
          try {
            reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
          } catch (e) {
            toaster.warning('FitView failed: ' + e);
          }
          shouldFitOnNextLoad.current = false;
        }, 100);
      } else {
        shouldFitOnNextLoad.current = false;
      }
    }
  }, [nodes, edges, reactFlowInstance]);

  const handleWorkflowSelect = useCallback((wfId) => {
    setCurrentWorkflowId(wfId);
    const wf = workflows.find(w => w.id === wfId);
    if (wf) {
      setWorkflowName(wf.name);
      const { nodes: nextNodes, edges: nextEdges } = parseGraphNodesEdges(wf);
      setNodes(nextNodes);
      setEdges(nextEdges);
      shouldFitOnNextLoad.current = true;
      setSelectedNode(null);
    }
  }, [workflows, setNodes, setEdges]);

  const handleCreateWorkflow = useCallback(async () => {
    if (!repoID) return;
    const name = window.prompt('Enter new workflow name', 'New workflow');
    if (!name) return;
    try {
      const res = await workflowAPI.createWorkflow(repoID, {
        name,
        graph: JSON.stringify({ nodes: [], edges: [] }),
      });
      const newWf = res?.data;
      if (newWf?.id) {
        const nextList = [...workflows, newWf];
        setWorkflows(nextList);
        setCurrentWorkflowId(newWf.id);
        setWorkflowName(newWf.name || 'My Workflow');
        setNodes([]);
        setEdges([]);
      }
    } catch (err) {

      alert('Failed');
    }
  }, [repoID, workflows, setNodes, setEdges]);

  const handleDeleteWorkflow = useCallback(async () => {
    if (!repoID || !currentWorkflowId) return;
    if (!window.confirm('Delete the current workflow?')) return;
    try {
      await workflowAPI.deleteWorkflow(repoID, currentWorkflowId);
      const remaining = workflows.filter(w => w.id !== currentWorkflowId);
      setWorkflows(remaining);
      if (remaining.length > 0) {
        const wf = remaining[0];
        setCurrentWorkflowId(wf.id);
        setWorkflowName(wf.name || 'My workflow');
        const { nodes: nextNodes, edges: nextEdges } = parseGraphNodesEdges(wf);
        setNodes(nextNodes);
        setEdges(nextEdges);
      } else {
        setCurrentWorkflowId(null);
        setWorkflowName('My workflow');
        setNodes([]);
        setEdges([]);
      }
    } catch (err) {

      alert('Failed delete');
    }
  }, [repoID, currentWorkflowId, workflows, setNodes, setEdges]);


  const updateNodeConfig = useCallback((nodeId, configId, params = {}) => {
    setNodes(nds => nds.map(n =>
      n.id === nodeId
        ? {
          ...n,
          data: {
            ...n.data,
            configId,
            params
          }
        }
        : n
    ));
  }, [setNodes]);

  const addConditionBranch = useCallback((sourceNode, branch, nodeType = 'action') => {
    if (!sourceNode) return;

    // 对于触发器节点，检查是否已有后续节点
    if (sourceNode.type === 'trigger') {
      const hasNext = edges.some(e => e.source === sourceNode.id);
      if (hasNext) {
        toaster.warning('触发器节点已有后续节点');
        return;
      }
    } else {
      // 对于条件节点，检查对应分支是否已存在
      const hasBranch = edges.some(e => e.source === sourceNode.id && (branch === 'if' ? e.label === 'True' : e.label === 'False'));
      if (hasBranch) {
        toaster.warning(`${branch === 'if' ? 'If' : 'Else'}分支已存在`);
        return;
      }
    }

    // 计算新节点位置
    let offsetX;
    let offsetY;
    if (sourceNode.type === 'trigger') {
      offsetX = 0;
      offsetY = 120;
    } else {
      offsetX = branch === 'if' ? -80 : 140;
      offsetY = 120;
    }

    const position = {
      x: (sourceNode.position?.x || 0) + offsetX,
      y: (sourceNode.position?.y || 0) + offsetY,
    };

    const id = `${Date.now()}`;
    const nodeTypeInfo = nodeTypesList.find(n => n.type === nodeType);

    let label;
    if (sourceNode.type === 'trigger') {
      label = `${nodeTypeInfo?.label || nodeType}`;
    } else {
      label = `${branch === 'if' ? 'If' : 'Else'} - ${nodeTypeInfo?.label || nodeType}`;
    }

    const newNode = {
      id,
      type: nodeType,
      position,
      data: {
        label,
        onLabelChange: (newLabel) => {
          setNodes(nds => nds.map(node =>
            node.id === id
              ? { ...node, data: { ...node.data, label: newLabel } }
              : node
          ));
        }
      }
    };

    setNodes(nds => [...nds, newNode]);

    const edgeId = `${Date.now()}`;
    let edgeLabel = '';
    if (sourceNode.type === 'condition') {
      edgeLabel = branch === 'if' ? 'True' : 'False';
    }

    setEdges(eds => addEdge({
      id: edgeId,
      source: sourceNode.id,
      target: id,
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
      label: edgeLabel
    }, eds));
  }, [edges, setNodes, setEdges]);

  const onDragStart = useCallback((event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!reactFlowWrapper.current || !reactFlowInstance) {
      return;
    }

    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');

    if (!type) {
      return;
    }

    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    const id = `${Date.now()}`;
    const nodeType = nodeTypesList.find(n => n.type === type);
    const label = `${nodeType?.label || 'Node'}`;

    const newNode = {
      id,
      type,
      position,
      data: {
        label,
        onLabelChange: (newLabel) => {
          setNodes(nds => nds.map(node =>
            node.id === id
              ? { ...node, data: { ...node.data, label: newLabel } }
              : node
          ));
        }
      },
    };

    setNodes(nds => [...nds, newNode]);
  }, [reactFlowInstance, setNodes]);

  const onDragOverCanvas = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const onConnect = useCallback((params) => {
    const newEdge = {
      ...params,
      id: `${Date.now()}`,
      animated: true,
      style: {
        stroke: '#6366f1',
        strokeWidth: 2
      },
    };
    setEdges(eds => addEdge(newEdge, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDelete = useCallback(() => {
    if (!selectedNode) return;

    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [selectedNode, setNodes, setEdges]);


  const saveWorkflow = useCallback(async () => {
    setIsSaving(true);
    const triggerNode = nodes.find(n => n.type === 'trigger');
    const triggerFrom = triggerNode?.data?.configId || 'file_upload';
    const payload = {
      name: workflowName,
      graph: JSON.stringify({ nodes, edges }),
      trigger_from: triggerFrom,
    };

    try {
      if (currentWorkflowId) {
        await workflowAPI.updateWorkflow(repoID, currentWorkflowId, payload);
      } else {
        const res = await workflowAPI.createWorkflow(repoID, payload);
        const newId = res?.data?.id;
        if (newId) setCurrentWorkflowId(newId);
      }
      toaster.success('Workflow saved');
    } catch (err) {
      toaster.warning('Failed');
    } finally {
      setIsSaving(false);
    }
  }, [repoID, workflowName, nodes, edges, currentWorkflowId]);


  return (
    <div
      className="workflow-container"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 1000
      }}
    >
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#fff'
      }}>
        {/* Header toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#fff',
          color: '#111827',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              Files / 工作流 / {workflowName || '未命名'}
            </div>
            <select
              value={currentWorkflowId || ''}
              onChange={(e) => handleWorkflowSelect(e.target.value)}
              disabled={isLoading}
              style={{
                padding: '6px 10px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                color: '#111827',
                borderRadius: 6,
                fontSize: 14,
                minWidth: 160
              }}
            >
              {workflows.length === 0 && <option value="">No Workflow</option>}
              {workflows.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <button
              onClick={handleCreateWorkflow}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', background: '#fff',
                color: '#111827', border: '1px solid #e5e7eb',
                borderRadius: 6, cursor: 'pointer', fontSize: 14
              }}
              title="新增工作流"
            >
              <Icon symbol="plus_sign" style={{ width: 16, height: 16 }} /> 新增
            </button>
            {currentWorkflowId && (
              <button
                onClick={handleDeleteWorkflow}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 12px', background: '#fff',
                  color: '#ef4444', border: '1px solid #fecaca',
                  borderRadius: 6, cursor: 'pointer', fontSize: 14
                }}
                title="删除当前工作流"
              >
                <Icon symbol="delete" style={{ width: 16, height: 16 }} /> 删除
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={saveWorkflow}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: isSaving ? '#f59e0b' : '#f59e0b',
                color: '#fff',
                border: '1px solid #f59e0b',
                borderRadius: 6,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                fontSize: 14
              }}
            >
              {isSaving ? <Icon symbol="spinner" style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Icon symbol="save" style={{ width: 16, height: 16 }} />}
              保存
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
          {/* Left: Workflow list */}
          <div style={{
            width: 240,
            borderRight: '1px solid #e5e7eb',
            background: 'white',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: 12, fontWeight: 'bold', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>工作流</div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {workflows.map(w => (
                <div
                  key={w.id}
                  onClick={() => handleWorkflowSelect(w.id)}
                  style={{
                    padding: '10px 12px 10px 10px',
                    cursor: 'pointer',
                    background: w.id === currentWorkflowId ? '#f9fafb' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderLeft: w.id === currentWorkflowId ? '3px solid #f59e0b' : '3px solid transparent'
                  }}
                >
                  <Icon symbol="link" style={{ width: 14, height: 14, opacity: 0.7 }} />
                  <span style={{ fontSize: 14, color: '#374151' }}>{w.name}</span>
                </div>
              ))}
              {workflows.length === 0 && (
                <div style={{ padding: 12, color: '#9ca3af' }}>暂无工作流</div>
              )}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #f3f4f6' }}>
              <button onClick={handleCreateWorkflow} style={{ width: '100%', padding: '10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, fontSize: 14 }}>增加工作流</button>
            </div>
          </div>

          <div
            ref={reactFlowWrapper}
            style={{
              flex: 1,
              height: '100%',
              minHeight: '600px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ReactFlowProvider>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={(instance) => {
                  setReactFlowInstance(instance);
                }}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onDrop={onDrop}
                onDragOver={onDragOverCanvas}
                fitView={nodes.length === 0}
                fitViewOptions={{ padding: 0.1, duration: 300 }}
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#fff'
                }}
                connectionLineStyle={{
                  stroke: '#d1d5db',
                  strokeWidth: 2,
                }}
                defaultEdgeOptions={{
                  animated: true,
                  style: { stroke: '#6366f1', strokeWidth: 2 }
                }}
                proOptions={{ hideAttribution: true }}
              >
                <MiniMap
                  style={{
                    background: '#fff',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb'
                  }}
                  nodeColor={(node) => nodeTypesList.find(n => n.type === node.type)?.color || '#6b7280'}
                />
                <Background color="#e5e7eb" gap={24} size={1} variant="dots" />

                <Panel position="bottom-center">
                  <div style={{ display: 'flex', gap: 8, background: 'transparent' }}>
                    <button
                      onClick={() => reactFlowInstance && reactFlowInstance.fitView({ padding: 0.2 })}
                      style={{ padding: '6px 8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}
                      title="自适应"
                    >
                      ⤢
                    </button>
                    <button
                      onClick={() => reactFlowInstance && reactFlowInstance.zoomIn?.()}
                      style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}
                      title="放大"
                    >
                      +
                    </button>
                    <button
                      onClick={() => reactFlowInstance && reactFlowInstance.zoomOut?.()}
                      style={{ padding: '6px 10px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}
                      title="缩小"
                    >
                      −
                    </button>
                    <button
                      onClick={() => reactFlowInstance && reactFlowInstance.setViewport?.({ x: 0, y: 0, zoom: 1 }, { duration: 300 })}
                      style={{ padding: '6px 8px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}
                      title="重置"
                    >
                      ⌂
                    </button>
                  </div>
                </Panel>

                <Panel position="top-center">
                  <div style={{
                    background: 'rgba(255,255,255,0.95)',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    节点: {nodes.length} • 连线: {edges.length} • 已配置: {nodes.filter(n => n.data.configId).length}
                  </div>
                </Panel>

                {nodes.length === 0 && (
                  <Panel position="center">
                    <div style={{
                      background: 'rgba(255,255,255,0.95)',
                      padding: 32,
                      borderRadius: 12,
                      textAlign: 'center',
                      color: '#6b7280',
                      border: '2px dashed #d1d5db',
                      maxWidth: 400
                    }}>
                      <Icon symbol="monitor" style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.5 }} />
                      <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                        + 增加节点
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                        从右侧拖拽节点到画布开始搭建工作流<br/>
                        当前工作流: {workflowName}<br/>
                        节点数: {nodes.length} | 边数: {edges.length}
                      </div>
                    </div>
                  </Panel>
                )}
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          {/* Right: Node library and configuration */}
          <div style={{
            width: 360,
            borderLeft: '1px solid #e5e7eb',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{ padding: 12, fontWeight: 'bold', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>节点库</div>
            <div style={{ padding: 12, overflowY: 'auto', maxHeight: 260 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {nodeTypesList.map(node => (
                  <div
                    key={node.type}
                    style={{
                      ...nodeTypeStyles[node.type],
                      borderRadius: 8,
                      padding: 12,
                      cursor: 'grab',
                      userSelect: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                    }}
                    draggable={true}
                    onDragStart={e => {
                      onDragStart(e, node.type);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {node.icon}
                      <span style={{ fontWeight: 'bold', fontSize: 14 }}>
                        {node.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.4 }}>
                      {node.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 12, fontWeight: 'bold', color: '#374151', borderTop: '1px solid #f3f4f6' }}>节点配置</div>
            <div style={{ padding: 12, overflowY: 'auto', flex: 1 }}>
              <NodeConfigPanel
                node={selectedNode}
                onConfigChange={(configId, params) => updateNodeConfig(selectedNode?.id, configId, params)}
                onDelete={onDelete}
                onAddIfBranch={(node, nodeType) => addConditionBranch(node, 'if', nodeType)}
                onAddElseBranch={(node, nodeType) => addConditionBranch(node, 'else', nodeType)}
                statusOptions={statusOptions}
              />

              <div style={{
                marginTop: 12,
                background: '#f9fafb',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 'bold', color: '#374151' }}>
                  工作流统计
                </h4>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>触发器:</span>
                    <span>{nodes.filter(n => n.type === 'trigger').length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>条件节点:</span>
                    <span>{nodes.filter(n => n.type === 'condition').length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>动作节点:</span>
                    <span>{nodes.filter(n => n.type === 'action').length}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <span>配置完成:</span>
                    <span style={{
                      color: nodes.length > 0 && nodes.every(n => n.data.configId) ? '#10b981' : '#ef4444'
                    }}>
                      {nodes.filter(n => n.data.configId).length}/{nodes.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RepoWorkflows;

// bootstrap mount when loaded as a standalone page
const { repoID } = window.app?.pageOptions || {};
const mountEl = document.getElementById('wrapper');
if (mountEl) {
  const root = createRoot(mountEl);
  root.render(<RepoWorkflows repoID={repoID} />);
}
