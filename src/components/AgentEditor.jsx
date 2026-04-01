import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Copy, Trash2, X, Users } from 'lucide-react';
import useStore from '../store/useStore';
import { createAgent } from '../agents/defaults';
import { v4 as uuidv4 } from 'uuid';

function AgentForm({ agent, onSave, onCancel }) {
  const [form, setForm] = useState({ ...agent });
  const [skillInput, setSkillInput] = useState('');

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const addSkill = () => {
    if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
      update('skills', [...form.skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill) => update('skills', form.skills.filter((s) => s !== skill));

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{agent.id ? 'Edit Agent' : 'New Agent'}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Role ID</label>
            <input className="input" value={form.role} onChange={(e) => update('role', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Avatar (2 chars)</label>
            <input className="input" value={form.avatar} maxLength={2} onChange={(e) => update('avatar', e.target.value.toUpperCase())} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <input type="color" value={form.color} onChange={(e) => update('color', e.target.value)} style={{ width: '100%', height: 34, cursor: 'pointer' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Output Filename</label>
          <input className="input" value={form.outputFile} onChange={(e) => update('outputFile', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Skills</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              className="input"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="Add skill and press Enter"
            />
            <button className="btn btn-sm btn-secondary" onClick={addSkill}>Add</button>
          </div>
          <div className="agent-skills">
            {form.skills.map((skill) => (
              <span key={skill} className="skill-tag">
                {skill}
                <button onClick={() => removeSkill(skill)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 4, fontSize: 12 }}>
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">System Prompt</label>
          <textarea
            className="textarea"
            value={form.systemPrompt}
            onChange={(e) => update('systemPrompt', e.target.value)}
            rows={8}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function AgentEditor() {
  const { agents, addAgent, updateAgent, removeAgent, editingAgent, setEditingAgent } = useStore();

  const handleSave = (form) => {
    if (editingAgent === 'new') {
      addAgent({ ...form, id: uuidv4() });
    } else {
      updateAgent(editingAgent, form);
    }
    setEditingAgent(null);
  };

  const handleClone = (agent) => {
    addAgent(createAgent({
      ...agent,
      id: uuidv4(),
      name: `${agent.name} (Copy)`,
    }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={18} /> Agent Team ({agents.length})
        </h2>
        <button className="btn btn-primary btn-sm" onClick={() => setEditingAgent('new')}>
          <Plus size={14} /> New Agent
        </button>
      </div>

      <div className="agent-grid">
        <AnimatePresence>
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="agent-card"
            >
              <div className="agent-card-header">
                <div className="agent-card-avatar" style={{ background: agent.color }}>{agent.avatar}</div>
                <div className="agent-card-info">
                  <div className="agent-card-name">{agent.name}</div>
                  <div className="agent-card-role">{agent.role}</div>
                </div>
              </div>
              <div className="agent-skills">
                {agent.skills.map((skill) => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                Output: {agent.outputFile}
              </div>
              <div className="agent-card-actions">
                <button className="btn btn-sm btn-secondary" onClick={() => setEditingAgent(agent.id)}>
                  <Edit3 size={12} /> Edit
                </button>
                <button className="btn btn-sm btn-secondary" onClick={() => handleClone(agent)}>
                  <Copy size={12} />
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => removeAgent(agent.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {editingAgent && (
        <AgentForm
          agent={editingAgent === 'new' ? createAgent() : agents.find((a) => a.id === editingAgent)}
          onSave={handleSave}
          onCancel={() => setEditingAgent(null)}
        />
      )}
    </div>
  );
}
