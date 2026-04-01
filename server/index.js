import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';
import healthRouter from './routes/health.js';
import agentRouter from './routes/agent.js';
import filesRouter from './routes/files.js';
import authRouter from './routes/auth.js';
import agentsRouter from './routes/agents.js';
import workflowsRouter from './routes/workflows.js';
import projectsRouter from './routes/projects.js';
import customerRouter from './routes/customer.js';
import { errorHandler } from './middleware/errorHandler.js';

// Prevent server crashes from unhandled errors
process.on('uncaughtException', (err) => {
  if (err.name === 'APIUserAbortError') return;
  console.error('Uncaught exception:', err.message);
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/agent', agentRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/workflows', workflowsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/customer', customerRouter);
app.use('/api/files', filesRouter);

// ── Electron mode: serve the React app (desktop only) ──
if (process.env.ELECTRON) {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distPath, 'index.html'));
    }
  });
}

// ── Production (AWS): serve landing page + downloads only, NO web app ──
if (process.env.NODE_ENV === 'production' && !process.env.ELECTRON) {
  const landingPath = join(__dirname, '..', 'landing');
  const downloadsPath = join(__dirname, '..', 'downloads');

  // Serve downloads (Electron packages)
  app.use('/downloads', express.static(downloadsPath));

  // Serve landing page at root
  app.use(express.static(landingPath));
  app.get('/', (req, res) => {
    res.sendFile(join(landingPath, 'index.html'));
  });

  // Block any other non-API routes (no web app access)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/downloads')) {
      res.redirect('/');
    }
  });
}

app.use(errorHandler);

// Verify DB connection on startup
pool.query('SELECT 1')
  .then(() => console.log('MySQL connected'))
  .catch((err) => console.warn('MySQL not connected:', err.message, '- app will work once DB is available'));

// Export a promise that resolves when server is ready (used by Electron)
export const serverReady = new Promise((resolve) => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    resolve();
  });
});
