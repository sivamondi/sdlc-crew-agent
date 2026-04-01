import { Router } from 'express';
import pool from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// GET /api/customer
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, created_at FROM customers WHERE id = ?',
      [req.user.customerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const c = rows[0];
    res.json({ id: c.id, name: c.name, createdAt: c.created_at });
  } catch (err) {
    next(err);
  }
});

// GET /api/customer/users (admin only)
router.get('/users', async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE customer_id = ? ORDER BY created_at ASC',
      [req.user.customerId]
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
