import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Folder, FolderOpen, ChevronRight, ArrowUp, Check, X, Loader, Home } from 'lucide-react';

export default function FolderPicker({ currentPath, onSelect, onClose }) {
  const [dirs, setDirs] = useState([]);
  const [current, setCurrent] = useState('');
  const [parent, setParent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projectInfo, setProjectInfo] = useState(null);

  const browse = async (path) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/files/browse?path=${encodeURIComponent(path || '')}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDirs(data.directories);
        setCurrent(data.current);
        setParent(data.parent);
        validateProject(data.current);
      }
    } catch (e) {
      setError('Failed to browse directory');
    }
    setLoading(false);
  };

  const validateProject = async (path) => {
    try {
      const res = await fetch(`/api/files/validate?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      setProjectInfo(data);
    } catch {
      setProjectInfo(null);
    }
  };

  useEffect(() => {
    browse(currentPath || '');
  }, []);

  const breadcrumbs = current.split('/').filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ width: 600 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="modal-title" style={{ margin: 0 }}>Select Project Folder</div>
          <button className="step-action-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Breadcrumb path */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px',
          background: 'var(--bg-tertiary)', borderRadius: 'var(--radius)', marginBottom: 12,
          fontSize: 12, color: 'var(--text-secondary)', overflowX: 'auto', whiteSpace: 'nowrap',
        }}>
          <button
            className="step-action-btn"
            onClick={() => browse('')}
            style={{ padding: 2 }}
          >
            <Home size={14} />
          </button>
          <span>/</span>
          {breadcrumbs.map((crumb, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                onClick={() => browse('/' + breadcrumbs.slice(0, i + 1).join('/'))}
                style={{
                  background: 'none', border: 'none', color: 'var(--accent)',
                  cursor: 'pointer', fontSize: 12, padding: '0 2px',
                }}
              >
                {crumb}
              </button>
              {i < breadcrumbs.length - 1 && <ChevronRight size={10} style={{ color: 'var(--text-muted)' }} />}
            </span>
          ))}
        </div>

        {/* Project validation badge */}
        {projectInfo && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
            padding: '6px 10px', borderRadius: 'var(--radius)', fontSize: 12,
            background: projectInfo.valid ? 'rgba(5,150,105,0.08)' : 'var(--bg-tertiary)',
            color: projectInfo.valid ? 'var(--success)' : 'var(--text-muted)',
          }}>
            {projectInfo.valid ? (
              <>
                <Check size={14} />
                <span>Project detected: {projectInfo.markers.join(', ')}</span>
              </>
            ) : (
              <span>No project files detected in this directory</span>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button className="btn btn-sm btn-secondary" onClick={() => browse(parent)} disabled={current === parent}>
            <ArrowUp size={12} /> Up
          </button>
        </div>

        {/* Directory listing */}
        <div style={{
          maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', background: 'var(--bg-primary)',
        }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader size={20} className="spin" />
            </div>
          ) : error ? (
            <div style={{ padding: 16, color: 'var(--error)', fontSize: 13 }}>{error}</div>
          ) : dirs.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
              No subdirectories
            </div>
          ) : (
            dirs.map((dir) => (
              <div
                key={dir.path}
                onClick={() => browse(dir.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Folder size={16} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                <span>{dir.name}</span>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => { onSelect(current); onClose(); }}
          >
            <FolderOpen size={14} /> Select This Folder
          </button>
        </div>
      </motion.div>
    </div>
  );
}
