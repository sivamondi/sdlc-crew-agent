import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Claude API calls now happen directly from the Electron client.
// This file only exists for backward compatibility — no proxy endpoints needed.

// Health check for API key validation (optional — client can validate directly)
router.get('/health', authenticate, (req, res) => {
  res.json({ ok: true, message: 'Agent routes active. Claude calls happen directly from client.' });
});

export default router;
