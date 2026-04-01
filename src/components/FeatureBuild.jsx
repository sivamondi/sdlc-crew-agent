import { useRef, useEffect, useState, useCallback } from 'react';
import { Rocket, Square, Loader, Clock, ChevronDown, ChevronUp, Plus, Trash2, GripVertical, FileText, GitBranch, Check, AlertCircle, FolderDown, Terminal, Copy, CheckCircle, Monitor, Edit3, Save, Download, ExternalLink, Search } from 'lucide-react';
import useStore from '../store/useStore';
import { executeWorkflow, topologicalLevels } from '../utils/workflowEngine';
import MarkdownRenderer from './MarkdownRenderer';

import useAuthStore from '../store/authStore';

/* ── MCP Task Importer ── */
function TaskImporter({ onSelectTask }) {
  const { settings } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [mcpUrl, setMcpUrl] = useState('');
  const [mcpUserId, setMcpUserId] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Load from global settings
  useEffect(() => {
    if (settings && !initialized) {
      setMcpUrl(settings.mcpApiUrl || '');
      setMcpUserId(settings.mcpUserId || '');
      setInitialized(true);
    }
  }, [settings, initialized]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const { getApiBase } = await import('../utils/apiClient');
      const res = await fetch(
        `${getApiBase()}/api/files/mcp-tasks?apiUrl=${encodeURIComponent(mcpUrl)}&userId=${encodeURIComponent(mcpUserId)}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (expanded && tasks.length === 0 && !loading) fetchTasks();
  }, [expanded]);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
      || t.displayTaskId.toLowerCase().includes(search.toLowerCase())
      || t.projectName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses = [...new Set(tasks.map((t) => t.status))].sort();

  const priorityColors = {
    High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e', Critical: '#7c3aed',
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', padding: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Import from QuantumCompAIX</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {tasks.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: '#f3f4f6', padding: '2px 6px', borderRadius: 10 }}>
              {tasks.length} tasks
            </span>
          )}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {/* Not configured message */}
          {!mcpUrl && (
            <div style={{
              padding: 12, marginBottom: 8, borderRadius: 8,
              background: '#fffbeb', border: '1px solid #fde68a', fontSize: 12, color: '#92400e',
            }}>
              ⚠️ MCP not configured. Go to <strong>Settings</strong> to set your QuantumCompAIX API URL and User ID.
            </div>
          )}

          {/* Settings toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm btn-primary" onClick={fetchTasks} disabled={loading || !mcpUrl}>
                {loading ? <Loader size={12} className="spin" /> : <Download size={12} />}
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowSettings(!showSettings)}>
                ⚙️ Override
              </button>
            </div>
          </div>

          {/* MCP Settings (collapsible) */}
          {showSettings && (
            <div style={{
              padding: 10, marginBottom: 8, borderRadius: 6,
              background: '#f9fafb', border: '1px solid #e5e7eb',
            }}>
              <div className="form-group" style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>MCP API URL</label>
                <input className="input" value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)}
                  style={{ fontSize: 11, fontFamily: 'var(--mono)' }} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>User ID</label>
                <input className="input" value={mcpUserId} onChange={(e) => setMcpUserId(e.target.value)}
                  style={{ fontSize: 11, fontFamily: 'var(--mono)' }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: 8, marginBottom: 8, borderRadius: 6, background: '#fef2f2', color: '#ef4444', fontSize: 12 }}>
              ❌ {error}
            </div>
          )}

          {tasks.length > 0 && (
            <>
              {/* Search + Filter */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    className="input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tasks..."
                    style={{ paddingLeft: 28, fontSize: 12 }}
                  />
                </div>
                <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ width: 140, fontSize: 12 }}>
                  <option value="all">All Status</option>
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Task List */}
              <div style={{ maxHeight: 250, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => { onSelectTask(task); setExpanded(false); }}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: 'var(--accent)',
                        fontFamily: 'var(--mono)', minWidth: 70,
                      }}>
                        {task.displayTaskId}
                      </span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{task.title}</span>
                      <span style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                        color: priorityColors[task.priority] || '#6b7280',
                        background: `${priorityColors[task.priority] || '#6b7280'}15`,
                      }}>
                        {task.priority}
                      </span>
                      <span style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 500,
                        background: task.status === 'Done' ? '#dcfce7' : task.status === 'In Progress' ? '#dbeafe' : '#f3f4f6',
                        color: task.status === 'Done' ? '#16a34a' : task.status === 'In Progress' ? '#2563eb' : '#6b7280',
                      }}>
                        {task.status}
                      </span>
                      <span style={{ fontSize: 10, color: '#9ca3af', minWidth: 80, textAlign: 'right' }}>
                        {task.projectName}
                      </span>
                    </div>
                    {task.description && (
                      <div style={{
                        padding: '2px 12px 8px', fontSize: 11, color: '#6b7280',
                        lineHeight: 1.5, maxHeight: 36, overflow: 'hidden',
                      }}>
                        {(() => {
                          const text = task.description.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
                          return text.length > 120 ? text.slice(0, 120) + '...' : text;
                        })()}
                      </div>
                    )}
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
                    No tasks match your search.
                  </div>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'right' }}>
                {filteredTasks.length} of {tasks.length} tasks
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Editable Agent Output Accordion ── */
function AgentOutputAccordion({ reports, onUpdateReport }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');

  if (!reports || reports.length === 0) return null;

  const startEdit = (report) => {
    setEditingId(report.id);
    setEditContent(report.content);
  };

  const saveEdit = (reportId) => {
    onUpdateReport(reportId, editContent);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <FileText size={14} />
        Agent Outputs
        <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>
          — Review and edit before sending to Claude Code
        </span>
      </div>

      {reports.map((report) => (
        <div key={report.id} style={{
          marginBottom: 8, borderRadius: 8, border: '1px solid var(--border)',
          overflow: 'hidden', background: 'white',
        }}>
          {/* Accordion Header */}
          <div
            onClick={() => setExpandedId(expandedId === report.id ? null : report.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', cursor: 'pointer', background: expandedId === report.id ? '#f8f9fa' : 'white',
              borderBottom: expandedId === report.id ? '1px solid var(--border)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 9,
                fontWeight: 700, color: 'white', background: report.agentColor,
              }}>
                {report.agentAvatar}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{report.agentName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {report.outputFile} · {(report.content?.length || 0).toLocaleString()} chars
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {expandedId === report.id && editingId !== report.id && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={(e) => { e.stopPropagation(); startEdit(report); }}
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  <Edit3 size={12} /> Edit
                </button>
              )}
              {expandedId === report.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {/* Accordion Body */}
          {expandedId === report.id && (
            <div style={{ padding: 12 }}>
              {editingId === report.id ? (
                <>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                      width: '100%', minHeight: 300, fontFamily: 'var(--mono)', fontSize: 12,
                      padding: 10, border: '2px solid var(--accent)', borderRadius: 6,
                      outline: 'none', resize: 'vertical', background: '#fafafa',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm btn-secondary" onClick={cancelEdit}>Cancel</button>
                    <button className="btn btn-sm btn-primary" onClick={() => saveEdit(report.id)}>
                      <Save size={12} /> Save Changes
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  <MarkdownRenderer content={report.content} />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Plan Actions (Save + Launch) ── */
function PlanActions({ nodeProgress, running, reports, repoPath, featureName, targetBranch }) {
  const [saveStatus, setSaveStatus] = useState(null);
  const [desktopStatus, setDesktopStatus] = useState(null);
  const [terminalStatus, setTerminalStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const allDone = Object.values(nodeProgress).length > 0 &&
    Object.values(nodeProgress).every((n) => n.status === 'done' || n.status === 'error') &&
    !running;

  if (!allDone || reports.length === 0) return null;

  const handleSaveToProject = async () => {
    if (!repoPath) {
      alert('No repository path set for this project. Go to Projects tab to set it.');
      return;
    }
    setSaveStatus('saving');
    try {
      const files = reports.map((r) => ({
        name: r.outputFile || `${r.label.toLowerCase().replace(/\s+/g, '-')}.md`,
        content: r.content,
      }));

      if (window.electronAPI?.writePlans) {
        // Electron: write directly to local filesystem
        const result = await window.electronAPI.writePlans(repoPath, files, featureName || 'feature', targetBranch || 'develop');
        if (!result.ok) throw new Error(result.error);
      } else {
        // Fallback: server API (shouldn't happen in Electron-only mode)
        const res = await fetch('/api/files/write-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ repoPath, files, featureName: featureName || 'feature' }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      setSaveStatus('saved');
      setStatusMessage(`Files written to ${repoPath}/.sdlc/latest/ + timestamped archive`);
    } catch (err) {
      setSaveStatus('error');
      alert('Failed to save: ' + err.message);
    }
  };

  const ensureSaved = async () => {
    if (saveStatus !== 'saved') await handleSaveToProject();
  };

  const handleOpenDesktop = async () => {
    if (!repoPath) return alert('No repository path set.');
    await ensureSaved();
    setDesktopStatus('launching');
    try {
      if (window.electronAPI?.launchClaudeCode) {
        const data = await window.electronAPI.launchClaudeCode(repoPath, 'desktop');
        setDesktopStatus(data.method === 'desktop' ? 'launched' : 'manual');
        setStatusMessage(data.message);
      } else {
        setDesktopStatus('manual');
        setStatusMessage('Open Claude Desktop manually and paste the prompt.');
      }
    } catch (err) {
      setDesktopStatus('error');
      alert('Failed: ' + err.message);
    }
  };

  const handleOpenTerminal = async () => {
    if (!repoPath) return alert('No repository path set.');
    await ensureSaved();
    setTerminalStatus('launching');
    try {
      if (window.electronAPI?.launchClaudeCode) {
        const data = await window.electronAPI.launchClaudeCode(repoPath, 'terminal');
        if (data.ok) {
          setTerminalStatus('launched');
          setStatusMessage(data.message);
        } else {
          setTerminalStatus('error');
          setStatusMessage(data.error || data.message);
        }
      } else {
        setTerminalStatus('error');
        setStatusMessage('Terminal launch requires the desktop app.');
      }
    } catch (err) {
      setTerminalStatus('error');
      alert('Failed: ' + err.message);
    }
  };

  const handleCopyCommand = () => {
    const cmd = `cd "${repoPath}" && claude "Read the planning docs in .sdlc/latest/ and implement the plan. Follow .sdlc/latest/architecture-design.md then .sdlc/latest/implementation-plan.md step by step. Verify against .sdlc/latest/qa-report.md."`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      marginTop: 16, padding: 16, borderRadius: 12,
      background: 'linear-gradient(135deg, #f0f0ff 0%, #e8f5e9 100%)',
      border: '1px solid #c7d2fe',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle size={16} style={{ color: '#16a34a' }} />
        Planning Complete — {reports.length} documents generated
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Review the outputs above, then save and hand off to Claude Code.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Save to Project */}
        <button className="btn btn-secondary" onClick={handleSaveToProject}
          disabled={saveStatus === 'saving' || !repoPath}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
          {saveStatus === 'saving' ? <Loader size={14} className="spin" /> :
           saveStatus === 'saved' ? <Check size={14} style={{ color: '#16a34a' }} /> :
           <FolderDown size={14} />}
          {saveStatus === 'saved' ? 'Saved to .sdlc/' : saveStatus === 'saving' ? 'Saving...' : 'Save to Project'}
        </button>

        {/* Open Claude Desktop */}
        <button className="btn btn-primary" onClick={handleOpenDesktop}
          disabled={desktopStatus === 'launching'}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
          {desktopStatus === 'launching' ? <Loader size={14} className="spin" /> :
           desktopStatus === 'launched' ? <Check size={14} /> :
           <Monitor size={14} />}
          {desktopStatus === 'launched' ? 'Opened! Paste (Cmd+V)' : 'Open Claude Desktop'}
        </button>

        {/* Open in Terminal */}
        <button className="btn btn-secondary" onClick={handleOpenTerminal}
          disabled={terminalStatus === 'launching'}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
          {terminalStatus === 'launching' ? <Loader size={14} className="spin" /> :
           terminalStatus === 'launched' ? <Check size={14} style={{ color: '#16a34a' }} /> :
           <Terminal size={14} />}
          {terminalStatus === 'launched' ? 'Terminal Opened!' : 'Open in Terminal'}
        </button>

        {/* Copy command */}
        <button className="btn btn-sm btn-secondary" onClick={handleCopyCommand}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px' }}
          title="Copy Claude Code command to clipboard">
          {copied ? <Check size={14} style={{ color: '#16a34a' }} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy Command'}
        </button>
      </div>

      {/* Status messages */}
      {!repoPath && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#d97706' }}>
          ⚠️ No repository path set. Go to Projects tab to configure it.
        </div>
      )}
      {statusMessage && (
        <div style={{
          marginTop: 8, padding: 8, borderRadius: 6, fontSize: 12,
          background: (desktopStatus === 'launched' || terminalStatus === 'launched' || saveStatus === 'saved') ? '#f0fdf4' : '#fffbeb',
          color: (desktopStatus === 'launched' || terminalStatus === 'launched' || saveStatus === 'saved') ? '#16a34a' : '#92400e',
          border: `1px solid ${(desktopStatus === 'launched' || terminalStatus === 'launched' || saveStatus === 'saved') ? '#bbf7d0' : '#fde68a'}`,
        }}>
          {(desktopStatus === 'launched' || terminalStatus === 'launched' || saveStatus === 'saved') ? '✅' : '⚠️'} {statusMessage}
        </div>
      )}
    </div>
  );
}

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

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function FeatureBuild() {
  const {
    projects, selectedProjectId, selectProject,
    agents, savedWorkflows, workflow, running,
    setNodeStatus, resetExecution, addActivity, clearActivities, addReport, clearReports,
    buildState, setBuildState, setRunning,
  } = useStore();
  // Planning mode — no local agent needed

  // Destructure build state from global store (persists across tab switches)
  const {
    nodeProgress, currentNodeId, streamingOutput, outputExpanded,
    startTime, elapsed, fileWriteStatus, toolActivity, reviewCycle,
    featureDescription, specs, selectedWorkflowId,
  } = buildState;

  // Helper to update build state
  const setFeatureDescription = (v) => setBuildState({ featureDescription: v });
  const setSpecs = (v) => setBuildState({ specs: typeof v === 'function' ? v(buildState.specs) : v });
  const setSelectedWorkflowId = (v) => setBuildState({ selectedWorkflowId: v });
  const setNodeProgress = (v) => {
    const current = useStore.getState().buildState.nodeProgress;
    setBuildState({ nodeProgress: typeof v === 'function' ? v(current) : v });
  };
  const setCurrentNodeId = (v) => setBuildState({ currentNodeId: v });
  const setStreamingOutput = (v) => setBuildState({ streamingOutput: v });
  const setOutputExpanded = (v) => setBuildState({ outputExpanded: v });
  const setStartTime = (v) => setBuildState({ startTime: v });
  const setElapsed = (v) => setBuildState({ elapsed: v });
  const setFileWriteStatus = (v) => setBuildState({ fileWriteStatus: typeof v === 'function' ? v(buildState.fileWriteStatus) : v });
  const setToolActivity = (v) => setBuildState({ toolActivity: typeof v === 'function' ? v(buildState.toolActivity) : v });
  const setReviewCycle = (v) => setBuildState({ reviewCycle: v });

  const abortRef = useRef(false);
  const streamRef = useRef(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Auto-select first saved workflow if selectedWorkflowId is 'current' and saved workflows exist
  useEffect(() => {
    if (selectedWorkflowId === 'current' && savedWorkflows.length > 0) {
      setSelectedWorkflowId(savedWorkflows[0].id);
    }
  }, [savedWorkflows.length]);

  // Pre-populate from project when selected
  useEffect(() => {
    if (selectedProject) {
      setFeatureDescription(selectedProject.description || '');
      setSpecs(selectedProject.specs?.length > 0
        ? selectedProject.specs.map((s) => ({ ...s, id: s.id || Date.now() + Math.random() }))
        : []
      );
    }
  }, [selectedProjectId]);

  // Elapsed timer
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [running, startTime]);

  // Spec helpers
  const addSpec = (fromTemplate) => {
    setSpecs((prev) => [...prev, {
      id: Date.now(),
      title: fromTemplate ? 'Feature Spec' : '',
      content: fromTemplate ? SPEC_TEMPLATE : '',
    }]);
  };

  const updateSpec = (id, field, value) => {
    setSpecs((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const removeSpec = (id) => {
    setSpecs((prev) => prev.filter((s) => s.id !== id));
  };

  const getActiveWorkflow = () => {
    if (selectedWorkflowId === 'current') return workflow;
    const saved = savedWorkflows.find((w) => w.id === selectedWorkflowId);
    return saved?.workflow || workflow;
  };

  const getActiveWorkflowName = () => {
    if (selectedWorkflowId === 'current') return 'Current Canvas';
    const saved = savedWorkflows.find((w) => w.id === selectedWorkflowId);
    return saved?.name || 'Unknown';
  };

  const handleStop = () => {
    abortRef.current = true;
    setRunning(false);
  };

  async function handleBuildFeature() {
    if (!featureDescription?.trim()) {
      alert('Please enter a feature description.');
      return;
    }
    if (!selectedProject) {
      alert('Please select a project.');
      return;
    }
    if (!selectedProject.apiKey) {
      alert('This project has no API key configured. Go to Projects tab to set it.');
      return;
    }

    const activeWorkflow = getActiveWorkflow();
    console.log('[Build] Selected workflow ID:', selectedWorkflowId);
    console.log('[Build] Active workflow name:', getActiveWorkflowName());
    console.log('[Build] Active workflow nodes:', activeWorkflow.nodes.map(n => `${n.data?.label}(role=${n.data?.agentRole}, id=${n.data?.agentId})`));
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
    setToolActivity([]);
    setReviewCycle(null);
    setFileWriteStatus({});

    // Fetch intelligent codebase context if repo path is set
    let codebaseContext = null;
    if (selectedProject.repoPath) {
      addActivity({ type: 'system', message: '🔍 Indexing codebase — reading project structure...', agent: 'System' });
      try {
        if (window.electronAPI?.indexCodebase) {
          // Electron: index locally via IPC
          const data = await window.electronAPI.indexCodebase(selectedProject.repoPath);
          if (data.ok) {
            codebaseContext = data.context;
            addActivity({ type: 'success', message: `✅ Codebase indexed (${(data.chars / 1024).toFixed(0)}KB context)`, agent: 'System' });
          } else {
            addActivity({ type: 'error', message: `Indexing skipped: ${data.error}`, agent: 'System' });
          }
        } else {
          // Fallback: server API
          const { getApiBase } = await import('../utils/apiClient');
          const res = await fetch(`${getApiBase()}/api/files/index?path=${encodeURIComponent(selectedProject.repoPath)}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          });
          if (res.ok) {
            const data = await res.json();
            codebaseContext = data.context;
            addActivity({ type: 'success', message: `✅ Codebase indexed (${(data.chars / 1024).toFixed(0)}KB context)`, agent: 'System' });
          }
        }
      } catch (err) {
        addActivity({ type: 'error', message: `Codebase indexing skipped: ${err.message}`, agent: 'System' });
      }
    }

    // Build project context for this run
    const buildProject = {
      name: selectedProject.name,
      description: featureDescription,
      techConstraints: selectedProject.techConstraints,
      additionalContext: selectedProject.additionalContext,
      repoPath: selectedProject.repoPath,
      specs,
      codebaseContext,
    };

    // Initialize node progress
    // Re-read agents from store to get latest
    const latestAgents = useStore.getState().agents;
    console.log('[Build] Agents:', latestAgents.map(a => `${a.name}(${a.role}/${a.avatar})`));
    console.log('[Build] Workflow nodes:', activeWorkflow.nodes.map(n => `${n.data.label}(role=${n.data.agentRole}, id=${n.data.agentId})`));

    const initProgress = {};
    activeWorkflow.nodes.forEach((node) => {
      const role = node.data.agentRole;
      const agentId = node.data.agentId;

      // Match agent: by ID → by role → by name/label
      const agent = (agentId && latestAgents.find((a) => a.id === agentId))
        || (role && latestAgents.find((a) => a.role === role))
        || latestAgents.find((a) => a.name.toLowerCase().includes((node.data.label || '').toLowerCase().split(' ')[0]));

      console.log(`[Build] Node "${node.data.label}" → agent match:`, agent ? `${agent.name}(${agent.avatar})` : 'NONE');

      // Generate smart avatar from label if agent not found
      const words = (node.data.label || 'AG').split(/[\s&]+/).filter(Boolean);
      const fallbackAvatar = words.length >= 2
        ? (words[0][0] + words[1][0]).toUpperCase()
        : (node.data.label || 'AG').substring(0, 2).toUpperCase();

      initProgress[node.id] = {
        status: 'pending',
        label: node.data.label || 'Task',
        agentName: agent?.name || node.data.label || node.data.agentRole || 'Agent',
        avatar: agent?.avatar || fallbackAvatar,
        color: agent?.color || '#6366f1',
        charCount: 0,
        startTime: null,
        endTime: null,
      };
    });
    setNodeProgress(initProgress);

    // Compute execution order using topological sort
    try {
      const levels = topologicalLevels(activeWorkflow.nodes, activeWorkflow.edges);
      const orderedIds = levels.flat();
      setBuildState({ nodeOrder: orderedIds });
    } catch {
      // Fallback: use node array order
      setBuildState({ nodeOrder: activeWorkflow.nodes.map(n => n.id) });
    }

    addActivity({
      type: 'system',
      message: `Planning pipeline started: ${getActiveWorkflowName()}`,
      agent: 'System',
    });

    try {
      // Resolve API key: project key → user default key
      const resolvedApiKey = selectedProject.apiKey || useAuthStore?.getState?.()?.settings?.defaultApiKey || '';

      await executeWorkflow(activeWorkflow, agents, buildProject, {
        model: selectedProject.model || 'claude-sonnet-4-20250514',
        maxTokens: selectedProject.maxTokens || 16384,
        projectId: selectedProject.id,
        apiKey: resolvedApiKey, // For direct Claude API calls in Electron
      }, {
        shouldAbort: () => abortRef.current,

        onNodeStart: (nodeId, agent) => {
          setNodeStatus(nodeId, { status: 'running', streamingText: '' });
          setCurrentNodeId(nodeId);
          setStreamingOutput('');
          // Explicitly set agent info to ensure it's never lost
          const words = (agent.name || 'AG').split(/[\s&]+/).filter(Boolean);
          const avatar = agent.avatar || (words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : agent.name.substring(0, 2).toUpperCase());
          setNodeProgress((prev) => ({
            ...prev,
            [nodeId]: {
              ...prev[nodeId],
              status: 'running',
              startTime: Date.now(),
              agentName: agent.name || prev[nodeId]?.agentName || 'Agent',
              avatar: avatar,
              color: agent.color || prev[nodeId]?.color || '#6366f1',
            },
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

        onReviewCycle: (cycle, maxCycles, agentRole) => {
          setReviewCycle({ cycle, maxCycles, agent: agentRole });
          addActivity({
            type: 'system',
            message: `🔄 Review Cycle ${cycle}/${maxCycles} — re-running ${agentRole}`,
            agent: 'System',
          });
        },
      });
    } catch (err) {
      addActivity({ type: 'error', message: err.message, agent: 'System' });
    }

    setRunning(false);
    setCurrentNodeId(null);
    addActivity({ type: 'system', message: 'Workflow finished', agent: 'System' });
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
      <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Rocket size={20} /> Feature Planner
      </h2>

      {/* Project & Workflow Selectors */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Project *</label>
            <select
              className="input"
              value={selectedProjectId || ''}
              onChange={(e) => selectProject(e.target.value)}
            >
              <option value="" disabled>Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || 'Untitled'} {!p.apiKey ? '(No API Key)' : ''}
                </option>
              ))}
            </select>
            {selectedProject && !selectedProject.apiKey && (
              <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>
                ⚠️ This project has no API key. Set it in the Projects tab.
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              <GitBranch size={13} style={{ marginRight: 4 }} />
              Workflow
            </label>
            <select
              className="input"
              value={selectedWorkflowId}
              onChange={(e) => setSelectedWorkflowId(e.target.value)}
            >
              {savedWorkflows.length === 0 && (
                <option value="current">Default Pipeline ({workflow.nodes.length} agents)</option>
              )}
              {savedWorkflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.workflow?.nodes?.length || 0} agents)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* No projects message */}
      {projects.length === 0 && (
        <div style={{
          padding: 32, textAlign: 'center', color: 'var(--text-muted)',
          border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)',
        }}>
          <p style={{ fontSize: 14 }}>No projects found. Create a project first in the Projects tab.</p>
        </div>
      )}

      {/* Feature Source: Manual or Import from MCP */}
      {selectedProject && (
        <>
          <TaskImporter
            onSelectTask={(task) => {
              // Strip HTML tags from description to get plain text
              const desc = (task.description || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
              setFeatureDescription(`[${task.displayTaskId}] ${task.title}\n\nProject: ${task.projectName}\nPriority: ${task.priority}\nStatus: ${task.status}${task.dueDate ? `\nDue: ${task.dueDate}` : ''}${desc ? `\n\nDescription:\n${desc}` : ''}`);
            }}
          />

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Feature Description *
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                  What do you want the agents to build?
                </span>
              </label>
              <textarea
                className="textarea"
                value={featureDescription}
                onChange={(e) => setFeatureDescription(e.target.value)}
                placeholder="Describe the feature you want built. Be as detailed as possible — include user stories, acceptance criteria, and expected behavior..."
                rows={5}
                style={{ fontSize: 14 }}
              />
            </div>
          </div>

          {/* Feature Specs */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Feature Specs</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(optional)</span>
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

            {specs.map((spec, index) => (
              <div key={spec.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <GripVertical size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                    SPEC #{index + 1}
                  </span>
                  <input
                    className="input"
                    value={spec.title}
                    onChange={(e) => updateSpec(spec.id, 'title', e.target.value)}
                    placeholder="Spec title"
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
                  placeholder="Write your detailed spec here..."
                  rows={10}
                  style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
                />
              </div>
            ))}
          </div>

          {/* Build Feature Section */}
          <div className="card" style={{ marginTop: 16 }}>
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
                  Project: <strong>{selectedProject.name}</strong> · Workflow: <strong>{getActiveWorkflowName()}</strong> ({getActiveWorkflow().nodes.length} agents)
                  <span style={{ color: '#6366f1', marginLeft: 8 }}>📋 Planning Mode</span>
                </div>
                {reviewCycle && (
                  <div style={{
                    fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 4,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    🔄 Review Cycle {reviewCycle.cycle}/{reviewCycle.maxCycles} — Re-running {reviewCycle.agent}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!running ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleBuildFeature}
                    disabled={!featureDescription?.trim() || !selectedProject?.apiKey}
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

            {/* Planning mode info */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', marginBottom: 12, borderRadius: 8,
              background: '#f0f0ff', border: '1px solid #e0e0ff', fontSize: 12, color: '#4f46e5',
            }}>
              📋 Planning Mode — Agents produce architecture docs, implementation plans, and QA checklists. Hand the output to Claude Code or your coding tool to implement.
            </div>

            {/* Overall Pipeline Progress */}
            {Object.keys(nodeProgress).length > 0 && running && (() => {
              const total = Object.keys(nodeProgress).length;
              const done = Object.values(nodeProgress).filter((n) => n.status === 'done').length;
              const pct = Math.round((done / total) * 100);
              return (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Pipeline Progress
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                      {done}/{total} agents complete · {pct}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4, transition: 'width 0.5s ease',
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, var(--accent), #8b5cf6, #ec4899)',
                      backgroundSize: '200% 100%',
                      animation: pct < 100 ? 'progress-shimmer 2s linear infinite' : 'none',
                    }} />
                  </div>
                </div>
              );
            })()}

            {/* Review Cycle Badge */}
            {reviewCycle && (
              <div className="review-cycle-badge" style={{ marginBottom: 12 }}>
                🔄 Review Cycle {reviewCycle.cycle}/{reviewCycle.maxCycles} — Re-running {reviewCycle.agent}
              </div>
            )}

            {/* Agent Progress Pipeline (stacked cards) */}
            {Object.keys(nodeProgress).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(buildState.nodeOrder || Object.keys(nodeProgress)).map((nodeId, idx) => {
                  const np = nodeProgress[nodeId];
                  if (!np) return null;
                  return (
                  <div key={nodeId}>
                    {/* Connection arrow between agents */}
                    {idx > 0 && (
                      <div style={{
                        display: 'flex', justifyContent: 'center', height: 24,
                        position: 'relative',
                      }}>
                        <div style={{
                          width: 2, height: '100%',
                          background: np.status === 'running' || np.status === 'done'
                            ? 'linear-gradient(180deg, #6366f1, #a78bfa)'
                            : '#e5e7eb',
                          ...(np.status === 'running' ? {
                            backgroundSize: '100% 200%',
                            animation: 'data-flow 1.5s linear infinite',
                          } : {}),
                        }} />
                        {np.status === 'running' && (
                          <div style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 6, height: 6, borderRadius: '50%',
                            background: '#6366f1',
                            animation: 'data-dot-flow 1s ease-in-out infinite',
                          }} />
                        )}
                      </div>
                    )}

                    {/* Agent Card */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 10,
                      background: np.status === 'running'
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.04))'
                        : np.status === 'done' ? 'rgba(22,163,74,0.03)'
                        : np.status === 'error' ? 'rgba(239,68,68,0.03)'
                        : '#f9fafb',
                      border: `1.5px solid ${
                        np.status === 'running' ? 'rgba(99,102,241,0.3)' :
                        np.status === 'done' ? 'rgba(22,163,74,0.2)' :
                        np.status === 'error' ? 'rgba(239,68,68,0.2)' :
                        '#e5e7eb'
                      }`,
                      transition: 'all 0.4s ease',
                      ...(np.status === 'running' ? {
                        boxShadow: '0 4px 20px rgba(99,102,241,0.1)',
                        animation: 'row-glow 3s ease-in-out infinite',
                      } : {}),
                    }}>
                      {/* Avatar with animation */}
                      <div style={{
                        width: np.status === 'running' ? 48 : 40,
                        height: np.status === 'running' ? 48 : 40,
                        borderRadius: '50%',
                        background: np.status === 'done' ? '#16a34a' :
                                    np.status === 'error' ? '#ef4444' :
                                    np.color || '#6366f1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 700,
                        fontSize: np.status === 'running' ? 16 : 13,
                        flexShrink: 0,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        ...(np.status === 'running' ? {
                          animation: 'exec-pulse 2s infinite, exec-bounce 0.6s ease-in-out infinite alternate',
                          boxShadow: `0 0 16px ${np.color || '#6366f1'}55`,
                        } : np.status === 'done' ? {
                          animation: 'exec-done-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        } : {}),
                      }}>
                        {np.status === 'done' ? '✓' :
                         np.status === 'error' ? '✗' :
                         np.avatar || '??'}
                        {/* Spinning ring */}
                        {np.status === 'running' && (
                          <div style={{
                            position: 'absolute', inset: -4, borderRadius: '50%',
                            border: '2px solid transparent',
                            borderTopColor: '#6366f1', borderRightColor: '#a78bfa',
                            animation: 'avatar-ring-spin 1s linear infinite',
                          }} />
                        )}
                      </div>

                      {/* Name + Label */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600,
                          color: np.status === 'running' ? '#4f46e5' :
                                 np.status === 'done' ? '#16a34a' :
                                 np.status === 'error' ? '#ef4444' :
                                 '#6b7280',
                        }}>
                          {np.agentName || 'Agent'}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                          {np.label}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {np.status === 'pending' && (
                          <span style={{
                            padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: '#f3f4f6', color: '#9ca3af',
                          }}>Waiting</span>
                        )}
                        {np.status === 'running' && (
                          <span style={{
                            padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <Loader size={10} className="spin" />
                            {np.charCount > 0 ? 'Generating...' : 'Connecting...'}
                          </span>
                        )}
                        {np.status === 'done' && (
                          <span style={{
                            padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: 'rgba(22,163,74,0.1)', color: '#16a34a',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <Check size={10} /> Done
                          </span>
                        )}
                        {np.status === 'error' && (
                          <span style={{
                            padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <AlertCircle size={10} /> Error
                          </span>
                        )}
                      </div>

                      {/* Stats */}
                      <div style={{ textAlign: 'right', minWidth: 70 }}>
                        {np.charCount > 0 && (
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>
                            {np.charCount.toLocaleString()} chars
                          </div>
                        )}
                        {np.startTime && np.endTime && (
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>
                            {formatTime(Math.floor((np.endTime - np.startTime) / 1000))}
                          </div>
                        )}
                        {np.status === 'running' && np.startTime && elapsed >= 0 && (
                          <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>
                            {formatTime(Math.max(0, Math.floor((Date.now() - np.startTime) / 1000)))}
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div style={{
                        width: 80, height: 4, borderRadius: 2,
                        background: '#e5e7eb', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: 2, transition: 'width 0.5s ease',
                          width: np.status === 'done' ? '100%' :
                                 np.status === 'running' ? '60%' :
                                 np.status === 'error' ? '100%' : '0%',
                          background: np.status === 'done' ? '#16a34a' :
                                      np.status === 'running' ? 'linear-gradient(90deg, #6366f1, #a78bfa)' :
                                      np.status === 'error' ? '#ef4444' : '#e5e7eb',
                          ...(np.status === 'running' ? {
                            backgroundSize: '200% 100%',
                            animation: 'progress-shimmer 2s linear infinite',
                          } : {}),
                        }} />
                      </div>
                    </div>
                  </div>
                  );
                })}
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
                    {streamingOutput && <MarkdownRenderer content={streamingOutput} />}
                    {running && streamingOutput && <span className="cursor" />}
                  </div>
                )}
              </div>
            )}

            {/* Agent Output Accordion — editable, shown after pipeline completes */}
            {!running && useStore.getState().reports.length > 0 && (
              <AgentOutputAccordion
                reports={useStore.getState().reports}
                onUpdateReport={(reportId, newContent) => {
                  // Update the report content in the store
                  const currentReports = useStore.getState().reports;
                  const updated = currentReports.map((r) =>
                    r.id === reportId ? { ...r, content: newContent } : r
                  );
                  useStore.setState({ reports: updated });
                }}
              />
            )}

            {/* Action Buttons — shown after pipeline completes */}
            <PlanActions
              nodeProgress={nodeProgress}
              running={running}
              reports={useStore.getState().reports}
              repoPath={selectedProject?.repoPath}
              featureName={featureDescription?.substring(0, 60)}
              targetBranch={selectedProject?.targetBranch || 'develop'}
            />
          </div>
        </>
      )}
    </div>
  );
}
