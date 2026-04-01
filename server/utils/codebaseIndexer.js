/**
 * Codebase Indexer — intelligently reads a project and builds a condensed context.
 * Knows what to read, what to skip, and what matters most.
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

// ─── Skip Rules ───
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '__pycache__',
  'venv', '.venv', 'env', '.env', '.tox', 'vendor', 'target', 'out',
  '.cache', '.parcel-cache', '.turbo', 'coverage', '.nyc_output',
  '.idea', '.vscode', '.DS_Store', 'tmp', 'temp', 'logs',
  'android/build', 'ios/Pods', '.gradle', '.dart_tool',
]);

const SKIP_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.woff', '.woff2', '.ttf', '.eot',
  '.zip', '.tar', '.gz', '.rar', '.7z', '.pdf', '.doc', '.docx',
  '.lock', '.min.js', '.min.css', '.map', '.chunk.js',
  '.pyc', '.pyo', '.so', '.dylib', '.dll', '.exe', '.o', '.a',
]);

// Files that reveal project structure (read first, always)
const HIGH_PRIORITY_FILES = [
  'package.json', 'tsconfig.json', 'vite.config.js', 'vite.config.ts',
  'next.config.js', 'next.config.ts', 'webpack.config.js',
  'Cargo.toml', 'go.mod', 'requirements.txt', 'Pipfile', 'pyproject.toml',
  'Gemfile', 'composer.json', 'pom.xml', 'build.gradle',
  '.env.example', 'docker-compose.yml', 'Dockerfile', 'Makefile',
  'README.md', 'readme.md',
];

// Files that define app structure (read if small enough)
const MEDIUM_PRIORITY_PATTERNS = [
  /^src\/(index|main|app)\.(js|jsx|ts|tsx)$/i,
  /^(app|src)\/layout\.(js|jsx|ts|tsx)$/i,
  /^(app|src)\/routes?\.(js|jsx|ts|tsx)$/i,
  /^server\/(index|app|server)\.(js|ts)$/i,
  /^(api|routes|controllers)\//,
  /^(models|schemas|types)\//,
  /^(middleware|lib|utils)\//,
  /\.(schema|model|migration)\.(js|ts|py|rb)$/,
  /^(prisma\/schema\.prisma|drizzle\.config\.\w+)$/,
];

const MAX_FILE_SIZE = 8 * 1024; // 8KB per file
const MAX_TOTAL_CONTEXT = 24 * 1024; // 24KB total (~6K tokens — safe for rate limits)
const MAX_FILES_TO_READ = 15; // Read fewer files (agents can read_file for more)

/**
 * Index a codebase and return a structured context string.
 */
export async function indexCodebase(repoPath) {
  if (!repoPath) return null;

  try {
    await fs.access(repoPath);
  } catch {
    return null;
  }

  const result = {
    projectType: null,
    fileTree: '',
    configFiles: [],
    sourceFiles: [],
    stats: { totalFiles: 0, totalDirs: 0, languages: {} },
  };

  // 1. Build file tree
  const allFiles = [];
  await walkDirectory(repoPath, '', allFiles, 0, 6);

  result.stats.totalFiles = allFiles.filter((f) => f.type === 'file').length;
  result.stats.totalDirs = allFiles.filter((f) => f.type === 'dir').length;

  // Count languages
  for (const file of allFiles) {
    if (file.type !== 'file') continue;
    const ext = path.extname(file.relativePath).toLowerCase();
    const lang = EXT_TO_LANG[ext];
    if (lang) {
      result.stats.languages[lang] = (result.stats.languages[lang] || 0) + 1;
    }
  }

  // 2. Build tree string (compact)
  result.fileTree = buildTreeString(allFiles);

  // 3. Detect project type
  const fileNames = new Set(allFiles.map((f) => f.relativePath));
  result.projectType = detectProjectType(fileNames);

  // 4. Read high-priority config files
  let totalSize = 0;
  for (const filename of HIGH_PRIORITY_FILES) {
    if (totalSize > MAX_TOTAL_CONTEXT) break;
    const filePath = path.join(repoPath, filename);
    const content = await safeReadFile(filePath);
    if (content) {
      result.configFiles.push({ path: filename, content: truncateContent(content, 5000) });
      totalSize += content.length;
    }
  }

  // 5. Read medium-priority source files
  const sourceFilePaths = allFiles
    .filter((f) => f.type === 'file')
    .map((f) => f.relativePath)
    .filter((p) => MEDIUM_PRIORITY_PATTERNS.some((pat) => pat.test(p)))
    .slice(0, MAX_FILES_TO_READ);

  for (const relativePath of sourceFilePaths) {
    if (totalSize > MAX_TOTAL_CONTEXT) break;
    const filePath = path.join(repoPath, relativePath);
    const content = await safeReadFile(filePath);
    if (content) {
      result.sourceFiles.push({ path: relativePath, content: truncateContent(content, MAX_FILE_SIZE) });
      totalSize += Math.min(content.length, MAX_FILE_SIZE);
    }
  }

  // 6. Get git info
  let gitInfo = null;
  try {
    const branch = execSync('git branch --show-current', { cwd: repoPath, encoding: 'utf-8', timeout: 3000 }).trim();
    const recentCommits = execSync('git log --oneline -5', { cwd: repoPath, encoding: 'utf-8', timeout: 3000 }).trim();
    gitInfo = { branch, recentCommits };
  } catch {}

  // 7. Build final context string
  return buildContextString(result, gitInfo, repoPath);
}

