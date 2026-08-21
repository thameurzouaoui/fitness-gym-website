import { Router } from 'express';
import { query, queryOne, exec, transaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', async (req, res) => {
  const { customer_name, email, phone, address, city, items } = req.body || {};
  if (!customer_name || !phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: 'Informations incomplètes' });
  }
  const total = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
  const ref = 'CMD-' + Date.now().toString(36).toUpperCase().slice(-6);
  
  try {
    const result = await transaction(async (client) => {
      const orderResult = await client.query(
        `INSERT INTO orders (order_ref, customer_name, email, phone, address, city, total, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING id`,
        [ref, customer_name, email || '', phone, address || '', city || '', total]
      );
      const orderId = orderResult.rows[0].id;
      
      for (const it of items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_name, price, qty) VALUES ($1, $2, $3, $4)',
          [orderId, it.name, Number(it.price) || 0, Number(it.qty) || 1]
        );
      }
      return { orderId, ref, total };
    });
    
    res.json({ ok: true, ref: result.ref, total: result.total });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Erreur lors de la création de la commande' });
  }
});

router.get('/admin', requireAuth, async (req, res) => {
  const orders = await query('SELECT * FROM orders ORDER BY id DESC');
  const items = await query('SELECT * FROM order_items ORDER BY id');
  
  const ordersWithItems = orders.map(o => ({
    ...o,
    total_fmt: fmtDT(o.total),
    items: items.filter(it => it.order_id === o.id)
  }));
  
  res.json({ ok: true, orders: ordersWithItems });
});

router.patch('/admin/:id/status', requireAuth, async (req, res) => {
  const status = String(req.body.status || '');
  if (!['pending', 'paid', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Statut invalide' });
  }
  await exec('UPDATE orders SET status = $1 WHERE id = $2', [status, Number(req.params.id)]);
  res.json({ ok: true });
});

router.delete('/admin/:id', requireAuth, async (req, res) => {
  await exec('DELETE FROM order_items WHERE order_id = $1', [Number(req.params.id)]);
  await exec('DELETE FROM orders WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

function fmtDT(n) {
  return Number(n).toFixed(2).replace(/\.00$/, '') + ' DT';
}

export default router;