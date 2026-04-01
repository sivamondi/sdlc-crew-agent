import { useCallback, useMemo, useRef, useState } from 'react';
/* Design-only workflow editor - execution happens in ProjectConfig */
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Trash2, ChevronDown, Save, FolderOpen, FilePlus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import useStore from '../store/useStore';
import AgentNode from './AgentNode';
import { wouldCreateCycle } from '../utils/workflowEngine';

const nodeTypes = { agentNode: AgentNode };

function WorkflowEditorInner() {
  const {
    workflow, setNodes, setEdges, addNode, agents,
    nodeStatus, selectedNodeId, setSelectedNodeId,
    savedWorkflows, workflowName, setWorkflowName, saveWorkflow, loadWorkflow, deleteWorkflow, newWorkflow,
  } = useStore();

  const { screenToFlowPosition } = useReactFlow();
  const dropdownRef = useRef(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const onNodesChange = useCallback(
    (changes) => setNodes(applyNodeChanges(changes, useStore.getState().workflow.nodes)),
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges(applyEdgeChanges(changes, useStore.getState().workflow.edges)),
    [setEdges]
  );

  const onConnect = useCallback(
    (connection) => {
      const { workflow: wf } = useStore.getState();
      if (wouldCreateCycle(wf.nodes, wf.edges, connection.source, connection.target)) {
        alert('Cannot create this connection — it would create a cycle.');
        return;
      }
      setEdges(addEdge(connection, useStore.getState().workflow.edges));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const handleAddNode = (agent) => {
    const id = `node-${uuidv4()}`;
    addNode({
      id,
      type: 'agentNode',
      position: screenToFlowPosition({ x: 400, y: 300 }),
      data: {
        agentId: agent.id,
        agentRole: agent.role,
        label: agent.name,
        outputFile: agent.outputFile,
      },
    });
  };

  const handleDeleteSelected = () => {
    if (selectedNodeId) {
      useStore.getState().removeNode(selectedNodeId);
      setSelectedNodeId(null);
    }
  };

  // Edges with status styling
  const styledEdges = useMemo(() => {
    return workflow.edges.map((edge) => {
      const sourceStatus = nodeStatus[edge.source]?.status;
      const targetStatus = nodeStatus[edge.target]?.status;
      const isActive = sourceStatus === 'done' && targetStatus === 'running';
      return {
        ...edge,
        animated: isActive,
        style: {
          stroke: sourceStatus === 'done' ? 'var(--success)' : 'var(--border-hover)',
          strokeWidth: 2,
        },
      };
    });
  }, [workflow.edges, nodeStatus]);

  return (
    <div className="workflow-editor">
      {/* Toolbar */}
      <div className="workflow-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Workflow name */}
          {editingName ? (
            <input
              className="workflow-name-input"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              autoFocus
            />
          ) : (
            <span className="workflow-name" onClick={() => setEditingName(true)}>
              {workflowName}
            </span>
          )}

          <div className="toolbar-divider" />

          {/* Add Agent */}
          <div className="add-node-dropdown" ref={dropdownRef}>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowAddMenu(!showAddMenu)}>
              <Plus size={14} /> Add Agent <ChevronDown size={12} />
            </button>
            {showAddMenu && (
              <div className="add-node-menu">
                {agents.map((agent) => (
                  <button key={agent.id} className="add-node-item" onClick={() => { handleAddNode(agent); setShowAddMenu(false); }}>
                    <span className="add-node-avatar" style={{ background: agent.color }}>{agent.avatar}</span>
                    <span>{agent.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedNodeId && (
            <button className="btn btn-sm btn-danger" onClick={handleDeleteSelected}>
              <Trash2 size={12} /> Delete
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Save / Load / New */}
          <button className="btn btn-sm btn-secondary" onClick={() => { saveWorkflow(workflowName); }} title="Save workflow">
            <Save size={12} /> Save
          </button>
          <div className="add-node-dropdown">
            <button className="btn btn-sm btn-secondary" onClick={() => setShowLoadMenu(!showLoadMenu)}>
              <FolderOpen size={12} /> Load <ChevronDown size={12} />
            </button>
            {showLoadMenu && (
              <div className="add-node-menu" style={{ right: 0, left: 'auto' }}>
                {savedWorkflows.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>No saved workflows</div>
                ) : (
                  savedWorkflows.map((sw) => (
                    <div key={sw.id} className="add-node-item" style={{ justifyContent: 'space-between' }}>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, flex: 1, textAlign: 'left', padding: 0 }}
                        onClick={() => { loadWorkflow(sw.id); setShowLoadMenu(false); }}
                      >
                        {sw.name}
                      </button>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 11, padding: '0 4px' }}
                        onClick={(e) => { e.stopPropagation(); deleteWorkflow(sw.id); }}
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button className="btn btn-sm btn-secondary" onClick={newWorkflow} title="New workflow">
            <FilePlus size={12} /> New
          </button>

          <div className="toolbar-divider" />

          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {workflow.nodes.length} nodes, {workflow.edges.length} edges
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="workflow-canvas-wrapper">
        <ReactFlow
          nodes={workflow.nodes}
          edges={styledEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          defaultViewport={{ x: 100, y: 20, zoom: 1 }}
          minZoom={0.3}
          maxZoom={2}
          deleteKeyCode={['Backspace', 'Delete']}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--border)" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) => {
              const s = nodeStatus[n.id]?.status;
              if (s === 'running') return '#6366f1';
              if (s === 'done') return '#059669';
              if (s === 'error') return '#dc2626';
              return '#c8cbd4';
            }}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          />
        </ReactFlow>
      </div>

    </div>
  );
}

export default function WorkflowEditor() {
  return (
    <ReactFlowProvider>
      <WorkflowEditorInner />
    </ReactFlowProvider>
  );
}
