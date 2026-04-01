/**
 * Tool Executor — maps Claude tool_use calls to local agent API requests.
 * The server proxies tool calls to the user's local agent for filesystem access.
 */

// Tool definitions for Claude API
export const AGENT_TOOLS = [
  {
    name: 'read_file',
    description: 'Read the contents of a file. Use this to understand existing code before making changes.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file to read' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Create a NEW file or COMPLETELY REWRITE an existing file. For small edits to existing files, prefer edit_file instead.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path where to write the file' },
        content: { type: 'string', description: 'The full content to write to the file' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Make targeted edits to an existing file using search-and-replace. Safer than write_file because it only changes the specific parts you target, preserving the rest of the file. You MUST read_file first to see the exact content to match.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the file to edit' },
        edits: {
          type: 'array',
          description: 'Array of search/replace operations applied in order',
          items: {
            type: 'object',
            properties: {
              old_string: { type: 'string', description: 'Exact string to find in the file (must match exactly, including whitespace)' },
              new_string: { type: 'string', description: 'String to replace it with' },
            },
            required: ['old_string', 'new_string'],
          },
        },
      },
      required: ['path', 'edits'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and subdirectories in a directory.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the directory to list' },
      },
      required: ['path'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for a text pattern across project files. Returns matching file paths and line numbers with context.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the directory to search in' },
        pattern: { type: 'string', description: 'Text or regex pattern to search for' },
      },
      required: ['path', 'pattern'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command in the project directory. Use for: npm test, npm run build, git status, etc.',
    input_schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        cwd: { type: 'string', description: 'Working directory (absolute path)' },
      },
      required: ['command', 'cwd'],
    },
  },
];

/**
 * Execute a tool call by proxying to the local agent.
 * @param {string} toolName - The tool to execute
 * @param {object} toolInput - The tool's input parameters
 * @param {string} localAgentUrl - URL of the local agent (e.g., http://localhost:9876)
 * @param {string} localAgentToken - Auth token for the local agent
 * @returns {string} The tool result as a string for Claude
 */
