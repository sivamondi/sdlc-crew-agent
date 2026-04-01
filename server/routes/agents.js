import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/agents
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM agents WHERE customer_id = ? ORDER BY created_at ASC',
      [req.user.customerId]
    );
    const agents = rows.map(mapAgent);
    res.json(agents);
  } catch (err) {
    next(err);
  }
});

// POST /api/agents
router.post('/', async (req, res, next) => {
  try {
    const { name, role, avatar, color, skills, systemPrompt, outputFile } = req.body;
    const id = uuidv4();

    await pool.query(
      `INSERT INTO agents (id, customer_id, name, role, avatar, color, skills, system_prompt, output_file, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.customerId, name, role, avatar, color, JSON.stringify(skills || []), systemPrompt, outputFile, req.user.userId]
    );

    const [rows] = await pool.query('SELECT * FROM agents WHERE id = ?', [id]);
    res.status(201).json(mapAgent(rows[0]));
  } catch (err) {
    next(err);
  }
});

// PUT /api/agents/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, role, avatar, color, skills, systemPrompt, outputFile } = req.body;

    const [result] = await pool.query(
      `UPDATE agents SET name=?, role=?, avatar=?, color=?, skills=?, system_prompt=?, output_file=?
       WHERE id=? AND customer_id=?`,
      [name, role, avatar, color, JSON.stringify(skills || []), systemPrompt, outputFile, req.params.id, req.user.customerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const [rows] = await pool.query('SELECT * FROM agents WHERE id = ?', [req.params.id]);
    res.json(mapAgent(rows[0]));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/agents/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM agents WHERE id = ? AND customer_id = ?',
      [req.params.id, req.user.customerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

function mapAgent(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    color: row.color,
    skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : (row.skills || []),
    systemPrompt: row.system_prompt,
    outputFile: row.output_file,
  };
}

export default router;
