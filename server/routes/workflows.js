import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/workflows
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM workflows WHERE customer_id = ? ORDER BY created_at DESC',
      [req.user.customerId]
    );
    res.json(rows.map(mapWorkflow));
  } catch (err) {
    next(err);
  }
});

// POST /api/workflows
router.post('/', async (req, res, next) => {
  try {
    const { name, nodes, edges } = req.body;
    const id = uuidv4();

    await pool.query(
      `INSERT INTO workflows (id, customer_id, name, nodes, edges, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.user.customerId, name || 'Untitled Workflow', JSON.stringify(nodes), JSON.stringify(edges), req.user.userId]
    );

    const [rows] = await pool.query('SELECT * FROM workflows WHERE id = ?', [id]);
    res.status(201).json(mapWorkflow(rows[0]));
  } catch (err) {
    next(err);
  }
});

// PUT /api/workflows/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, nodes, edges } = req.body;

    const [result] = await pool.query(
      `UPDATE workflows SET name=?, nodes=?, edges=? WHERE id=? AND customer_id=?`,
      [name, JSON.stringify(nodes), JSON.stringify(edges), req.params.id, req.user.customerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const [rows] = await pool.query('SELECT * FROM workflows WHERE id = ?', [req.params.id]);
    res.json(mapWorkflow(rows[0]));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/workflows/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM workflows WHERE id = ? AND customer_id = ?',
      [req.params.id, req.user.customerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

function mapWorkflow(row) {
  return {
    id: row.id,
    name: row.name,
    workflow: {
      nodes: typeof row.nodes === 'string' ? JSON.parse(row.nodes) : row.nodes,
      edges: typeof row.edges === 'string' ? JSON.parse(row.edges) : row.edges,
    },
    createdAt: row.created_at,
  };
}

export default router;
