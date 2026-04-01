import { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Key, Globe, Cpu, Check, Loader } from 'lucide-react';
import useAuthStore from '../store/authStore';

const MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { id: 'claude-haiku-35-20241022', label: 'Claude 3.5 Haiku' },
];

const TOKEN_OPTIONS = [4096, 8192, 16384, 32768];

export default function SettingsPage() {
  const { settings, updateSettings, user } = useAuthStore();
  const [form, setForm] = useState({
    defaultApiKey: '',
    mcpApiUrl: '',
    mcpUserId: '',
    defaultModel: 'claude-sonnet-4-20250514',
    defaultMaxTokens: 16384,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        defaultApiKey: settings.defaultApiKey || '',
        mcpApiUrl: settings.mcpApiUrl || '',
        mcpUserId: settings.mcpUserId || '',
        defaultModel: settings.defaultModel || 'claude-sonnet-4-20250514',
        defaultMaxTokens: settings.defaultMaxTokens || 16384,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
    setSaving(false);
  };

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Settings</h2>
        <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>
          Global configuration for {user?.name}. These apply across all projects.
        </p>
      </div>

      {/* Anthropic API Key */}
      <div style={{
        background: 'white', borderRadius: 12, padding: 20, marginBottom: 16,
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Key size={16} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Anthropic API Key</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              Default key used when a project doesn't have its own
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            type={showApiKey ? 'text' : 'password'}
            value={form.defaultApiKey}
            onChange={(e) => updateField('defaultApiKey', e.target.value)}
            placeholder="sk-ant-api03-..."
            style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}
          />
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setShowApiKey(!showApiKey)}
            style={{ minWidth: 36 }}
          >
            {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
          Projects with their own API key will use that instead. This is the fallback.
        </div>
      </div>

      {/* MCP Integration */}
      <div style={{
        background: 'white', borderRadius: 12, padding: 20, marginBottom: 16,
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={16} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>QuantumCompAIX Integration</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              Connect to your task management system via MCP
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              API URL
            </label>
            <input
              className="input"
              value={form.mcpApiUrl}
              onChange={(e) => updateField('mcpApiUrl', e.target.value)}
              placeholder="http://ec2-xx-xx-xx-xx.compute-1.amazonaws.com/api/mcp/tasks"
              style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              User ID
            </label>
            <input
              className="input"
              value={form.mcpUserId}
              onChange={(e) => updateField('mcpUserId', e.target.value)}
              placeholder="your-user-id"
              style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
            />
          </div>
        </div>
      </div>

      {/* Default AI Settings */}
      <div style={{
        background: 'white', borderRadius: 12, padding: 20, marginBottom: 16,
        border: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #f59e0b, #eab308)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Cpu size={16} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Default AI Model</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              Used when a project doesn't specify its own model
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Model
            </label>
            <select className="input" value={form.defaultModel} onChange={(e) => updateField('defaultModel', e.target.value)}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: '#6b7280', display: 'block', marginBottom: 4 }}>
              Max Tokens
            </label>
            <select className="input" value={form.defaultMaxTokens} onChange={(e) => updateField('defaultMaxTokens', parseInt(e.target.value))}>
              {TOKEN_OPTIONS.map((t) => <option key={t} value={t}>{t.toLocaleString()}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {saving ? <Loader size={14} className="spin" /> :
           saved ? <Check size={14} /> :
           <Save size={14} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
