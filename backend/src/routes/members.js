import { Router } from 'express';
import { query, exec } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req, res) => {
  const { name, phone, plan, price } = req.body || {};
  if (!name || !phone || !plan) return res.status(400).json({ ok: false, error: 'Nom, téléphone et plan requis' });
  
  await exec('INSERT INTO members (name, phone, plan, price) VALUES ($1, $2, $3, $4)', [name, phone, plan, price || '']);
  res.json({ ok: true });
});

router.get('/admin', requireAuth, async (req, res) => {
  const members = await query('SELECT * FROM members ORDER BY id DESC');
  res.json({ ok: true, members });
});

router.delete('/admin/:id', requireAuth, async (req, res) => {
  await exec('DELETE FROM members WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

export default router;