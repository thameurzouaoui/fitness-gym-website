import { Router } from 'express';
import { query, queryOne, exec } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body || {};
  if (!name || !message) return res.status(400).json({ ok: false, error: 'Nom et message requis' });
  
  await exec(
    'INSERT INTO contacts (name, email, phone, subject, message) VALUES ($1, $2, $3, $4, $5)',
    [name, email || '', phone || '', subject || '', message]
  );
  res.json({ ok: true });
});

router.get('/admin', requireAuth, async (req, res) => {
  const contacts = await query('SELECT * FROM contacts ORDER BY id DESC');
  res.json({ ok: true, contacts });
});

router.patch('/admin/:id/read', requireAuth, async (req, res) => {
  await exec('UPDATE contacts SET is_read = $1 WHERE id = $2', [req.body.is_read ? true : false, Number(req.params.id)]);
  res.json({ ok: true });
});

router.delete('/admin/:id', requireAuth, async (req, res) => {
  await exec('DELETE FROM contacts WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

export default router;