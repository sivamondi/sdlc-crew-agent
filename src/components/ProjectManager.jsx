import { useState } from 'react';
import { Plus, Edit3, Trash2, FolderOpen, Eye, EyeOff, Save, X, Key, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import useStore from '../store/useStore';
import FolderPicker from './FolderPicker';

const MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { id: 'claude-haiku-35-20241022', label: 'Claude 3.5 Haiku' },
];

const TOKEN_OPTIONS = [4096, 8192, 16384, 32768];

export default function ProjectManager() {
  const { projects, createProject, updateProject, deleteProject } = useStore();
  const [editingId, setEditingId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', techConstraints: '', additionalContext: '',
    repoPath: '', apiKey: '', targetBranch: 'develop', model: 'claude-sonnet-4-20250514', maxTokens: 8192,
  });
  const [saving, setSaving] = useState(false);

  const startCreate = () => {
    setForm({
      name: '', description: '', techConstraints: '', additionalContext: '',
      repoPath: '', apiKey: '', targetBranch: 'develop', model: 'claude-sonnet-4-20250514', maxTokens: 8192,
    });
    setIsCreating(true);
    setEditingId(null);
    setShowApiKey(false);
  };

  const startEdit = (project) => {
    setForm({
      name: project.name,
      description: project.description || '',
      techConstraints: project.techConstraints || '',
      additionalContext: project.additionalContext || '',
      repoPath: project.repoPath || '',
      targetBranch: project.targetBranch || 'develop',
      apiKey: project.apiKey || '',
      model: project.model || 'claude-sonnet-4-20250514',
      maxTokens: project.maxTokens || 8192,
    });
    setEditingId(project.id);
    setIsCreating(false);
    setShowApiKey(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return alert('Project name is required');
    setSaving(true);
    try {
      if (isCreating) {
        await createProject(form);
      } else {
        await updateProject(editingId, form);
      }
      setEditingId(null);
      setIsCreating(false);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    await deleteProject(id);
    if (editingId === id) cancelEdit();
  };

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const renderForm = () => (
    <div className="card" style={{ marginBottom: 16, border: '2px solid var(--accent)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>
          {isCreating ? '✨ New Project' : '✏️ Edit Project'}
        </h3>
        <button className="btn btn-sm btn-secondary" onClick={cancelEdit}>
          <X size={14} /> Cancel
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Project Name *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="My Mobile App"
            autoFocus
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            <Key size={13} style={{ marginRight: 4 }} />
            Anthropic API Key
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: 11 }}>
              Required to run pipelines
            </span>
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="input"
              type={showApiKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={(e) => updateField('apiKey', e.target.value)}
              placeholder="sk-ant-api03-..."
              style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}
            />
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setShowApiKey(!showApiKey)}
              type="button"
              style={{ minWidth: 36 }}
            >
              {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Repository Path</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              className="input"
              value={form.repoPath}
              onChange={(e) => updateField('repoPath', e.target.value)}
              placeholder="/Users/you/projects/my-app"
              style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}
            />
            <button className="btn btn-sm btn-secondary" onClick={async () => {
              if (window.electronAPI?.selectFolder) {
                const folder = await window.electronAPI.selectFolder();
                if (folder) updateField('repoPath', folder);
              } else {
                setShowFolderPicker(true);
              }
            }}>
              <FolderOpen size={14} />
            </button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Description</label>
          <textarea
            className="textarea"
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Brief description of the project..."
            rows={2}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Tech Constraints</label>
          <textarea
            className="textarea"
            value={form.techConstraints}
            onChange={(e) => updateField('techConstraints', e.target.value)}
            placeholder="e.g., React Native, TypeScript, AWS..."
            rows={2}
            style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Model</label>
            <select className="input" value={form.model} onChange={(e) => updateField('model', e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Max Tokens</label>
            <select className="input" value={form.maxTokens} onChange={(e) => updateField('maxTokens', parseInt(e.target.value))}>
              {TOKEN_OPTIONS.map((t) => (
                <option key={t} value={t}>{t.toLocaleString()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Git Target Branch
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: 11 }}>
              PRs will target this branch
            </span>
          </label>
          <input
            className="input"
            value={form.targetBranch}
            onChange={(e) => updateField('targetBranch', e.target.value)}
            placeholder="develop"
            style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Additional Context</label>
          <textarea
            className="textarea"
            value={form.additionalContext}
            onChange={(e) => updateField('additionalContext', e.target.value)}
            placeholder="Any extra context for the agents..."
            rows={2}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
          <Save size={14} /> {saving ? 'Saving...' : isCreating ? 'Create Project' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Projects</h2>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
            Manage your projects. Each project has its own API key and settings.
          </p>
        </div>
        <button className="btn btn-primary" onClick={startCreate} disabled={isCreating}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {(isCreating || editingId) && renderForm()}

      {projects.length === 0 && !isCreating && (
        <div style={{
          padding: 48, textAlign: 'center', color: 'var(--text-muted)',
          border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)',
        }}>
          <Settings size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 14, fontWeight: 500 }}>No projects yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>
            Create your first project to start building features with AI agents.
          </p>
          <button className="btn btn-primary" onClick={startCreate} style={{ marginTop: 12 }}>
            <Plus size={16} /> Create First Project
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map((project) => (
          editingId === project.id ? null : (
            <div key={project.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{project.name || 'Untitled'}</span>
                    {project.apiKey ? (
                      <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: '#dcfce7', color: '#16a34a', fontWeight: 600,
                      }}>API Key Set</span>
                    ) : (
                      <span style={{
                        fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: '#fef3c7', color: '#d97706', fontWeight: 600,
                      }}>No API Key</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {project.repoPath && <span style={{ fontFamily: 'var(--mono)' }}>{project.repoPath}</span>}
                    {!project.repoPath && project.description && <span>{project.description.slice(0, 80)}</span>}
                    {!project.repoPath && !project.description && <span>No description</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {expandedId === project.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <button className="btn btn-sm btn-secondary" onClick={() => startEdit(project)}>
                    <Edit3 size={12} />
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(project.id, project.name)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {expandedId === project.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><strong>Model:</strong> {MODELS.find((m) => m.id === project.model)?.label || project.model}</div>
                    <div><strong>Max Tokens:</strong> {(project.maxTokens || 8192).toLocaleString()}</div>
                    {project.techConstraints && <div style={{ gridColumn: '1 / -1' }}><strong>Tech:</strong> {project.techConstraints}</div>}
                    {project.description && <div style={{ gridColumn: '1 / -1' }}><strong>Description:</strong> {project.description}</div>}
                  </div>
                </div>
              )}
            </div>
          )
        ))}
      </div>

      {showFolderPicker && (
        <FolderPicker
          currentPath={form.repoPath}
          onSelect={(path) => updateField('repoPath', path)}
          onClose={() => setShowFolderPicker(false)}
        />
      )}
    </div>
  );
}
