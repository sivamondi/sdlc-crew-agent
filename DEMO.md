# SDLC Crew — Demo

> An AI-powered software development lifecycle platform where a crew of specialized agents collaborates to plan, build, and validate your features.

---

## Video Walkthrough

<video src="https://github.com/user-attachments/assets/dc4630d3-5454-4d20-b0d8-5e94142144cb" controls width="100%">
  <a href="https://github.com/user-attachments/assets/dc4630d3-5454-4d20-b0d8-5e94142144cb">▶ Watch the demo</a>
</video>

---

## What It Does
SDLC Crew orchestrates a team of AI agents through your entire development lifecycle — from feature request to architecture design, implementation plan, and QA report — all in one unified workspace.

---

## Demo Script

### 1. Login & Dashboard

- Launch the app and log in with your credentials
- The sidebar shows the main sections: **Build**, **Projects**, **Workflow**, **Agents**, **Reports**, **Settings**
- The status pill in the top bar confirms the backend is connected

---

### 2. Projects — Create a Project

- Navigate to **Projects**
- Click **New Project** and give it a name (e.g., `E-Commerce Checkout`)
- Projects act as containers that scope your builds and reports

---

### 3. Agents — Meet the Crew

- Navigate to **Agents**
- Three default agents are ready out of the box:

| Avatar | Name | Role | Key Skills |
|--------|------|------|------------|
| TL | Technical Lead | architect | System Design, Architecture, API Design |
| DE | Developer | developer | React, Node.js, Full-Stack, Database |
| QA | QA Engineer | tester | Testing, Bug Reporting, Security Testing |

- Click **Edit** on any agent to update its name, avatar, color, skills, or system prompt
- Use **Clone** to duplicate and customize an agent for a new role
- Click **New Agent** to create a fully custom agent from scratch

---

### 4. Workflow — Visual Pipeline

- Navigate to **Workflow**
- The visual editor shows how agents are connected in a pipeline
- Drag agents to reorder them; the output of one feeds into the next
- This defines the execution order when a build is triggered

---

### 5. Build — Run the Crew

- Navigate to **Build** and select a project
- Describe the feature you want to build (e.g., *"Add a one-click checkout with Apple Pay support"*)
- Click **Run** to kick off the multi-agent pipeline
- Watch the **Activity Feed** as each agent streams its output in real time:
  - **Technical Lead** produces `architecture-design.md`
  - **Developer** produces `implementation-plan.md`
  - **QA Engineer** produces `qa-report.md`

---

### 6. Reports — Review the Output

- Navigate to **Reports**
- All agent-generated documents are listed per project
- Click any report to read the rendered Markdown output
- Download the full artifact set as a ZIP for use in your codebase or docs

---

### 7. Settings

- Configure your API keys and backend connection
- Adjust model preferences and other runtime options

---

## Key Features

- **Multi-agent orchestration** — specialized agents with distinct roles, skills, and system prompts
- **Visual workflow editor** — drag-and-drop pipeline configuration
- **Real-time activity feed** — streaming output from each agent as it runs
- **Project scoping** — organize builds and reports by project
- **Fully customizable agents** — edit any agent or create new ones without touching code
- **Downloadable artifacts** — export the full SDLC document set as a ZIP

---

## Tech Stack

- **Frontend**: React, Framer Motion, Lucide Icons
- **Backend**: Node.js / Express
- **AI**: Claude (Anthropic) via the SDLC agent runtime
