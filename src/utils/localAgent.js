/**
 * Local Agent Client — connects to the local filesystem agent running on the user's machine.
 * All methods are safe to call even if the agent is not running (they return null/false).
 */

const DEFAULT_URL = 'http://localhost:9876';

let agentUrl = DEFAULT_URL;
let authToken = localStorage.getItem('sdlc_local_agent_token') || '';

export function setAgentUrl(url) {
  agentUrl = url || DEFAULT_URL;
}

export function setToken(token) {
  authToken = token;
  localStorage.setItem('sdlc_local_agent_token', token);
}

export function getToken() {
  return authToken;
}

export function clearToken() {
  authToken = '';
  localStorage.removeItem('sdlc_local_agent_token');
}

function headers() {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

async function safeGet(path) {
  try {
    const res = await fetch(`${agentUrl}${path}`, { headers: headers() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      return null; // Agent not running
    }
    throw err;
  }
}

async function safePost(path, body) {
  try {
    const res = await fetch(`${agentUrl}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      return null; // Agent not running
    }
    throw err;
  }
}

/**
 * Check if the local agent is running and reachable.
 */
export async function checkAgent() {
  try {
    const res = await fetch(`${agentUrl}/status`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Authenticate with the local agent using a token.
 */
export async function authenticate(token) {
  try {
    const res = await fetch(`${agentUrl}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    if (data.authenticated) {
      setToken(token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Browse a directory on the local filesystem.
 */
export async function browseFiles(dirPath) {
  return safeGet(`/files/browse?path=${encodeURIComponent(dirPath)}`);
}

/**
 * Read a file from the local filesystem.
 */
export async function readFile(filePath) {
  return safeGet(`/files/read?path=${encodeURIComponent(filePath)}`);
}

/**
 * Write a file to the local filesystem.
 */
export async function writeFile(filePath, content) {
  return safePost('/files/write', { filePath, content, mkdir: true });
}

/**
 * Write multiple files at once.
 */
export async function writeBatch(files) {
  return safePost('/files/write-batch', { files });
}

/**
 * Get a file tree of a directory.
 */
export async function getFileTree(dirPath, depth = 3) {
  return safeGet(`/files/tree?path=${encodeURIComponent(dirPath)}&depth=${depth}`);
}

/**
 * Get git status for a directory.
 */
export async function gitStatus(dirPath) {
  return safePost('/git/status', { path: dirPath });
}

/**
 * Parse code blocks from agent output and extract files.
 * Returns array of { path, content } objects.
 *
 * Supports patterns like:
 *   ```jsx title="src/Button.jsx"
 *   // src/Button.jsx
 *   ```jsx
 *   ## File: src/Button.jsx
 */
export function parseCodeBlocks(output, basePath) {
  const files = [];
  const lines = output.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check for code block opening
    const codeBlockMatch = line.match(/^```(\w*)\s*(.*)?$/);
    if (codeBlockMatch) {
      let filePath = null;

      // Check title attribute: ```jsx title="src/Button.jsx"
      const titleMatch = codeBlockMatch[2]?.match(/title=["']([^"']+)["']/);
      if (titleMatch) {
        filePath = titleMatch[1];
      }

      // Check previous line for file path comment
      if (!filePath && i > 0) {
        const prevLine = lines[i - 1].trim();
        // Patterns: "// src/file.js", "# src/file.py", "## File: src/file.js", "**src/file.js**"
        const pathPatterns = [
          /^\/\/\s+(.+\.\w+)\s*$/,
          /^#\s+(.+\.\w+)\s*$/,
          /^##?\s+File:\s*(.+\.\w+)\s*$/,
          /^\*\*(.+\.\w+)\*\*\s*$/,
          /^`(.+\.\w+)`\s*$/,
          /^(.+\.\w+)\s*$/,
        ];
        for (const pattern of pathPatterns) {
          const m = prevLine.match(pattern);
          if (m && m[1].includes('/')) {
            filePath = m[1];
            break;
          }
        }
      }

      // Collect code block content
      i++;
      const contentLines = [];
      while (i < lines.length && !lines[i].startsWith('```')) {
        contentLines.push(lines[i]);
        i++;
      }

      if (filePath) {
        const fullPath = filePath.startsWith('/')
          ? filePath
          : `${basePath}/${filePath}`;
        files.push({ path: fullPath, content: contentLines.join('\n') });
      }
    }

    i++;
  }

  return files;
}
