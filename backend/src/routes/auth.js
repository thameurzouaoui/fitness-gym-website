import { Router } from 'express';
import { queryOne, exec } from '../db.js';
import { verifyPassword, createToken, verifyToken, setAuthCookie, clearAuthCookie, getTokenFromRequest } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  console.log('🔐 Login attempt:', { username, password: '***' });
  const user = await queryOne('SELECT * FROM users WHERE username = $1', [username]);
  console.log('👤 User found:', user ? { id: user.id, username: user.username, hash: user.password.substring(0, 20) + '...' } : 'NOT FOUND');
  if (!user) {
    console.log('❌ User not found');
    return res.status(401).json({ ok: false, error: 'Identifiants incorrects' });
  }
  const isValid = await verifyPassword(password, user.password);
  console.log('🔑 Password valid:', isValid);
  if (!isValid) {
    console.log('❌ Password invalid');
    return res.status(401).json({ ok: false, error: 'Identifiants incorrects' });
  }
  const token = await createToken(user);
  setAuthCookie(res, token);
  res.json({ ok: true, name: user.name, token });
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