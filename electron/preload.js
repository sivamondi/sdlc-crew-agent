const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  writePlans: (repoPath, files, featureName, targetBranch) => ipcRenderer.invoke('write-plans', repoPath, files, featureName, targetBranch),
  launchClaudeCode: (repoPath, mode) => ipcRenderer.invoke('launch-claude-code', repoPath, mode),
  indexCodebase: (repoPath) => ipcRenderer.invoke('index-codebase', repoPath),
});
