import { Router } from 'express';
import { query, queryOne, exec } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage } from '../upload.js';

const router = Router();
router.use(requireAuth);

/* ---------- STATS ---------- */
router.get('/stats', async (req, res) => {
  const s = (
    await query(`
      SELECT
        (SELECT COUNT(*) FROM orders) AS orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') AS pending,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status IN ('paid','delivered')) AS revenue,
        (SELECT COUNT(*) FROM members) AS members,
        (SELECT COUNT(*) FROM products) AS products,
        (SELECT COUNT(*) FROM contacts WHERE is_read = false) AS unread
    `)
  )[0];
  const stats = {
    orders: Number(s.orders),
    pending: Number(s.pending),
    revenue: Number(s.revenue),
    members: Number(s.members),
    products: Number(s.products),
    unread: Number(s.unread),
  };
  const recentOrders = await query('SELECT * FROM orders ORDER BY id DESC LIMIT 5');
  res.json({ ok: true, stats, recentOrders });
});

/* ---------- ORDERS ---------- */
router.get('/orders', async (req, res) => {
  const orders = await query('SELECT * FROM orders ORDER BY id DESC');
  const items = await query('SELECT * FROM order_items ORDER BY id');
  res.json({
    ok: true,
    orders: orders.map(o => ({ ...o, items: items.filter(it => it.order_id === o.id) })),
  });
});

router.patch('/orders/:id/status', async (req, res) => {
  const status = String(req.body.status || '');
  if (!['pending', 'paid', 'delivered', 'cancelled'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Statut invalide' });
  }
  await exec('UPDATE orders SET status = $1 WHERE id = $2', [status, Number(req.params.id)]);
  res.json({ ok: true });
});

router.delete('/orders/:id', async (req, res) => {
  await exec('DELETE FROM order_items WHERE order_id = $1', [Number(req.params.id)]);
  await exec('DELETE FROM orders WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

/* ---------- PRODUCTS ---------- */
router.get('/products', async (req, res) => {
  const products = await query('SELECT * FROM products ORDER BY id');
  res.json({ ok: true, products });
});

export function parseMultipart(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;
  while (true) {
    const i = buffer.indexOf(delimiter, start);
    if (i === -1) break;
    const next = buffer.indexOf(delimiter, i + delimiter.length);
    if (next === -1) break;
    const partData = buffer.subarray(i + delimiter.length, next - 2);
    const headerEnd = partData.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) { start = next; continue; }
    const headers = partData.subarray(0, headerEnd).toString();
    const nameMatch = headers.match(/name=(?:"([^"]*)"|([^;\r\n]+))/);
    const fileMatch = headers.match(/filename=(?:"([^"]*)"|([^;\r\n]+))/);
    parts.push({
      name: (nameMatch?.[1] ?? nameMatch?.[2] ?? '').trim(),
      filename: (fileMatch?.[1] ?? fileMatch?.[2] ?? '').trim(),
      data: partData.subarray(headerEnd + 4),
    });
    start = next;
  }
  return parts;
}

async function extractProductPayload(req) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bm = ct.match(/boundary=(?:"([^"]+)"|([^;\r\n]+))/i);
    const boundary = (bm?.[1] || bm?.[2] || '').trim();
    if (!boundary) return { fields: {}, file: null };
    const parts = parseMultipart(Buffer.concat(chunks), boundary);
    const fields = {};
    let file = null;
    for (const p of parts) {
      if (p.filename) file = p;
      else fields[p.name] = p.data.toString('utf8');
    }
    return { fields, file };
  }
  return { fields: req.body || {}, file: null };
}

router.post('/products', async (req, res) => {
  try {
    const { fields, file } = await extractProductPayload(req);
    const { name, price, category, description, badge } = fields;
    if (!name || price == null || price === '') {
      return res.status(400).json({ ok: false, error: 'Nom et prix requis' });
    }
    let image = '';
    if (file) image = await uploadImage(file.data, file.filename);
    const result = await exec(
      `INSERT INTO products (name, price, category, description, badge, image)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, price, category || 'general', description || '', badge || '', image]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await queryOne('SELECT * FROM products WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ ok: false, error: 'Produit introuvable' });

    const { fields, file } = await extractProductPayload(req);
    const { name, price, category, description, badge, keep_image } = fields;

    let image = existing.image;
    if (file) image = await uploadImage(file.data, file.filename);
    else if (keep_image !== '1' && 'image' in fields) image = fields.image || '';

    await exec(
      `UPDATE products SET name=$1, price=$2, category=$3, description=$4, badge=$5, image=$6 WHERE id=$7`,
      [
        name ?? existing.name,
        price ?? existing.price,
        category || existing.category,
        description ?? existing.description,
        badge ?? existing.badge,
        image,
        id,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  await exec('DELETE FROM products WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

/* ---------- CONTACTS ---------- */
router.get('/contacts', async (req, res) => {
  const contacts = await query('SELECT * FROM contacts ORDER BY id DESC');
  res.json({ ok: true, contacts });
});

router.patch('/contacts/:id/read', async (req, res) => {
  await exec('UPDATE contacts SET is_read = $1 WHERE id = $2', [req.body.is_read ? true : false, Number(req.params.id)]);
  res.json({ ok: true });
});

router.delete('/contacts/:id', async (req, res) => {
  await exec('DELETE FROM contacts WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

/* ---------- MEMBERS ---------- */
router.get('/members', async (req, res) => {
  const members = await query('SELECT * FROM members ORDER BY id DESC');
  res.json({ ok: true, members });
});

router.delete('/members/:id', async (req, res) => {
  await exec('DELETE FROM members WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

export default router;
