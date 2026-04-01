import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, GitBranch, Users, Settings, FileText, Wifi, WifiOff,
  Rocket, LogOut, User, ChevronLeft, ChevronRight, Sliders,
} from 'lucide-react';
import useStore from './store/useStore';
import useAuthStore from './store/authStore';
import { checkHealth } from './utils/api';
import WorkflowEditor from './components/WorkflowEditor';
import AgentEditor from './components/AgentEditor';
import ReportPanel from './components/ReportPanel';
import ProjectManager from './components/ProjectManager';
import FeatureBuild from './components/FeatureBuild';
import LoginPage from './components/LoginPage';
import SettingsPage from './components/SettingsPage';

const NAV_ITEMS = [
  { id: 'build', label: 'Build', icon: Rocket },
  { id: 'projects', label: 'Projects', icon: Settings },
  { id: 'pipeline', label: 'Workflow', icon: GitBranch },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Sliders },
];

export default function App() {
  const { activeView, setActiveView, init } = useStore();
  const { isAuthenticated, loading: authLoading, loadUser, user, customer, logout } = useAuthStore();
  const [apiStatus, setApiStatus] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => { loadUser(); }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    checkHealth().then(setApiStatus).catch(() => setApiStatus({ status: 'error' }));
    init();
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fafafa' }}>
        <div style={{ textAlign: 'center' }}>
          <Bot size={40} style={{ color: '#6366f1', marginBottom: 12 }} />
          <p style={{ color: '#9ca3af' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#fafafa' }}>
      {/* ── Left Sidebar ── */}
      <aside style={{
        width: sidebarCollapsed ? 56 : 220,
        minWidth: sidebarCollapsed ? 56 : 220,
        background: '#1a1a2e',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* macOS traffic light spacer + App Title */}
        <div style={{
          padding: sidebarCollapsed ? '52px 8px 16px' : '52px 16px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          WebkitAppRegion: 'drag',
        }}>
          {!sidebarCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bot size={18} style={{ color: 'white' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>Cognia</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>SDLC Crew</div>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div style={{
              width: 32, height: 32, borderRadius: 8, margin: '0 auto',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={18} style={{ color: 'white' }} />
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: sidebarCollapsed ? '10px 0' : '10px 12px',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
                title={sidebarCollapsed ? item.label : undefined}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <item.icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Status + User at bottom */}
        <div style={{
          padding: sidebarCollapsed ? '12px 8px' : '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* API Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            marginBottom: 8,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: apiStatus?.status === 'ok' ? '#22c55e' : '#ef4444',
              boxShadow: apiStatus?.status === 'ok' ? '0 0 6px #22c55e55' : '0 0 6px #ef444455',
            }} />
            {!sidebarCollapsed && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                {apiStatus?.status === 'ok' ? 'Connected' : 'Disconnected'}
              </span>
            )}
          </div>

          {/* User */}
          {customer && !sidebarCollapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 0',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: 'white',
              }}>
                {(user?.name || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {customer.name}
                </div>
              </div>
              <button
                onClick={logout}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 4,
                  borderRadius: 4,
                }}
                title="Logout"
                onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
          {customer && sidebarCollapsed && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={logout}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', display: 'flex', padding: 4,
                }}
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'absolute', top: 58, right: -12,
            width: 24, height: 24, borderRadius: '50%',
            background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20,
          }}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{
          height: 48,
          minHeight: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)',
          borderBottom: '1px solid #eaecf0',
          WebkitAppRegion: 'drag',
        }}>
          {/* Left: Page icon + title + context */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {(() => {
              const item = NAV_ITEMS.find(t => t.id === activeView);
              const Icon = item?.icon || Rocket;
              return (
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(99,102,241,0.3)',
                }}>
                  <Icon size={14} style={{ color: 'white' }} />
                </div>
              );
            })()}
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', letterSpacing: '-0.01em' }}>
                {NAV_ITEMS.find(t => t.id === activeView)?.label || 'Build'}
              </span>
              {activeView === 'build' && (() => {
                const proj = useStore.getState().projects.find(p => p.id === useStore.getState().selectedProjectId);
                return proj ? (
                  <span style={{
                    fontSize: 11, color: '#9ca3af', fontWeight: 400, marginLeft: 8,
                    padding: '1px 6px', background: '#f3f4f6', borderRadius: 4,
                  }}>
                    {proj.name}
                  </span>
                ) : null;
              })()}
            </div>
          </div>

          {/* Right: Status pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              background: apiStatus?.status === 'ok'
                ? 'linear-gradient(135deg, #ecfdf5, #f0fdf4)'
                : 'linear-gradient(135deg, #fef2f2, #fff1f2)',
              border: `1px solid ${apiStatus?.status === 'ok' ? '#bbf7d0' : '#fecaca'}`,
              fontSize: 11, fontWeight: 500,
              color: apiStatus?.status === 'ok' ? '#16a34a' : '#ef4444',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: apiStatus?.status === 'ok' ? '#22c55e' : '#ef4444',
                boxShadow: `0 0 6px ${apiStatus?.status === 'ok' ? '#22c55e55' : '#ef444455'}`,
                animation: apiStatus?.status === 'ok' ? 'pulse-dot 2s ease-in-out infinite' : 'none',
              }} />
              {apiStatus?.status === 'ok' ? 'Connected' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
        <AnimatePresence mode="wait">
          {activeView === 'projects' && (
            <motion.div key="projects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProjectManager />
            </motion.div>
          )}
          {activeView === 'build' && (
            <motion.div key="build" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FeatureBuild />
            </motion.div>
          )}
          {activeView === 'pipeline' && (
            <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="workflow-view">
              <WorkflowEditor />
            </motion.div>
          )}
          {activeView === 'agents' && (
            <motion.div key="agents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AgentEditor />
            </motion.div>
          )}
          {activeView === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ReportPanel />
            </motion.div>
          )}
          {activeView === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsPage />
            </motion.div>
          )}
        </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
