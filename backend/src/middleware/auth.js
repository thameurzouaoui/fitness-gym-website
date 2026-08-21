import { verifyToken, getTokenFromRequest } from '../auth.js';

export async function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ ok: false, error: 'Non autorisé' });
  
  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ ok: false, error: 'Session expirée' });
  
  req.user = user;
  next();
}

export async function optionalAuth(req, res, next) {
  const token = getTokenFromRequest(req);
  if (token) {
    const user = await verifyToken(token);
    if (user) req.user = user;
  }
  next();
}