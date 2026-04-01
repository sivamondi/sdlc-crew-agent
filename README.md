# Cognia SDLC Crew

An intelligent software development lifecycle automation platform that orchestrates multi-agent AI workflows to design, develop, and test software features — from idea to implementation-ready planning documents.

---

## What It Does

Cognia SDLC Crew takes a feature description and your project context, then runs specialized AI agents (Architect, Developer, Tester) in a configurable workflow to produce a complete set of planning artifacts:

- **Architecture Design** — system design, component breakdown, data models
- **Implementation Plan** — step-by-step tasks ready for a developer (or Claude Code) to execute
- **QA Report** — test strategy, edge cases, acceptance criteria

The output is written directly into your project's `.sdlc/latest/` directory and a `.claude/commands/implement.md` slash command, making it immediately actionable in Claude Code with `/implement`.

---

## Key Features

| Feature | Description |
|---|---|
| Multi-agent workflows | Chain agents with custom system prompts in any topology |
| Visual workflow editor | Drag-and-drop canvas with cycle detection and dependency ordering |
| Claude API integration | Streaming responses from Claude Sonnet, Opus, and Haiku models |
| Local filesystem access | Standalone local agent reads your codebase for context injection |
| Codebase indexer | Intelligently indexes your project (skipping build artifacts, node_modules, etc.) |
| Project management | Multiple projects with per-project API keys, model selection, and git branch config |
| MCP task importer | Pull tasks from QuantumCompAIX MCP platform |
| Claude Code handoff | Generates `/implement` slash command and structured planning docs |
| Multi-user support | JWT auth, organization accounts, per-user settings |
| Export | Download all planning artifacts as a zip archive |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                    │
│  WorkflowEditor · FeatureBuild · ProjectManager     │
│  ExecutionFlow · ReportPanel · SettingsPage         │
└────────────────────────┬────────────────────────────┘
                         │ REST / Streaming
┌────────────────────────▼────────────────────────────┐
│               Express API Server (3001)             │
│  /api/auth  /api/projects  /api/workflows           │
│  /api/agents  /api/files  /api/health               │
│                  MySQL 8.0 Database                 │
└──────────────────┬──────────────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
 Claude API   Local Agent    MCP API
 (Streaming)   (port 9876)  (QuantumCompAIX)
```

### Directory Structure

```
sdlc-crew-agent/
├── src/                    # React frontend (Vite + React 19)
│   ├── components/         # UI components
│   ├── store/              # Zustand state (auth, workflow, local agent)
│   └── utils/              # Workflow engine, Claude client, codebase indexer
├── server/                 # Express backend
│   ├── routes/             # Auth, agents, workflows, projects, files
│   ├── middleware/         # JWT auth, error handling
│   └── schema.sql          # MySQL schema (5 tables)
├── electron/               # Electron desktop app
│   ├── main.js             # Main process + IPC handlers
│   └── preload.js          # Renderer bridge
├── local-agent/            # Standalone local filesystem server
│   └── index.js            # File browse/read API with auth
├── docker-compose.yml      # MySQL + Node services
├── Dockerfile              # Multi-stage production build
├── deploy.sh               # EC2 deployment script
└── nginx.conf              # Production reverse proxy config
```

---

## Tech Stack

**Frontend:** React 19, Vite, Zustand, React Flow, Framer Motion, Lucide React

**Backend:** Node.js, Express, MySQL 8 (mysql2), JWT, bcryptjs

**Desktop:** Electron 41, electron-builder (macOS DMG, Windows NSIS, Linux AppImage)

**Infrastructure:** Docker, Docker Compose, Nginx, PM2, AWS EC2

---

## Deployment Options

### 1. Electron Desktop App (recommended for local use)

```bash
# Development
npm run electron:dev

# Build distributable
npm run electron:build
```

The Electron build packages the full app into a standalone binary. API calls go directly to Claude (no server needed).

### 2. Docker Compose (local server / staging)

```bash
# Copy and fill in environment variables
cp .env.example .env

docker-compose up --build
```

The app will be available at `http://localhost:3001`.

Required environment variables:

```env
DB_HOST=mysql
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sdlc_crew
JWT_SECRET=your_jwt_secret
```

### 3. Production (AWS EC2 + Nginx)

```bash
./deploy.sh
```

PM2 manages the Node process. Nginx proxies port 80 to 3001 and serves the landing page and Electron download links.

---

## Local Agent Setup

The local agent gives the app read access to your filesystem so it can index your codebase for context.

```bash
cd local-agent
npm install
npm start          # runs on port 9876
```

In the app, go to **Settings → Local Agent** and connect with your token. Once connected, you can select a project folder and the app will automatically inject relevant code context into agent prompts.

---

## Workflow Engine

Workflows are directed acyclic graphs of agents. The engine:

1. Validates the graph (cycle detection)
2. Computes topological execution order (Kahn's algorithm)
3. Builds each node's prompt with project context + upstream outputs
4. Streams Claude API responses in real-time
5. Passes outputs downstream to dependent nodes

Each agent node has:
- A custom system prompt
- An output file mapping (e.g., `architecture-design.md`)
- Optional dependency on upstream agent outputs

---

## Claude Code Integration

After a workflow run, the app writes the following into your project:

```
your-project/
├── .sdlc/
│   └── latest/
│       ├── INSTRUCTIONS.md           # Git workflow + coding rules
│       ├── architecture-design.md    # System design
│       ├── implementation-plan.md    # Step-by-step tasks
│       └── qa-report.md              # Test strategy
└── .claude/
    └── commands/
        └── implement.md              # /implement slash command
```

Open Claude Code in your project and run `/implement` to start building.

---

## Development

```bash
# Install dependencies
npm install

# Run frontend + backend concurrently
npm run dev

# Frontend only (Vite dev server on 5173)
npm run dev:client

# Backend only (Node watch mode on 3001)
npm run dev:server
```

The Vite dev server proxies `/api` requests to `localhost:3001`.

---

## Database Schema

Five tables managed via `server/schema.sql`:

| Table | Purpose |
|---|---|
| `customers` | Organizations / tenants |
| `users` | User accounts with roles |
| `user_settings` | Per-user API key, model, MCP config |
| `projects` | Projects with repo path, API key, model |
| `agents` | Custom agent definitions |
| `workflows` | Saved workflow graph definitions |

---

## License

Proprietary — Cognia. All rights reserved.
