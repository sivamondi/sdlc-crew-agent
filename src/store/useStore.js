import { create } from 'zustand';
import { get, post, put, del } from '../utils/apiClient';

const defaultWorkflow = {
  nodes: [
    {
      id: 'node-1',
      type: 'agentNode',
      position: { x: 250, y: 50 },
      data: { agentRole: 'architect', label: 'Architecture & Design', outputFile: 'architecture-design.md' },
    },
    {
      id: 'node-2',
      type: 'agentNode',
      position: { x: 250, y: 250 },
      data: { agentRole: 'developer', label: 'Implementation', outputFile: 'implementation-code.md' },
    },
    {
      id: 'node-3',
      type: 'agentNode',
      position: { x: 250, y: 450 },
      data: { agentRole: 'tester', label: 'QA Testing & Review', outputFile: 'qa-report.md' },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'node-1', target: 'node-2' },
    { id: 'e2-3', source: 'node-2', target: 'node-3' },
  ],
};

const useStore = create((set, getState) => ({
  // Data loading state
  dataLoaded: false,

  // Initialize — fetch all data from API
  init: async () => {
    try {
      const [agents, workflows, projects] = await Promise.all([
        get('/api/agents'),
        get('/api/workflows'),
        get('/api/projects'),
      ]);

      const updates = { dataLoaded: true };

      if (agents && agents.length > 0) {
        updates.agents = agents;
      }

      if (workflows && workflows.length > 0) {
        updates.savedWorkflows = workflows;
        // Auto-load the first saved workflow so positions are retained
        const first = workflows[0];
        if (first?.workflow) {
          updates.workflow = JSON.parse(JSON.stringify(first.workflow));
          updates.workflowName = first.name;
          updates.currentWorkflowId = first.id;
        }
      }

      updates.projects = projects || [];
      if (projects?.length > 0) {
        updates.selectedProjectId = projects[0].id;
      }

      set(updates);
    } catch (err) {
      console.error('Failed to load data:', err);
      set({ dataLoaded: true });
    }
  },

  // Agents
  agents: [],
  addAgent: async (agent) => {
    try {
      const created = await post('/api/agents', agent);
      set((s) => ({ agents: [...s.agents, created] }));
      return created;
    } catch (err) {
      console.error('Failed to create agent:', err);
      set((s) => ({ agents: [...s.agents, agent] }));
      return agent;
    }
  },
  updateAgent: async (id, updates) => {
    set((s) => ({ agents: s.agents.map((a) => (a.id === id ? { ...a, ...updates } : a)) }));
    try {
      const agent = getState().agents.find((a) => a.id === id);
      if (agent) {
        await put(`/api/agents/${id}`, agent);
      }
    } catch (err) {
      console.error('Failed to update agent:', err);
    }
  },
  removeAgent: async (id) => {
    set((s) => ({ agents: s.agents.filter((a) => a.id !== id) }));
    try {
      await del(`/api/agents/${id}`);
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
  },

  // Projects (multi-project)
  projects: [],
  selectedProjectId: null,

  getSelectedProject: () => {
    const state = getState();
    return state.projects.find((p) => p.id === state.selectedProjectId) || null;
  },

  selectProject: (id) => set({ selectedProjectId: id }),

  createProject: async (data) => {
    try {
      const created = await post('/api/projects', data);
      set((s) => ({
        projects: [created, ...s.projects],
        selectedProjectId: created.id,
      }));
      return created;
    } catch (err) {
      console.error('Failed to create project:', err);
      throw err;
    }
  },

  updateProject: async (id, updates) => {
    // Optimistic update
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    try {
      const project = getState().projects.find((p) => p.id === id);
      if (project) {
        const saved = await put(`/api/projects/${id}`, project);
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? saved : p)),
        }));
      }
    } catch (err) {
      console.error('Failed to update project:', err);
    }
  },

  deleteProject: async (id) => {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      selectedProjectId: s.selectedProjectId === id ? null : s.selectedProjectId,
    }));
    try {
      await del(`/api/projects/${id}`);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  },

  // Workflow (nodes + edges) — local state for the canvas
  workflow: defaultWorkflow,
  currentWorkflowId: null, // ID of the loaded saved workflow (null = unsaved/default)
  _workflowSaveTimer: null,

  setNodes: (nodes) => {
    set((s) => ({ workflow: { ...s.workflow, nodes } }));
    // Debounced auto-save to DB if a saved workflow is loaded
    const state = getState();
    if (state.currentWorkflowId) {
      clearTimeout(state._workflowSaveTimer);
      const timer = setTimeout(async () => {
        const { workflow, currentWorkflowId, workflowName } = getState();
        try {
          await put(`/api/workflows/${currentWorkflowId}`, {
            name: workflowName,
            nodes: workflow.nodes,
            edges: workflow.edges,
          });
        } catch (err) {
          console.error('Auto-save workflow failed:', err);
        }
      }, 1500);
      set({ _workflowSaveTimer: timer });
    }
  },

  setEdges: (edges) => {
    set((s) => ({ workflow: { ...s.workflow, edges } }));
    // Debounced auto-save
    const state = getState();
    if (state.currentWorkflowId) {
      clearTimeout(state._workflowSaveTimer);
      const timer = setTimeout(async () => {
        const { workflow, currentWorkflowId, workflowName } = getState();
        try {
          await put(`/api/workflows/${currentWorkflowId}`, {
            name: workflowName,
            nodes: workflow.nodes,
            edges: workflow.edges,
          });
        } catch (err) {
          console.error('Auto-save workflow failed:', err);
        }
      }, 1500);
      set({ _workflowSaveTimer: timer });
    }
  },
  addNode: (node) =>
    set((s) => ({ workflow: { ...s.workflow, nodes: [...s.workflow.nodes, node] } })),
  removeNode: (id) =>
    set((s) => ({
      workflow: {
        nodes: s.workflow.nodes.filter((n) => n.id !== id),
        edges: s.workflow.edges.filter((e) => e.source !== id && e.target !== id),
      },
    })),
  updateNodeData: (id, dataUpdates) =>
    set((s) => ({
      workflow: {
        ...s.workflow,
        nodes: s.workflow.nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...dataUpdates } } : n
        ),
      },
    })),

  // AI Settings (defaults, can be overridden by project)
  model: 'claude-sonnet-4-20250514',
  maxTokens: 8192,
  setModel: (model) => set({ model }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),

  // Execution (ephemeral, not persisted to DB — but stays in memory across tab switches)
  running: false,
  nodeStatus: {},
  activeNodeIds: [],
  selectedNodeId: null,
  activities: [],
  reports: [],

  // Build execution state (persists across tab switches)
  buildState: {
    nodeProgress: {},
    currentNodeId: null,
    streamingOutput: '',
    outputExpanded: true,
    startTime: null,
    elapsed: 0,
    fileWriteStatus: {},
    toolActivity: [],
    reviewCycle: null,
    nodeOrder: [],
    featureDescription: '',
    specs: [],
    selectedWorkflowId: 'current',
  },
  setBuildState: (updates) =>
    set((s) => ({ buildState: { ...s.buildState, ...updates } })),
  resetBuildState: () => {
    const prev = getState().buildState;
    set({
      buildState: {
        nodeProgress: {},
        currentNodeId: null,
        streamingOutput: '',
        outputExpanded: true,
        startTime: null,
        elapsed: 0,
        fileWriteStatus: {},
        toolActivity: [],
        reviewCycle: null,
        nodeOrder: [],
        featureDescription: prev.featureDescription,
        specs: prev.specs,
        selectedWorkflowId: prev.selectedWorkflowId,
      },
    });
  },

  setRunning: (running) => set({ running }),
  setNodeStatus: (nodeId, status) =>
    set((s) => ({ nodeStatus: { ...s.nodeStatus, [nodeId]: { ...s.nodeStatus[nodeId], ...status } } })),
  setActiveNodeIds: (activeNodeIds) => set({ activeNodeIds }),
  setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId }),
  resetExecution: () => set({ nodeStatus: {}, activeNodeIds: [], selectedNodeId: null }),
  addActivity: (activity) =>
    set((s) => ({ activities: [...s.activities, { ...activity, timestamp: new Date().toLocaleTimeString() }] })),
  clearActivities: () => set({ activities: [] }),
  addReport: (report) => set((s) => ({ reports: [...s.reports, report] })),
  clearReports: () => set({ reports: [] }),

  // Saved Workflows
  savedWorkflows: [],
  workflowName: 'Default Pipeline',
  setWorkflowName: (workflowName) => set({ workflowName }),
  saveWorkflow: async (name) => {
    const { workflow, currentWorkflowId } = getState();
    try {
      let saved;
      if (currentWorkflowId) {
        // Update existing workflow
        saved = await put(`/api/workflows/${currentWorkflowId}`, {
          name: name || 'Untitled Workflow',
          nodes: workflow.nodes,
          edges: workflow.edges,
        });
        set((s) => ({
          savedWorkflows: s.savedWorkflows.map((w) => (w.id === currentWorkflowId ? saved : w)),
          workflowName: name,
        }));
      } else {
        // Create new workflow
        saved = await post('/api/workflows', {
          name: name || 'Untitled Workflow',
          nodes: workflow.nodes,
          edges: workflow.edges,
        });
        set((s) => ({
          savedWorkflows: [...s.savedWorkflows, saved],
          workflowName: name,
          currentWorkflowId: saved.id,
        }));
      }
    } catch (err) {
      console.error('Failed to save workflow:', err);
    }
  },
  loadWorkflow: (id) => {
    const { savedWorkflows } = getState();
    const found = savedWorkflows.find((w) => w.id === id);
    if (found) {
      set({
        workflow: JSON.parse(JSON.stringify(found.workflow)),
        workflowName: found.name,
        currentWorkflowId: found.id,
      });
    }
  },
  deleteWorkflow: async (id) => {
    set((s) => ({ savedWorkflows: s.savedWorkflows.filter((w) => w.id !== id) }));
    try {
      await del(`/api/workflows/${id}`);
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
  },
  newWorkflow: () => {
    set({ workflow: defaultWorkflow, workflowName: 'New Workflow', currentWorkflowId: null });
  },

  // View
  activeView: 'projects',
  setActiveView: (activeView) => set({ activeView }),
  editingAgent: null,
  setEditingAgent: (editingAgent) => set({ editingAgent }),
}));

export default useStore;
