import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db.js';
import { authenticate, signToken } from '../middleware/auth.js';
import { seedDefaultAgents } from '../seed.js';

const router = Router();

// GET /api/auth/organizations — list all organizations for signup dropdown
router.get('/organizations', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM customers ORDER BY name ASC');
    res.json(rows.map((r) => ({ id: r.id, name: r.name })));
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { customerName, customerId: existingCustomerId, name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (!existingCustomerId && !customerName?.trim()) {
      return res.status(400).json({ error: 'Organization name is required when creating a new organization' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    let customerId;
    let customerNameFinal;
    let role = 'member';
    let shouldSeedAgents = false;

    if (existingCustomerId) {
      // Join existing organization
      const [orgs] = await pool.query('SELECT id, name FROM customers WHERE id = ?', [existingCustomerId]);
      if (orgs.length === 0) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      customerId = orgs[0].id;
      customerNameFinal = orgs[0].name;
      role = 'member'; // Joining users are members, not admins
    } else {
      // Create new organization
      customerId = uuidv4();
      customerNameFinal = customerName.trim();
      role = 'admin'; // Creator is admin
      shouldSeedAgents = true;

      await pool.query(
        'INSERT INTO customers (id, name) VALUES (?, ?)',
        [customerId, customerNameFinal]
      );
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    await pool.query(
      'INSERT INTO users (id, customer_id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, customerId, email.trim().toLowerCase(), passwordHash, name.trim(), role]
    );

    // Seed default agents only for new organizations
    if (shouldSeedAgents) {
      await seedDefaultAgents(customerId, userId);
    }

    const token = signToken({ userId, customerId, email: email.trim().toLowerCase(), role });

    res.status(201).json({
      token,
      user: { id: userId, name: name.trim(), email: email.trim().toLowerCase(), role },
      customer: { id: customerId, name: customerNameFinal },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [users] = await pool.query(
      `SELECT u.id, u.customer_id, u.email, u.password_hash, u.name, u.role,
              c.name AS customer_name
       FROM users u JOIN customers c ON u.customer_id = c.id
       WHERE u.email = ?`,
      [email.trim().toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({
      userId: user.id,
      customerId: user.customer_id,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      customer: { id: user.customer_id, name: user.customer_name },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.customer_id, u.email, u.name, u.role,
              c.name AS customer_name, c.api_key IS NOT NULL AND c.api_key != '' AS has_api_key
       FROM users u JOIN customers c ON u.customer_id = c.id
       WHERE u.id = ?`,
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Also fetch user settings
    const [settingsRows] = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?', [req.user.userId]
    );
    const s = settingsRows[0] || {};

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      customer: { id: user.customer_id, name: user.customer_name, hasApiKey: !!user.has_api_key },
      settings: {
        defaultApiKey: s.default_api_key || '',
        mcpApiUrl: s.mcp_api_url || '',
        mcpUserId: s.mcp_user_id || '',
        defaultModel: s.default_model || 'claude-sonnet-4-20250514',
        defaultMaxTokens: s.default_max_tokens || 16384,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/settings
router.get('/settings', authenticate, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?', [req.user.userId]
    );
    const s = rows[0] || {};
    res.json({
      defaultApiKey: s.default_api_key || '',
      mcpApiUrl: s.mcp_api_url || '',
      mcpUserId: s.mcp_user_id || '',
      defaultModel: s.default_model || 'claude-sonnet-4-20250514',
      defaultMaxTokens: s.default_max_tokens || 16384,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/settings
router.put('/settings', authenticate, async (req, res, next) => {
  try {
    const { defaultApiKey, mcpApiUrl, mcpUserId, defaultModel, defaultMaxTokens } = req.body;

    await pool.query(
      `INSERT INTO user_settings (user_id, default_api_key, mcp_api_url, mcp_user_id, default_model, default_max_tokens)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         default_api_key = VALUES(default_api_key),
         mcp_api_url = VALUES(mcp_api_url),
         mcp_user_id = VALUES(mcp_user_id),
         default_model = VALUES(default_model),
         default_max_tokens = VALUES(default_max_tokens)`,
      [
        req.user.userId,
        defaultApiKey || '',
        mcpApiUrl || '',
        mcpUserId || '',
        defaultModel || 'claude-sonnet-4-20250514',
        defaultMaxTokens || 16384,
      ]
    );

    res.json({
      defaultApiKey: defaultApiKey || '',
      mcpApiUrl: mcpApiUrl || '',
      mcpUserId: mcpUserId || '',
      defaultModel: defaultModel || 'claude-sonnet-4-20250514',
      defaultMaxTokens: defaultMaxTokens || 16384,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
