import { useState, useRef, useEffect } from 'react';
import { FolderGit2, Cpu, FolderOpen, FileText, Check, Plus, Trash2, GripVertical, Rocket, Square, GitBranch, Loader, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import useStore from '../store/useStore';
import FolderPicker from './FolderPicker';
import { executeWorkflow } from '../utils/workflowEngine';

const MODELS = [
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

const TOKEN_OPTIONS = [4096, 8192, 16384, 32768];

const SPEC_TEMPLATE = `## Feature Name
[Name of the feature]

## User Story
As a [user role], I want to [action], so that [benefit].

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Functional Requirements
1. [Describe what the system should do]
2. [Describe inputs, outputs, and behaviors]

## Non-Functional Requirements
- Performance: [e.g., response time < 200ms]
- Security: [e.g., input validation, auth required]
- Scalability: [e.g., handle 1000 concurrent users]

## UI/UX Requirements
- [Describe the user interface expectations]
- [Describe user interactions and flows]

## API Requirements
- [Endpoint definitions if applicable]
- [Request/response formats]

## Dependencies
- [External services, libraries, or modules needed]

## Out of Scope
- [What is NOT included in this feature]
`;

export default function ProjectConfig() {
  const {
    project, setProject, model, maxTokens, setModel, setMaxTokens,
    running, setRunning, agents,
    savedWorkflows, workflow, loadWorkflow, workflowName,
    nodeStatus, setNodeStatus, resetExecution, setActiveNodeIds,
    addActivity, clearActivities, addReport, clearReports,
  } = useStore();

  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [specs, setSpecs] = useState(project.specs || []);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('current');
  const [nodeProgress, setNodeProgress] = useState({}); // { nodeId: { status, label, agentName, color, charCount, startTime, endTime } }
  const [streamingOutput, setStreamingOutput] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [outputExpanded, setOutputExpanded] = useState(true);
  const abortRef = useRef(false);
  const streamRef = useRef(null);

  // Elapsed time ticker
  useEffect(() => {
    if (!running || !startTime) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [running, startTime]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const addSpec = (template = false) => {
    const newSpec = {
      id: Date.now().toString(),
      title: '',
      content: template ? SPEC_TEMPLATE : '',
    };
    const updated = [...specs, newSpec];
    setSpecs(updated);
    setProject({ specs: updated });
  };

  const updateSpec = (id, field, value) => {
    const updated = specs.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    setSpecs(updated);
    setProject({ specs: updated });
  };

  const removeSpec = (id) => {
    const updated = specs.filter((s) => s.id !== id);
    setSpecs(updated);
    setProject({ specs: updated });
  };

  const getActiveWorkflow = () => {
    if (selectedWorkflowId === 'current') return workflow;
    const saved = savedWorkflows.find((w) => w.id === selectedWorkflowId);
    return saved?.workflow || workflow;
  };

  const getActiveWorkflowName = () => {
    if (selectedWorkflowId === 'current') return workflowName;
    const saved = savedWorkflows.find((w) => w.id === selectedWorkflowId);
    return saved?.name || workflowName;
  };

  async function handleBuildFeature() {
    if (!project.description?.trim()) {
      alert('Please enter a feature description before building.');
      return;
    }

    const activeWorkflow = getActiveWorkflow();
    if (!activeWorkflow.nodes.length) {
      alert('The selected workflow has no nodes.');
      return;
    }

    abortRef.current = false;
    setRunning(true);
    resetExecution();
    clearActivities();
    clearReports();
    setStreamingOutput('');
    setCurrentNodeId(null);
    setStartTime(Date.now());
    setElapsed(0);
    setOutputExpanded(true);

    // Initialize node progress for all nodes
    const initProgress = {};
    activeWorkflow.nodes.forEach((node) => {
      const agent = agents.find((a) => a.role === node.data.agentRole);
      initProgress[node.id] = {
        status: 'pending',
        label: node.data.label,
        agentName: agent?.name || node.data.agentRole,
        avatar: agent?.avatar || '??',
        color: agent?.color || '#6b7280',
        charCount: 0,
        startTime: null,
        endTime: null,
      };
    });
    setNodeProgress(initProgress);

    addActivity({ type: 'system', message: `Workflow started: ${getActiveWorkflowName()}`, agent: 'System' });

    try {
      await executeWorkflow(activeWorkflow, agents, project, { model, maxTokens }, {
        shouldAbort: () => abortRef.current,

        onNodeStart: (nodeId, agent) => {
          setNodeStatus(nodeId, { status: 'running', streamingText: '' });
          setCurrentNodeId(nodeId);
          setStreamingOutput('');
          setNodeProgress((prev) => ({
            ...prev,
            [nodeId]: { ...prev[nodeId], status: 'running', startTime: Date.now() },
          }));
          addActivity({ type: 'agent', message: `Starting: ${agent.name}`, agent: agent.name, color: agent.color });
        },

        onNodeStream: (nodeId, chunk, full) => {
          setNodeStatus(nodeId, { streamingText: full });
          setStreamingOutput(full);
          setNodeProgress((prev) => ({
            ...prev,
            [nodeId]: { ...prev[nodeId], charCount: full.length },
          }));
          // Auto-scroll streaming panel
          if (streamRef.current) {
            streamRef.current.scrollTop = streamRef.current.scrollHeight;
          }
        },

        onNodeComplete: (nodeId, fullText, agent, node) => {
          setNodeStatus(nodeId, { status: 'done', output: fullText, streamingText: fullText });
          setNodeProgress((prev) => ({
            ...prev,
            [nodeId]: { ...prev[nodeId], status: 'done', charCount: fullText.length, endTime: Date.now() },
          }));
          addActivity({ type: 'success', message: `Completed: ${node.data.label}`, agent: agent.name, color: agent.color });
          addReport({
            id: nodeId,
            agentName: agent.name,
            agentAvatar: agent.avatar,
            agentColor: agent.color,
            label: node.data.label,
            outputFile: node.data.outputFile,
            content: fullText,
            timestamp: new Date().toISOString(),
          });
        },

        onNodeError: (nodeId, err) => {
          setNodeStatus(nodeId, { status: 'error', streamingText: `Error: ${err.message}` });
          setNodeProgress((prev) => ({
            ...prev,
            [nodeId]: { ...prev[nodeId], status: 'error', endTime: Date.now() },
          }));
          addActivity({ type: 'error', message: `Error: ${err.message}`, agent: 'System' });
        },
      });
    } catch (err) {
      addActivity({ type: 'error', message: err.message, agent: 'System' });
    }

    setRunning(false);
    setCurrentNodeId(null);
    addActivity({ type: 'system', message: 'Workflow finished', agent: 'System' });
  }

  function handleStop() {
    abortRef.current = true;
    setRunning(false);
    setCurrentNodeLabel('');
    addActivity({ type: 'system', message: 'Workflow stopped by user', agent: 'System' });
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Row 1: Project Setup + AI Settings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="config-section">
          <div className="config-section-title">
            <FolderGit2 size={16} /> Project Setup
          </div>
          <div className="card">
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                className="input"
                value={project.name}
                onChange={(e) => setProject({ name: e.target.value })}
                placeholder="e.g., My E-commerce App"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Project Folder</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  value={project.repoPath}
                  onChange={(e) => setProject({ repoPath: e.target.value })}
                  placeholder="Select or type project path..."
                  style={{ flex: 1 }}
                />
                <button className="btn btn-secondary" onClick={() => setShowFolderPicker(true)}>
                  <FolderOpen size={14} /> Browse
                </button>
              </div>
              {project.repoPath && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: 'var(--success)' }}>
                  <Check size={12} /> {project.repoPath}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Tech Stack / Constraints</label>
              <textarea
                className="textarea"
                value={project.techConstraints}
                onChange={(e) => setProject({ techConstraints: e.target.value })}
                placeholder="e.g., React 19, Express, PostgreSQL, TypeScript, Tailwind CSS"
                rows={2}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Additional Context</label>
              <textarea
                className="textarea"
                value={project.additionalContext}
                onChange={(e) => setProject({ additionalContext: e.target.value })}
                placeholder="Domain knowledge, existing patterns, business rules, coding standards..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="config-section">
          <div className="config-section-title">
            <Cpu size={16} /> AI Settings
          </div>
          <div className="card">
            <div className="form-group">
              <label className="form-label">Model</label>
              <select className="select" value={model} onChange={(e) => setModel(e.target.value)}>
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Max Tokens per Agent</label>
              <select className="select" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))}>
                {TOKEN_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t.toLocaleString()}</option>
                ))}
              </select>
            </div>

            {/* Workflow Selector */}
            <div className="form-group" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <label className="form-label">
                <GitBranch size={12} style={{ marginRight: 4 }} />
                Workflow Pipeline
              </label>
              <select
                className="select"
                value={selectedWorkflowId}
                onChange={(e) => setSelectedWorkflowId(e.target.value)}
              >
                <option value="current">{workflowName} (current)</option>
                {savedWorkflows.map((sw) => (
                  <option key={sw.id} value={sw.id}>{sw.name}</option>
                ))}
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {getActiveWorkflow().nodes.length} agents, {getActiveWorkflow().edges.length} connections
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Design workflows in the Workflow tab, then select and run them here.
            </div>
          </div>
        </div>
      </div>

      {/* Feature Spec Section */}
      <div className="config-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="config-section-title" style={{ marginBottom: 0 }}>
            <FileText size={16} /> Feature Specs
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
              Define what you want the agents to build
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm btn-secondary" onClick={() => addSpec(true)}>
              <Plus size={12} /> From Template
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => addSpec(false)}>
              <Plus size={12} /> Blank Spec
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Feature Description *
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                High-level description of what to build
              </span>
            </label>
            <textarea
              className="textarea"
              value={project.description}
              onChange={(e) => setProject({ description: e.target.value })}
              placeholder="Describe the feature you want the agents to build. Be as detailed as possible — include user stories, acceptance criteria, and expected behavior..."
              rows={5}
              style={{ fontSize: 14 }}
            />
          </div>
        </div>

        {specs.map((spec, index) => (
          <div key={spec.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <GripVertical size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                SPEC #{index + 1}
              </span>
              <input
                className="input"
                value={spec.title}
                onChange={(e) => updateSpec(spec.id, 'title', e.target.value)}
                placeholder="Spec title (e.g., User Authentication, Shopping Cart)"
                style={{ flex: 1, fontWeight: 500 }}
              />
              <button className="btn btn-sm btn-danger" onClick={() => removeSpec(spec.id)}>
                <Trash2 size={12} />
              </button>
            </div>
            <textarea
              className="textarea"
              value={spec.content}
              onChange={(e) => updateSpec(spec.id, 'content', e.target.value)}
              placeholder="Write your detailed spec here using markdown..."
              rows={12}
              style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
            />
          </div>
        ))}

        {specs.length === 0 && (
          <div style={{
            padding: 24, textAlign: 'center', color: 'var(--text-muted)',
            border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', fontSize: 13,
          }}>
            <FileText size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Add detailed feature specs for spec-driven development.</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>
              Click "From Template" to start with a structured format, or "Blank Spec" for free-form.
            </p>
          </div>
        )}
      </div>

      {/* Build Feature Section */}
      <div className="card" style={{ marginTop: 24 }}>
        {/* Header with button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Rocket size={16} />
              Build Feature
              {running && (
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} /> {formatTime(elapsed)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Workflow: <strong>{getActiveWorkflowName()}</strong> ({getActiveWorkflow().nodes.length} agents)
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!running ? (
              <button
                className="btn btn-primary"
                onClick={handleBuildFeature}
                disabled={!project.description?.trim()}
                style={{ padding: '10px 32px', fontSize: 14, fontWeight: 600 }}
              >
                <Rocket size={16} /> Build Feature
              </button>
            ) : (
              <button
                className="btn btn-danger"
                onClick={handleStop}
                style={{ padding: '10px 32px', fontSize: 14, fontWeight: 600 }}
              >
                <Square size={16} /> Stop
              </button>
            )}
          </div>
        </div>

        {/* Agent Progress Pipeline */}
        {Object.keys(nodeProgress).length > 0 && (
          <div className="execution-pipeline">
            {Object.entries(nodeProgress).map(([nodeId, np], i) => (
              <div key={nodeId} className="execution-node-row">
                {/* Agent info */}
                <div className={`execution-agent ${np.status}`}>
                  <div className="execution-avatar" style={{ background: np.color }}>
                    {np.avatar}
                  </div>
                  <div className="execution-agent-info">
                    <div className="execution-agent-name">{np.agentName}</div>
                    <div className="execution-agent-label">{np.label}</div>
                  </div>
                </div>

                {/* Status */}
                <div className="execution-status-area">
                  {np.status === 'pending' && (
                    <span className="execution-badge pending">Waiting</span>
                  )}
                  {np.status === 'running' && (
                    <span className="execution-badge running">
                      <Loader size={10} className="spin" />
                      {np.charCount > 0 ? 'Generating...' : 'Connecting...'}
                    </span>
                  )}
                  {np.status === 'done' && (
                    <span className="execution-badge done">
                      <Check size={10} /> Done
                    </span>
                  )}
                  {np.status === 'error' && (
                    <span className="execution-badge error">
                      <AlertCircle size={10} /> Error
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="execution-stats">
                  {np.charCount > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {np.charCount.toLocaleString()} chars
                    </span>
                  )}
                  {np.startTime && np.endTime && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {formatTime(Math.floor((np.endTime - np.startTime) / 1000))}
                    </span>
                  )}
                  {np.status === 'running' && np.startTime && elapsed >= 0 && (
                    <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>
                      {formatTime(Math.max(0, Math.floor((Date.now() - np.startTime) / 1000)))}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="execution-progress-track">
                  <div
                    className={`execution-progress-fill ${np.status}`}
                    style={{
                      width: np.status === 'done' ? '100%' :
                             np.status === 'running' ? '60%' :
                             np.status === 'error' ? '100%' : '0%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Streaming Output */}
        {(running || streamingOutput) && (
          <div style={{ marginTop: 12 }}>
            <div
              onClick={() => setOutputExpanded(!outputExpanded)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', padding: '6px 0', color: 'var(--text-secondary)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                {currentNodeId && nodeProgress[currentNodeId] && (
                  <>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 8,
                      fontWeight: 700, color: 'white', background: nodeProgress[currentNodeId].color,
                    }}>
                      {nodeProgress[currentNodeId].avatar}
                    </div>
                    <span style={{ color: 'var(--accent)' }}>{nodeProgress[currentNodeId].agentName}</span>
                    <span>— Live Output</span>
                    {streamingOutput.length > 0 && (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        ({streamingOutput.length.toLocaleString()} chars)
                      </span>
                    )}
                  </>
                )}
                {!currentNodeId && streamingOutput && <span>Output</span>}
              </div>
              {outputExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            {outputExpanded && (
              <div className="streaming-panel" ref={streamRef} style={{ maxHeight: 350 }}>
                {!streamingOutput && running && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', padding: '8px 0' }}>
                    <Loader size={14} className="spin" />
                    <span>Connecting to Claude API... waiting for first response</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      (large prompts may take 30-60s to start)
                    </span>
                  </div>
                )}
                {streamingOutput}
                {running && streamingOutput && <span className="cursor" />}
              </div>
            )}
          </div>
        )}
      </div>

      {showFolderPicker && (
        <FolderPicker
          currentPath={project.repoPath}
          onSelect={(path) => setProject({ repoPath: path })}
          onClose={() => setShowFolderPicker(false)}
        />
      )}
    </div>
  );
}
