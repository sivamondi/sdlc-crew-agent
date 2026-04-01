import { Router } from 'express';
import { readdir, stat, mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';

const router = Router();

// ── MCP Task Integration ──
// Fetch tasks from external MCP tool
router.get('/mcp-tasks', async (req, res) => {
  const { apiUrl, userId } = req.query;
  if (!apiUrl) {
    return res.status(400).json({ error: 'apiUrl is required' });
  }

  try {
    const url = userId ? `${apiUrl}?userId=${userId}` : apiUrl;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ error: `MCP API returned ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'MCP API timed out' });
    }
    res.status(500).json({ error: `Failed to fetch tasks: ${err.message}` });
  }
});

// List directories at a given path
router.get('/browse', async (req, res, next) => {
  try {
    const requestedPath = req.query.path || homedir();
    const absPath = resolve(requestedPath);

    const entries = await readdir(absPath, { withFileTypes: true });
    const dirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => ({
        name: e.name,
        path: join(absPath, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      current: absPath,
      parent: resolve(absPath, '..'),
      directories: dirs,
    });
  } catch (err) {
    res.status(400).json({ error: `Cannot read directory: ${err.message}` });
  }
});

// Check if a path is a valid project (has package.json, pom.xml, etc.)
router.get('/validate', async (req, res) => {
  const requestedPath = req.query.path;
  if (!requestedPath) return res.json({ valid: false });

  const absPath = resolve(requestedPath);
  const markers = ['package.json', 'pom.xml', 'build.gradle', 'Cargo.toml', 'go.mod', 'requirements.txt', 'Gemfile', 'composer.json', '.git'];

  const found = [];
  for (const marker of markers) {
    try {
      await stat(join(absPath, marker));
      found.push(marker);
    } catch {}
  }

  res.json({
    valid: found.length > 0,
    path: absPath,
    markers: found,
  });
});

// Cache for codebase indexes (path → { context, timestamp })
const indexCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

router.get('/index', async (req, res) => {
  const requestedPath = req.query.path;
  if (!requestedPath) return res.status(400).json({ error: 'path is required' });

  const absPath = resolve(requestedPath);
  const cached = indexCache.get(absPath);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return res.json({ context: cached.context, path: absPath, chars: cached.context.length, cached: true });
  }

  try {
    const { indexCodebase } = await import('../utils/codebaseIndexer.js');
    const context = await indexCodebase(absPath);
    if (!context) {
      return res.status(400).json({ error: 'Could not index the codebase' });
    }
    indexCache.set(absPath, { context, timestamp: Date.now() });
    res.json({ context, path: absPath, chars: context.length, cached: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Write planning docs to project directory — each feature gets its own subfolder
router.post('/write-plans', async (req, res) => {
  const { repoPath, files, featureName } = req.body;
  if (!repoPath || !files?.length) {
    return res.status(400).json({ error: 'repoPath and files are required' });
  }

  const absPath = resolve(repoPath);

  // Create a feature-specific subfolder: .sdlc/{date}_{feature-slug}/
  const date = new Date().toISOString().split('T')[0]; // 2026-03-24
  const slug = (featureName || 'feature')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  const folderName = `${date}_${slug}`;
  const featureDir = join(absPath, '.sdlc', folderName);

  // Also write a "latest" symlink/copy for easy access
  const latestDir = join(absPath, '.sdlc', 'latest');

  try {
    // Create feature-specific directory
    await mkdir(featureDir, { recursive: true });

    const written = [];
    for (const file of files) {
      const filePath = join(featureDir, file.name);
      await writeFile(filePath, file.content, 'utf-8');
      written.push(filePath);
    }

    // Also write to /latest/ for easy Claude Code access
    await mkdir(latestDir, { recursive: true });
    for (const file of files) {
      const filePath = join(latestDir, file.name);
      await writeFile(filePath, file.content, 'utf-8');
    }

    // Write a README to .sdlc/ listing all features
    const sdlcRoot = join(absPath, '.sdlc');
    const { readdir } = await import('fs/promises');
    const entries = await readdir(sdlcRoot, { withFileTypes: true });
    const features = entries
      .filter((e) => e.isDirectory() && e.name !== 'latest')
      .map((e) => e.name)
      .sort()
      .reverse();

    const readme = `# SDLC Planning Documents\n\nGenerated by SDLC Agent Crew.\n\n## Features\n\n${features.map((f) => `- \`${f}/\``).join('\n')}\n\n## Latest\n\nThe \`latest/\` folder always contains the most recent planning run.\n\nTo implement with Claude Code:\n\`\`\`bash\nclaude "Read the files in .sdlc/latest/ and implement the plan."\n\`\`\`\n`;
    await writeFile(join(sdlcRoot, 'README.md'), readme, 'utf-8');

    res.json({ ok: true, directory: featureDir, latestDirectory: latestDir, files: written, folderName });
  } catch (err) {
    res.status(500).json({ error: `Failed to write files: ${err.message}` });
  }
});

// Launch Claude Desktop or Terminal with planning docs context
router.post('/launch-claude-code', async (req, res) => {
  const { repoPath, prompt, mode } = req.body; // mode: 'desktop' | 'terminal'
  if (!repoPath) {
    return res.status(400).json({ error: 'repoPath is required' });
  }

  const absPath = resolve(repoPath);
  const sdlcDir = join(absPath, '.sdlc');
  const defaultPrompt = prompt || `I have planning documents for a new feature in ${absPath}/.sdlc/latest/ folder. Please read these files and implement the plan:\n\n1. .sdlc/latest/architecture-design.md — Architecture design document\n2. .sdlc/latest/implementation-plan.md — Detailed implementation plan\n3. .sdlc/latest/qa-report.md — QA checklist and test plan\n\nStart with the architecture doc, then follow the implementation plan step by step. After implementation, verify against the QA checklist.`;

  const platform = process.platform;

  // Copy prompt to clipboard
  const copyToClipboard = (text) => {
    return new Promise((resolve, reject) => {
      if (platform === 'darwin') {
        const proc = exec('pbcopy', (err) => err ? reject(err) : resolve());
        proc.stdin.write(text);
        proc.stdin.end();
      } else if (platform === 'win32') {
        const proc = exec('clip', (err) => err ? reject(err) : resolve());
        proc.stdin.write(text);
        proc.stdin.end();
      } else {
        exec(`echo "${text.replace(/"/g, '\\"')}" | xclip -selection clipboard`, (err) => err ? reject(err) : resolve());
      }
    });
  };

  // ── Terminal Mode: launch claude CLI in a new terminal ──
  if (mode === 'terminal') {
    exec('which claude', (err) => {
      if (err) {
        return res.json({
          ok: false,
          error: 'Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code',
        });
      }

      const escapedPrompt = defaultPrompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      let command;
      if (platform === 'darwin') {
        command = `osascript -e 'tell application "Terminal" to do script "cd \\"${absPath}\\" && claude \\"${escapedPrompt}\\""' -e 'tell application "Terminal" to activate'`;
      } else if (platform === 'win32') {
        command = `start cmd /k "cd /d "${absPath}" && claude "${escapedPrompt}""`;
      } else {
        command = `x-terminal-emulator -e bash -c 'cd "${absPath}" && claude "${escapedPrompt}"'`;
      }

      exec(command, (err) => {
        if (err) {
          return res.json({
            ok: true, method: 'manual',
            message: `Could not open terminal automatically. Run: cd "${absPath}" && claude`,
          });
        }
        res.json({ ok: true, method: 'terminal', message: 'Claude Code launched in Terminal!' });
      });
    });
    return;
  }

  // ── Desktop Mode: open Claude Desktop app + copy prompt to clipboard ──
  try {
    await copyToClipboard(defaultPrompt);
  } catch {}

  const appNames = ['Claude', 'Claude Desktop', 'claude'];
  let opened = false;
  for (const name of appNames) {
    try {
      const cmd = platform === 'darwin' ? `open -a "${name}"` :
                  platform === 'win32' ? `start "" "${name}"` : `xdg-open "${name}"`;
      await new Promise((resolve, reject) => {
        exec(cmd, (err) => err ? reject(err) : resolve());
      });
      opened = true;
      return res.json({
        ok: true, method: 'desktop', appName: name,
        message: `Claude Desktop opened! Prompt copied to clipboard — press Cmd+V to paste.`,
      });
    } catch {}
  }

  if (!opened) {
    res.json({
      ok: true, method: 'clipboard',
      message: 'Claude Desktop not found. Prompt copied to clipboard — open Claude Desktop manually and paste.',
    });
  }
});

export default router;
