import { Router } from 'express';
import { queryOne, exec } from '../db.js';
import { verifyPassword, createToken, setAuthCookie, clearAuthCookie, getTokenFromRequest } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = await queryOne('SELECT * FROM users WHERE username = $1', [username]);
  if (!user || !await verifyPassword(password, user.password)) {
    return res.status(401).json({ ok: false, error: 'Identifiants incorrects' });
  }
  const token = await createToken(user);
  setAuthCookie(res, token);
  res.json({ ok: true, name: user.name });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', async (req, res) => {
  const token = getTokenFromRequest(req);
  if (!token) return res.json({ ok: true, user: null });
  const user = await verifyToken(token);
  res.json({ ok: true, user: user ? { id: user.id, username: user.username, name: user.name } : null });
});

export default router;