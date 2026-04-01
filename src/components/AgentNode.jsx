import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Check, AlertCircle, Loader, Settings } from 'lucide-react';
import useStore from '../store/useStore';

function AgentNode({ id, data, selected, isConnectable }) {
  const agents = useStore((s) => s.agents);
  const nodeStatus = useStore((s) => s.nodeStatus[id]);
  const updateNodeData = useStore((s) => s.updateNodeData);
  const running = useStore((s) => s.running);
  const [editing, setEditing] = useState(false);

  const agent = agents.find((a) => a.role === data.agentRole);
  const status = nodeStatus?.status || 'idle';

  const statusClass = status === 'running' ? 'running' : status === 'done' ? 'done' : status === 'error' ? 'error' : '';

  return (
    <div className={`agent-node-rf ${statusClass} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} className="node-handle" isConnectable={isConnectable} />

      <div className="node-avatar" style={{ background: agent?.color || '#6b7280' }}>
        {agent?.avatar || '??'}
      </div>

      <div className="node-info">
        {editing && !running ? (
          <div className="node-edit-form" onClick={(e) => e.stopPropagation()}>
            <input
              className="node-edit-input"
              value={data.label}
              onChange={(e) => updateNodeData(id, { label: e.target.value })}
              placeholder="Step name"
            />
            <select
              className="node-edit-select"
              value={data.agentRole}
              onChange={(e) => {
                const newAgent = agents.find((a) => a.role === e.target.value);
                updateNodeData(id, {
                  agentRole: e.target.value,
                  outputFile: newAgent?.outputFile || data.outputFile,
                });
              }}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.role}>{a.name}</option>
              ))}
            </select>
            <input
              className="node-edit-input"
              value={data.outputFile}
              onChange={(e) => updateNodeData(id, { outputFile: e.target.value })}
              placeholder="output.md"
              style={{ fontSize: 10 }}
            />
            <button className="node-edit-done" onClick={() => setEditing(false)}>Done</button>
          </div>
        ) : (
          <>
            <div className="node-label">{data.label}</div>
            <div className="node-agent-name">{agent?.name || data.agentRole}</div>
            <div className="node-output-file">{data.outputFile}</div>
          </>
        )}
      </div>

      <div className="node-status-area">
        {status === 'running' && <Loader size={14} className="spin" />}
        {status === 'done' && <Check size={14} style={{ color: 'var(--success)' }} />}
        {status === 'error' && <AlertCircle size={14} style={{ color: 'var(--error)' }} />}
        {status === 'idle' && !editing && !running && (
          <button className="node-settings-btn" onClick={() => setEditing(true)}>
            <Settings size={12} />
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="node-handle" isConnectable={isConnectable} />
    </div>
  );
}

export default memo(AgentNode);
