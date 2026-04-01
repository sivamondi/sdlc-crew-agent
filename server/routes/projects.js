import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/projects — list projects for this user
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM projects WHERE created_by = ? ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(rows.map(mapProject));
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id — get single project
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM projects WHERE id = ? AND created_by = ?',
      [req.params.id, req.user.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(mapProject(rows[0]));
  } catch (err) {
    next(err);
  }
});

// POST /api/projects — create new project
router.post('/', async (req, res, next) => {
  try {
    const { name, description, techConstraints, additionalContext, repoPath, apiKey, targetBranch, specs, model, maxTokens } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO projects (id, customer_id, created_by, name, description, tech_constraints, additional_context,
       repo_path, api_key, target_branch, specs, model, max_tokens) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, req.user.customerId, req.user.userId, name.trim(), description || '', techConstraints || '',
        additionalContext || '', repoPath || '', apiKey || '', targetBranch || 'develop',
        JSON.stringify(specs || []), model || 'claude-sonnet-4-20250514', maxTokens || 8192,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    res.status(201).json(mapProject(rows[0]));
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id — update project
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, techConstraints, additionalContext, repoPath, apiKey, targetBranch, specs, model, maxTokens } = req.body;

    const [result] = await pool.query(
      `UPDATE projects SET name=?, description=?, tech_constraints=?, additional_context=?,
       repo_path=?, api_key=?, target_branch=?, specs=?, model=?, max_tokens=? WHERE id=? AND customer_id=?`,
      [
        name || '', description || '', techConstraints || '', additionalContext || '',
        repoPath || '', apiKey || '', targetBranch || 'develop', JSON.stringify(specs || []),
        model || 'claude-sonnet-4-20250514', maxTokens || 8192,
        req.params.id, req.user.customerId,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    res.json(mapProject(rows[0]));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id — delete project
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM projects WHERE id = ? AND created_by = ?',
      [req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

function mapProject(row) {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || '',
    techConstraints: row.tech_constraints || '',
    additionalContext: row.additional_context || '',
    repoPath: row.repo_path || '',
    apiKey: row.api_key || '',
    targetBranch: row.target_branch || 'develop',
    specs: typeof row.specs === 'string' ? JSON.parse(row.specs) : (row.specs || []),
    model: row.model || 'claude-sonnet-4-20250514',
    maxTokens: row.max_tokens || 8192,
    createdAt: row.created_at,
  };
}

export default router;