export async function executeTool(toolName, toolInput, localAgentUrl, localAgentToken) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localAgentToken}`,
  };

  try {
    let response;

    switch (toolName) {
      case 'read_file': {
        response = await fetch(
          `${localAgentUrl}/files/read?path=${encodeURIComponent(toolInput.path)}`,
          { headers }
        );
        const data = await response.json();
        if (!response.ok) return `Error: ${data.error}`;
        return data.content;
      }

      case 'write_file': {
        response = await fetch(`${localAgentUrl}/files/write`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ filePath: toolInput.path, content: toolInput.content, mkdir: true }),
        });
        const data = await response.json();
        if (!response.ok) return `Error: ${data.error}`;
        return `File written successfully: ${toolInput.path} (${data.size} bytes)`;
      }

      case 'edit_file': {
        // Read → apply edits → write back (via local agent)
        response = await fetch(
          `${localAgentUrl}/files/read?path=${encodeURIComponent(toolInput.path)}`,
          { headers }
        );
        let readData = await response.json();
        if (!response.ok) return `Error reading file: ${readData.error}`;

        let content = readData.content;
        const results = [];
        for (const edit of toolInput.edits || []) {
          if (!content.includes(edit.old_string)) {
            results.push(`NOT FOUND: "${edit.old_string.substring(0, 60)}..."`);
            continue;
          }
          content = content.replace(edit.old_string, edit.new_string);
          results.push(`REPLACED: "${edit.old_string.substring(0, 40)}..." → "${edit.new_string.substring(0, 40)}..."`);
        }

        // Write back
        response = await fetch(`${localAgentUrl}/files/write`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ filePath: toolInput.path, content, mkdir: false }),
        });
        const writeData = await response.json();
        if (!response.ok) return `Error writing file: ${writeData.error}`;
        return `File edited: ${toolInput.path}\n${results.join('\n')}`;
      }

      case 'list_directory': {
        response = await fetch(
          `${localAgentUrl}/files/browse?path=${encodeURIComponent(toolInput.path)}`,
          { headers }
        );
        const data = await response.json();
        if (!response.ok) return `Error: ${data.error}`;
        const listing = data.items
          .map((i) => `${i.isDirectory ? '[DIR]' : '[FILE]'} ${i.name}`)
          .join('\n');
        return listing || '(empty directory)';
      }

      case 'search_files': {
        response = await fetch(
          `${localAgentUrl}/files/search?path=${encodeURIComponent(toolInput.path)}&pattern=${encodeURIComponent(toolInput.pattern)}`,
          { headers }
        );
        const data = await response.json();
        if (!response.ok) return `Error: ${data.error}`;
        return data.files.length > 0
          ? `Found ${data.count} file(s):\n${data.files.join('\n')}`
          : 'No matches found.';
      }

      case 'run_command': {
        response = await fetch(`${localAgentUrl}/exec`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ command: toolInput.command, cwd: toolInput.cwd }),
        });
        const data = await response.json();
        if (!response.ok) return `Error: ${data.error}`;
        let output = '';
        if (data.stdout) output += data.stdout;
        if (data.stderr) output += (output ? '\n' : '') + `STDERR: ${data.stderr}`;
        output += `\nExit code: ${data.exitCode}`;
        return output;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (err) {
    return `Tool execution failed: ${err.message}. Is the local agent running?`;
  }
}

/**
 * Execute a tool call directly in-process (Electron desktop mode).
 * No local agent needed — uses Node.js fs and child_process directly.
 */
export async function executeToolLocal(toolName, toolInput) {
  const fs = await import('fs/promises');
  const pathMod = await import('path');
  const { execSync } = await import('child_process');

  try {
    switch (toolName) {
      case 'read_file': {
        const content = await fs.readFile(toolInput.path, 'utf-8');
        return content;
      }

      case 'write_file': {
        await fs.mkdir(pathMod.dirname(toolInput.path), { recursive: true });
        await fs.writeFile(toolInput.path, toolInput.content, 'utf-8');
        const stat = await fs.stat(toolInput.path);
        return `File written successfully: ${toolInput.path} (${stat.size} bytes)`;
      }

      case 'edit_file': {
        let content = await fs.readFile(toolInput.path, 'utf-8');
        const results = [];
        for (const edit of toolInput.edits || []) {
          if (!content.includes(edit.old_string)) {
            results.push(`NOT FOUND: "${edit.old_string.substring(0, 60)}..."`);
            continue;
          }
          content = content.replace(edit.old_string, edit.new_string);
          results.push(`REPLACED: "${edit.old_string.substring(0, 40)}..." → "${edit.new_string.substring(0, 40)}..."`);
        }
        await fs.writeFile(toolInput.path, content, 'utf-8');
        return `File edited: ${toolInput.path}\n${results.join('\n')}`;
      }

      case 'list_directory': {
        const entries = await fs.readdir(toolInput.path, { withFileTypes: true });
        const listing = entries
          .filter((e) => !e.name.startsWith('.') || e.name === '.git')
          .sort((a, b) => {
            if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((e) => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`)
          .join('\n');
        return listing || '(empty directory)';
      }

      case 'search_files': {
        try {
          // Return content with line numbers for immediate context
          const result = execSync(
            `grep -rn --include='*.{js,jsx,ts,tsx,py,java,go,rs,rb,css,html,json,md,yml,yaml,sql,toml}' "${toolInput.pattern.replace(/"/g, '\\"')}" . 2>/dev/null | head -100`,
            { cwd: toolInput.path, encoding: 'utf-8', timeout: 10000 }
          );
          const lines = result.split('\n').filter(Boolean).map((l) => l.replace('./', ''));
          if (lines.length === 0) return 'No matches found.';

          // Group by file
          const byFile = {};
          for (const line of lines) {
            const [filePath, ...rest] = line.split(':');
            if (!byFile[filePath]) byFile[filePath] = [];
            byFile[filePath].push(rest.join(':'));
          }
          let output = `Found matches in ${Object.keys(byFile).length} file(s):\n\n`;
          for (const [file, matches] of Object.entries(byFile)) {
            output += `${file}:\n`;
            for (const m of matches.slice(0, 5)) {
              output += `  ${m}\n`;
            }
            if (matches.length > 5) output += `  ... and ${matches.length - 5} more matches\n`;
            output += '\n';
          }
          return output;
        } catch {
          return 'No matches found.';
        }
      }

      case 'run_command': {
        const ALLOWED = ['npm', 'npx', 'node', 'git', 'python', 'python3', 'pip', 'cargo', 'go', 'make', 'cat', 'ls', 'find', 'grep', 'wc', 'diff', 'head', 'tail', 'sort', 'tsc', 'eslint', 'prettier', 'jest', 'vitest', 'mocha'];
        const baseCmd = toolInput.command.trim().split(/\s+/)[0];
        if (!ALLOWED.includes(baseCmd)) {
          return `Error: Command '${baseCmd}' is not allowed.`;
        }
        try {
          const stdout = execSync(toolInput.command, {
            cwd: toolInput.cwd,
            encoding: 'utf-8',
            timeout: 60000,
            maxBuffer: 5 * 1024 * 1024,
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          return stdout + '\nExit code: 0';
        } catch (execErr) {
          let output = '';
          if (execErr.stdout) output += execErr.stdout;
          if (execErr.stderr) output += (output ? '\n' : '') + `STDERR: ${execErr.stderr}`;
          output += `\nExit code: ${execErr.status || 1}`;
          return output;
        }
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (err) {
    return `Tool execution failed: ${err.message}`;
  }
}

/**
 * Truncate tool result to prevent token overflow.
 */
export function truncateResult(result, maxChars = 10000) {
  if (!result || result.length <= maxChars) return result;
  return result.substring(0, maxChars) + `\n\n... (truncated, ${result.length} total chars)`;
}
