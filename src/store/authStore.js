import { create } from 'zustand';
import { getToken, setToken, clearToken, get, post, put } from '../utils/apiClient';

const useAuthStore = create((set, getState) => ({
  user: null,
  customer: null,
  settings: null,
  token: getToken(),
  isAuthenticated: false,
  loading: true,

  // Load user from stored token
  loadUser: async () => {
    const token = getToken();
    if (!token) {
      set({ loading: false, isAuthenticated: false });
      return;
    }
    try {
      const data = await get('/api/auth/me');
      set({
        user: data.user,
        customer: data.customer,
        settings: data.settings || null,
        token,
        isAuthenticated: true,
        loading: false,
      });
    } catch {
      clearToken();
      set({ user: null, customer: null, settings: null, token: null, isAuthenticated: false, loading: false });
    }
  },

  // Login
  login: async (email, password) => {
    const data = await post('/api/auth/login', { email, password });
    setToken(data.token);
    set({
      user: data.user,
      customer: data.customer,
      token: data.token,
      isAuthenticated: true,
    });
    // Fetch settings after login
    try {
      const settings = await get('/api/auth/settings');
      set({ settings });
    } catch {}
    return data;
  },

  // Signup — pass customerId to join existing org, or customerName to create new
  signup: async (customerName, name, email, password, customerId) => {
    const data = await post('/api/auth/signup', { customerName, customerId, name, email, password });
    setToken(data.token);
    set({
      user: data.user,
      customer: data.customer,
      token: data.token,
      isAuthenticated: true,
      settings: {
        defaultApiKey: '',
        mcpApiUrl: '',
        mcpUserId: '',
        defaultModel: 'claude-sonnet-4-20250514',
        defaultMaxTokens: 16384,
      },
    });
    return data;
  },

  // Update settings
  updateSettings: async (updates) => {
    const current = getState().settings || {};
    const merged = { ...current, ...updates };
    set({ settings: merged });
    try {
      const saved = await put('/api/auth/settings', merged);
      set({ settings: saved });
      return saved;
    } catch (err) {
      console.error('Failed to save settings:', err);
      throw err;
    }
  },

  // Logout
  logout: () => {
    clearToken();
    set({ user: null, customer: null, settings: null, token: null, isAuthenticated: false });
  },

  setCustomer: (customer) => set({ customer }),
}));

export default useAuthStore;