async function walkDirectory(basePath, relativePath, results, depth, maxDepth) {
  if (depth > maxDepth) return;

  const fullPath = path.join(basePath, relativePath);
  let entries;
  try {
    entries = await fs.readdir(fullPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const entryRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
      results.push({ type: 'dir', relativePath: entryRelative, depth });
      await walkDirectory(basePath, entryRelative, results, depth + 1, maxDepth);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SKIP_EXTENSIONS.has(ext)) continue;
      results.push({ type: 'file', relativePath: entryRelative, depth });
    }
  }
}

function buildTreeString(files) {
  const lines = [];
  for (const f of files) {
    const indent = '  '.repeat(f.depth);
    const icon = f.type === 'dir' ? '📁' : '📄';
    const name = path.basename(f.relativePath);
    lines.push(`${indent}${icon} ${name}`);
  }
  // Truncate if tree is huge
  if (lines.length > 200) {
    return lines.slice(0, 200).join('\n') + `\n... and ${lines.length - 200} more files`;
  }
  return lines.join('\n');
}

function detectProjectType(fileNames) {
  if (fileNames.has('package.json')) {
    if (fileNames.has('next.config.js') || fileNames.has('next.config.ts')) return 'Next.js';
    if (fileNames.has('vite.config.js') || fileNames.has('vite.config.ts')) return 'Vite/React';
    if (fileNames.has('angular.json')) return 'Angular';
    if (fileNames.has('vue.config.js') || fileNames.has('nuxt.config.ts')) return 'Vue/Nuxt';
    if (fileNames.has('svelte.config.js')) return 'SvelteKit';
    if (fileNames.has('electron/main.js')) return 'Electron';
    if (fileNames.has('react-native.config.js') || fileNames.has('app.json')) return 'React Native';
    return 'Node.js';
  }
  if (fileNames.has('Cargo.toml')) return 'Rust';
  if (fileNames.has('go.mod')) return 'Go';
  if (fileNames.has('requirements.txt') || fileNames.has('pyproject.toml')) return 'Python';
  if (fileNames.has('Gemfile')) return 'Ruby';
  if (fileNames.has('pom.xml') || fileNames.has('build.gradle')) return 'Java/Kotlin';
  if (fileNames.has('composer.json')) return 'PHP';
  if (fileNames.has('Package.swift')) return 'Swift';
  if (fileNames.has('pubspec.yaml')) return 'Flutter/Dart';
  return 'Unknown';
}

async function safeReadFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    if (stat.size > MAX_FILE_SIZE) return null;
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function truncateContent(content, maxLen) {
  if (content.length <= maxLen) return content;
  return content.substring(0, maxLen) + '\n// ... truncated';
}

const EXT_TO_LANG = {
  '.js': 'JavaScript', '.jsx': 'JavaScript/React', '.ts': 'TypeScript', '.tsx': 'TypeScript/React',
  '.py': 'Python', '.rb': 'Ruby', '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.kt': 'Kotlin',
  '.swift': 'Swift', '.dart': 'Dart', '.php': 'PHP', '.cs': 'C#', '.cpp': 'C++', '.c': 'C',
  '.css': 'CSS', '.scss': 'SCSS', '.html': 'HTML', '.vue': 'Vue', '.svelte': 'Svelte',
  '.sql': 'SQL', '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.toml': 'TOML',
  '.md': 'Markdown', '.sh': 'Shell', '.dockerfile': 'Docker',
};

function buildContextString(result, gitInfo, repoPath) {
  let ctx = `# Project Codebase Context\n\n`;
  ctx += `**Path:** ${repoPath}\n`;
  ctx += `**Type:** ${result.projectType}\n`;
  ctx += `**Stats:** ${result.stats.totalFiles} files, ${result.stats.totalDirs} directories\n`;

  const langs = Object.entries(result.stats.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang, count]) => `${lang} (${count})`)
    .join(', ');
  if (langs) ctx += `**Languages:** ${langs}\n`;

  if (gitInfo) {
    ctx += `**Git Branch:** ${gitInfo.branch}\n`;
    ctx += `**Recent Commits:**\n\`\`\`\n${gitInfo.recentCommits}\n\`\`\`\n`;
  }

  ctx += `\n## File Tree\n\`\`\`\n${result.fileTree}\n\`\`\`\n\n`;

  if (result.configFiles.length > 0) {
    ctx += `## Configuration Files\n\n`;
    for (const file of result.configFiles) {
      ctx += `### ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
    }
  }

  if (result.sourceFiles.length > 0) {
    ctx += `## Key Source Files\n\n`;
    for (const file of result.sourceFiles) {
      ctx += `### ${file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
    }
  }

  return ctx;
}
