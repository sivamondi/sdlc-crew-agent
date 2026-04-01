import { useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Handle, Position, BezierEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/**
 * Mini execution node — shows agent status visually with continuous animations.
 */
function ExecutionNode({ data }) {
  const { label, agentName, avatar, color, status, charCount, toolCount } = data;

  const statusColors = {
    pending: '#e5e7eb',
    running: '#7c3aed',
    done: '#16a34a',
    error: '#dc2626',
  };

  const borderColor = statusColors[status] || '#e5e7eb';
  const isRunning = status === 'running';
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <div
      className={`exec-node ${status}`}
      style={{
        '--node-color': color,
        '--border-color': borderColor,
      }}
    >
      <Handle type="target" position={Position.Top} className="exec-handle" style={{ background: borderColor }} />

      {/* Spinning ring around the node when running */}
      {isRunning && <div className="exec-ring" />}

      <div className="exec-node-inner">
        {/* Avatar */}
        <div
          className={`exec-avatar ${isRunning ? 'running' : ''}`}
          style={{ background: isRunning ? color : isDone ? '#dcfce7' : isError ? '#fef2f2' : '#f3f4f6' }}
        >
          {isRunning ? (
            <span className="exec-avatar-icon spinning">🧠</span>
          ) : isDone ? (
            <span className="exec-avatar-icon">✅</span>
          ) : isError ? (
            <span className="exec-avatar-icon">❌</span>
          ) : (
            <span className="exec-avatar-icon">⏳</span>
          )}
        </div>

        {/* Info */}
        <div className="exec-info">
          <div className="exec-name">
            {agentName}
            {isRunning && <span className="exec-dots"><span /><span /><span /></span>}
          </div>
          <div className="exec-label">{label}</div>
        </div>
      </div>

      {/* Stats */}
      {(charCount > 0 || toolCount > 0) && (
        <div className="exec-stats">
          {charCount > 0 && <span>{charCount.toLocaleString()} chars</span>}
          {toolCount > 0 && <span>{toolCount} tools</span>}
        </div>
      )}

      {/* Running progress bar */}
      {isRunning && <div className="exec-progress-bar"><div className="exec-progress-fill" /></div>}

      <Handle type="source" position={Position.Bottom} className="exec-handle" style={{ background: borderColor }} />
    </div>
  );
}

const nodeTypes = { executionNode: ExecutionNode };

/**
 * Animated edge with flowing dots.
 */
function AnimatedEdge(props) {
  const { sourceX, sourceY, targetX, targetY, data, ...rest } = props;

  const isActive = data?.sourceStatus === 'done' && data?.targetStatus === 'running';
  const isDone = data?.sourceStatus === 'done' && data?.targetStatus === 'done';
  const color = isActive ? '#7c3aed' : isDone ? '#16a34a' : '#d1d5db';

  // Build bezier path for dots
  const midY = (sourceY + targetY) / 2;
  const pathD = `M${sourceX},${sourceY} C${sourceX},${midY} ${targetX},${midY} ${targetX},${targetY}`;

  return (
    <g>
      <BezierEdge
        {...props}
        style={{
          stroke: color,
          strokeWidth: isActive ? 3 : 2,
          transition: 'stroke 0.3s, stroke-width 0.3s',
        }}
      />
      {isActive && (
        <>
          <circle r="5" fill="#7c3aed" opacity="0.9">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={pathD} />
          </circle>
          <circle r="3" fill="#a78bfa" opacity="0.6">
            <animateMotion dur="1.2s" repeatCount="indefinite" begin="0.4s" path={pathD} />
          </circle>
          <circle r="2" fill="#c4b5fd" opacity="0.4">
            <animateMotion dur="1.2s" repeatCount="indefinite" begin="0.8s" path={pathD} />
          </circle>
        </>
      )}
    </g>
  );
}

const edgeTypes = { animated: AnimatedEdge };

function ExecutionFlowInner({ workflowNodes, workflowEdges, nodeProgress, agents, currentNodeId, toolActivity }) {
  const flowNodes = useMemo(() => {
    return workflowNodes.map((wn) => {
      const np = nodeProgress[wn.id] || {};
      const agent = agents.find((a) => a.role === wn.data.agentRole);
      const nodeTools = (toolActivity || []).filter((t) => t.timestamp > (np.startTime || 0));

      return {
        id: wn.id,
        type: 'executionNode',
        position: wn.position || { x: 250, y: 0 },
        data: {
          label: wn.data.label,
          agentName: agent?.name || wn.data.agentRole,
          avatar: agent?.avatar || '??',
          color: agent?.color || '#6b7280',
          status: np.status || 'pending',
          charCount: np.charCount || 0,
          toolCount: nodeTools.length,
        },
        draggable: false,
      };
    });
  }, [workflowNodes, nodeProgress, agents, toolActivity, currentNodeId]);

  const flowEdges = useMemo(() => {
    return workflowEdges.map((we) => {
      const sourceNp = nodeProgress[we.source] || {};
      const targetNp = nodeProgress[we.target] || {};

      return {
        id: we.id,
        source: we.source,
        target: we.target,
        type: 'animated',
        data: {
          sourceStatus: sourceNp.status || 'pending',
          targetStatus: targetNp.status || 'pending',
        },
      };
    });
  }, [workflowEdges, nodeProgress]);

  return (
    <div style={{
      height: Math.max(300, workflowNodes.length * 150 + 60),
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid var(--border)',
      background: '#fafafa',
      marginBottom: 12,
    }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e5e7eb" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}

export default function ExecutionFlow(props) {
  return (
    <ReactFlowProvider>
      <ExecutionFlowInner {...props} />
    </ReactFlowProvider>
  );
}
