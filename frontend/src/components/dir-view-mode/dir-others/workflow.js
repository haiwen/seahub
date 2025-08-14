import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
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
import workflowAPI from '../../../utils/workflow-api';
import { metadataAPI } from '../../../metadata';
import Icon from '../../icon';
import toaster from '../../toast';

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
  { type: 'trigger', label: 'Trigger', color: '#4f8cff', icon: <Icon symbol="monitor" style={{ width: 16, height: 16 }} />, description: 'Workflow start' },
  { type: 'condition', label: 'Condition', color: '#f7b924', icon: <Icon symbol="more-level" style={{ width: 16, height: 16 }} />, description: 'If-Else branch' },
  { type: 'action', label: 'Action', color: '#43d675', icon: <Icon symbol="send" style={{ width: 16, height: 16 }} />, description: 'Set file status' },
];

// Node styles
const nodeTypeStyles = {
  trigger: {
    background: 'linear-gradient(135deg, #eaf3ff 0%, #d6e7ff 100%)',
    border: '2px solid #4f8cff',
    color: '#2563eb'
  },
  condition: {
    background: 'linear-gradient(135deg, #fffbe6 0%, #fef3c7 100%)',
    border: '2px solid #f7b924',
    color: '#d97706'
  },
  action: {
    background: 'linear-gradient(135deg, #eafff3 0%, #d1fae5 100%)',
    border: '2px solid #43d675',
    color: '#059669'
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

      {/* Quick add condition branches */}
      {node?.type === 'condition' && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          background: '#f0f9ff',
          borderRadius: 6,
          border: '1px solid #bae6fd'
        }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: '#0369a1', marginBottom: 8 }}>Condition branches</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onAddIfBranch && onAddIfBranch(node)}
              style={{
                flex: 1,
                padding: '8px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              Add If branch
            </button>
            <button
              onClick={() => onAddElseBranch && onAddElseBranch(node)}
              style={{
                flex: 1,
                padding: '8px',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              Add Else branch
            </button>
          </div>
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

  return (
    <div style={{
      ...nodeTypeStyles[type],
      borderRadius: 12,
      padding: 16,
      minWidth: 160,
      minHeight: 100,
      boxShadow: selected
        ? '0 0 0 3px rgba(37, 99, 235, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15)'
        : '0 2px 8px rgba(0, 0, 0, 0.1)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'relative',
      opacity: isConfigured ? 1 : 0.6,
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: nodeTypeStyles[type].border.split(' ')[2],
          width: 10,
          height: 10,
          top: -5
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
          background: nodeTypeStyles[type].border.split(' ')[2],
          width: 10,
          height: 10,
          bottom: -5
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

function SimpleWorkflowEditor({ open = true, onClose, repoId }) {
  const reactFlowWrapper = useRef(null);

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

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose && onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!repoId || !open) return;
    metadataAPI.getColumnInfo(repoId).then((res) => {
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
  }, [repoId, open]);

  const parseGraphNodesEdges = (wf) => {
    let graph = wf.graph_data || wf.graph;
    if (typeof graph === 'string') {
      try { graph = JSON.parse(graph); } catch (_) { graph = null; }
    }
    return {
      nodes: graph?.nodes || [],
      edges: graph?.edges || []
    };
  };

  const loadWorkflows = useCallback(async () => {
    if (!repoId) return;
    setIsLoading(true);
    try {
      const res = await workflowAPI.listWorkflows(repoId);
      const list = res?.data?.workflows || [];
      setWorkflows(list);
      if (list.length > 0) {
        const wf = list.find(w => w.id === currentWorkflowId) || list[0];
        setCurrentWorkflowId(wf.id);
        setWorkflowName(wf.name);
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
      toaster.warning(err);
    } finally {
      setIsLoading(false);
    }
  }, [repoId, currentWorkflowId, setNodes, setEdges]);

  useEffect(() => {
    if (open && repoId) {
      loadWorkflows();
    }
  }, [open, repoId, loadWorkflows]);

  const handleWorkflowSelect = useCallback((wfId) => {
    setCurrentWorkflowId(wfId);
    const wf = workflows.find(w => w.id === wfId);
    if (wf) {
      setWorkflowName(wf.name);
      const { nodes: nextNodes, edges: nextEdges } = parseGraphNodesEdges(wf);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNode(null);
    }
  }, [workflows, setNodes, setEdges]);

  const handleCreateWorkflow = useCallback(async () => {
    if (!repoId) return;
    const name = window.prompt('Enter new workflow name', 'New workflow');
    if (!name) return;
    try {
      const res = await workflowAPI.createWorkflow(repoId, {
        name,
        graph: JSON.stringify({ nodes: [], edges: [] }),
        is_valid: true
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
  }, [repoId, workflows, setNodes, setEdges]);

  const handleDeleteWorkflow = useCallback(async () => {
    if (!repoId || !currentWorkflowId) return;
    if (!window.confirm('Delete the current workflow?')) return;
    try {
      await workflowAPI.deleteWorkflow(repoId, currentWorkflowId);
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
  }, [repoId, currentWorkflowId, workflows, setNodes, setEdges]);


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

  const addConditionBranch = useCallback((conditionNode, branch) => {
    if (!conditionNode) return;
    const hasBranch = edges.some(e => e.source === conditionNode.id && (branch === 'if' ? e.label === 'True' : e.label === 'False'));
    if (hasBranch) {
      alert(`${branch === 'if' ? 'If' : 'Else'} branch already exists`);
      return;
    }

    const offsetX = branch === 'if' ? -60 : 120;
    const offsetY = 120;
    const position = {
      x: (conditionNode.position?.x || 0) + offsetX,
      y: (conditionNode.position?.y || 0) + offsetY,
    };

    const id = `${Date.now()}`;
    const label = branch === 'if' ? 'if' : 'else';

    setNodes(nds => [...nds, {
      id,
      type: 'action',
      position,
      data: { label }
    }]);

    const edgeId = `${Date.now()}`;
    setEdges(eds => addEdge({
      id: edgeId,
      source: conditionNode.id,
      target: id,
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
      label: branch === 'if' ? 'True' : 'False'
    }, eds));
  }, [edges, setNodes, setEdges]);

  const onDragStart = useCallback((event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    if (!reactFlowWrapper.current || !reactFlowInstance) return;

    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });

    const id = `${Date.now()}`;
    const nodeType = nodeTypesList.find(n => n.type === type);
    const label = `${nodeType?.label || 'Node'}`;

    setNodes(nds => [...nds, {
      id,
      type,
      position,
      data: { label },
    }]);
  }, [reactFlowInstance, setNodes]);

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
      is_valid: true
    };

    try {
      if (currentWorkflowId) {
        await workflowAPI.updateWorkflow(repoId, currentWorkflowId, payload);
      } else {
        const res = await workflowAPI.createWorkflow(repoId, payload);
        const newId = res?.data?.id;
        if (newId) setCurrentWorkflowId(newId);
      }
      toaster.success('Workflow saved');
    } catch (err) {
      toaster.warning('Failed');
    } finally {
      setIsSaving(false);
    }
  }, [repoId, workflowName, nodes, edges, currentWorkflowId]);

  return open ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(1200px, 95vw)',
          height: 'min(85vh, 900px)',
          background: '#f8fafc',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#f8fafc'
        }}>
          {/* Header toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>
                🔄 Workflow
              </h1>
              <select
                value={currentWorkflowId || ''}
                onChange={(e) => handleWorkflowSelect(e.target.value)}
                disabled={isLoading}
                style={{
                  padding: '6px 10px',
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
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
                  padding: '8px 12px', background: 'rgba(255,255,255,0.2)',
                  color: 'white', border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6, cursor: 'pointer', fontSize: 14
                }}
                title="New workflow"
              >
                <Icon symbol="plus_sign" style={{ width: 16, height: 16 }} /> New
              </button>
              {currentWorkflowId && (
                <button
                  onClick={handleDeleteWorkflow}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 12px', background: 'rgba(255,255,255,0.2)',
                    color: 'white', border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: 6, cursor: 'pointer', fontSize: 14
                  }}
                  title="Delete current workflow"
                >
                  <Icon symbol="delete" style={{ width: 16, height: 16 }} /> Delete
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
                  background: isSaving ? '#6b7280' : 'rgba(255,255,255,0.2)',
                  color: isSaving ? 'white' : 'white',
                  border: isSaving ? 'none' : '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: 14
                }}
              >
                {isSaving ? <Icon symbol="spinner" style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Icon symbol="save" style={{ width: 16, height: 16 }} />}
                Save
              </button>
              <button
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14
                }}
                title="Cancel"
              >
                <Icon symbol="close" style={{ width: 16, height: 16 }} />
                Cancel
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <div style={{
              width: 280,
              borderRight: '1px solid #e5e7eb',
              padding: 20,
              background: 'white',
              overflowY: 'auto'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: 18,
                fontWeight: 'bold',
                color: '#374151'
              }}>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {nodeTypesList.map(node => (
                  <div
                    key={node.type}
                    style={{
                      ...nodeTypeStyles[node.type],
                      borderRadius: 8,
                      padding: 16,
                      cursor: 'grab',
                      userSelect: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                    draggable
                    onDragStart={e => onDragStart(e, node.type)}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {node.icon}
                      <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                        {node.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
                      {node.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div ref={reactFlowWrapper} style={{ flex: 1, height: '100%', position: 'relative' }}>
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  nodeTypes={nodeTypes}
                  onNodeClick={onNodeClick}
                  onPaneClick={onPaneClick}
                  onDrop={onDrop}
                  onDragOver={e => e.preventDefault()}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
                  }}
                  connectionLineStyle={{
                    stroke: '#6366f1',
                    strokeWidth: 3,
                    strokeDasharray: '5,5'
                  }}
                  defaultEdgeOptions={{
                    animated: true,
                    style: { stroke: '#6366f1', strokeWidth: 2 }
                  }}
                >
                  <MiniMap
                    style={{
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb'
                    }}
                    nodeColor={(node) => nodeTypesList.find(n => n.type === node.type)?.color || '#6b7280'}
                  />
                  <Controls
                    style={{
                      background: 'rgba(255,255,255,0.9)',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb'
                    }}
                  />
                  <Background color="#e5e7eb" gap={20} />

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
                      {nodes.length} Nodes • {edges.length} Edges •
                      {nodes.filter(n => n.data.configId).length} configured
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
                          Start build workflow
                        </div>
                        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                          Drag nodes from the left to the canvas, or click "Example Workflow" to view the demonstration
                        </div>
                      </div>
                    </Panel>
                  )}
                </ReactFlow>
              </ReactFlowProvider>
            </div>

            <div style={{
              width: 350,
              borderLeft: '1px solid #e5e7eb',
              background: 'white',
              padding: 20,
              overflowY: 'auto'
            }}>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: 18,
                fontWeight: 'bold',
                color: '#374151'
              }}>
                Node configuration
              </h3>

              <NodeConfigPanel
                node={selectedNode}
                onConfigChange={(configId, params) => updateNodeConfig(selectedNode?.id, configId, params)}
                onDelete={onDelete}
                onAddIfBranch={(node) => addConditionBranch(node, 'if')}
                onAddElseBranch={(node) => addConditionBranch(node, 'else')}
                statusOptions={statusOptions}
              />

              <div style={{
                marginTop: 24,
                background: '#f9fafb',
                padding: 16,
                borderRadius: 8,
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 'bold', color: '#374151' }}>
                  Workflow statistics
                </h4>
                <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Trigger:</span>
                    <span>{nodes.filter(n => n.type === 'trigger').length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Condition Node:</span>
                    <span>{nodes.filter(n => n.type === 'condition').length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Action Node:</span>
                    <span>{nodes.filter(n => n.type === 'action').length}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <span>Configuration complete:</span>
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
  ) : null;
}

export default SimpleWorkflowEditor;
