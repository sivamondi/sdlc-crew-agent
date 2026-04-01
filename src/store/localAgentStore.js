import { create } from 'zustand';
import { checkAgent, authenticate, clearToken, getToken } from '../utils/localAgent';

// Detect Electron desktop mode
const isElectron = !!(window.electronAPI?.isElectron);

const useLocalAgentStore = create((set, getState) => ({
  connected: isElectron, // Auto-connected in Electron
  checking: false,
  agentInfo: isElectron ? { status: 'ok', agent: 'electron-desktop', platform: window.electronAPI?.platform } : null,
  autoWriteEnabled: localStorage.getItem('sdlc_auto_write') !== 'false',
  showSetup: false,
  isElectron,

  setShowSetup: (showSetup) => set({ showSetup }),

  setAutoWrite: (enabled) => {
    localStorage.setItem('sdlc_auto_write', enabled ? 'true' : 'false');
    set({ autoWriteEnabled: enabled });
  },

  checkConnection: async () => {
    // In Electron, always connected
    if (isElectron) {
      set({ connected: true, checking: false });
      return;
    }

    set({ checking: true });
    try {
      const info = await checkAgent();
      if (info && info.status === 'ok') {
        const token = getToken();
        if (token) {
          const authed = await authenticate(token);
          set({ connected: authed, agentInfo: info, checking: false });
        } else {
          set({ connected: false, agentInfo: info, checking: false });
        }
      } else {
        set({ connected: false, agentInfo: null, checking: false });
      }
    } catch {
      set({ connected: false, agentInfo: null, checking: false });
    }
  },

  connect: async (token) => {
    if (isElectron) {
      set({ connected: true, showSetup: false });
      return true;
    }
    const authed = await authenticate(token);
    if (authed) {
      const info = await checkAgent();
      set({ connected: true, agentInfo: info, showSetup: false });
      return true;
    }
    return false;
  },

  disconnect: () => {
    if (isElectron) return; // Can't disconnect in Electron
    clearToken();
    set({ connected: false, agentInfo: null });
  },
}));

export default useLocalAgentStore;
