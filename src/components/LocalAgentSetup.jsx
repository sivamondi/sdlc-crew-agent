import { useState } from 'react';
import { X, Terminal, Check, AlertCircle, Wifi, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import useLocalAgentStore from '../store/localAgentStore';

export default function LocalAgentSetup() {
  const { showSetup, setShowSetup, connected, connect, disconnect, agentInfo, autoWriteEnabled, setAutoWrite } = useLocalAgentStore();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  if (!showSetup) return null;

  const handleConnect = async () => {
    if (!token.trim()) return;
    setConnecting(true);
    setError('');
    const success = await connect(token.trim());
    if (!success) {
      setError('Invalid token or agent not reachable. Make sure the local agent is running.');
    }
    setConnecting(false);
  };

  const handleDisconnect = () => {
    disconnect();
    setToken('');
    setError('');
  };

  const copyCommand = () => {
    navigator.clipboard.writeText('cd local-agent && node index.js');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 24, width: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Terminal size={20} /> Local Agent Setup
          </h2>
          <button onClick={() => setShowSetup(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {connected ? (
          <>
            <div style={{
              background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 8,
              padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Wifi size={16} style={{ color: '#16a34a' }} />
              <div>
                <div style={{ fontWeight: 600, color: '#16a34a' }}>Connected</div>
                <div style={{ fontSize: 12, color: '#15803d' }}>
                  {agentInfo?.hostname || 'Local machine'} · {agentInfo?.platform || 'unknown'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Auto-write files</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Automatically save agent output to project directory
                  </div>
                </div>
                <button
                  onClick={() => setAutoWrite(!autoWriteEnabled)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: autoWriteEnabled ? 'var(--accent)' : '#9ca3af' }}
                >
                  {autoWriteEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            </div>

            <button className="btn btn-danger" onClick={handleDisconnect} style={{ width: '100%' }}>
              Disconnect
            </button>
          </>
        ) : (
          <>
            <div style={{
              background: '#f0f4ff', border: '1px solid #dbe4ff', borderRadius: 8,
              padding: 16, marginBottom: 16,
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Step 1: Start the local agent</div>
              <div style={{
                background: '#1e293b', color: '#e2e8f0', borderRadius: 6, padding: 12,
                fontFamily: 'var(--mono)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>cd local-agent && node index.js</span>
                <button onClick={copyCommand} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                  <Copy size={14} />
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                Run this in a terminal in the SDLC Agent Crew project directory.
              </div>
            </div>

            <div style={{
              background: '#f0f4ff', border: '1px solid #dbe4ff', borderRadius: 8,
              padding: 16, marginBottom: 16,
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Step 2: Paste the auth token</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                The agent will show a token in the terminal. Copy and paste it below.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your auth token here..."
                  style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 12 }}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleConnect}
                  disabled={connecting || !token.trim()}
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                padding: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13,
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
