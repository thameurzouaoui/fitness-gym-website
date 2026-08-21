import { Router } from 'express';
import { query, queryOne, exec } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage } from '../upload.js';

const router = Router();

router.get('/', async (req, res) => {
  const products = await query('SELECT * FROM products ORDER BY id');
  res.json({ ok: true, products });
});

router.get('/admin', requireAuth, async (req, res) => {
  const products = await query('SELECT * FROM products ORDER BY id');
  res.json({ ok: true, products });
});

router.post('/admin', requireAuth, async (req, res) => {
  const { name, price, category, description, badge, image } = req.body;
  if (!name || price == null) return res.status(400).json({ ok: false, error: 'Nom et prix requis' });
  
  const result = await exec(
    `INSERT INTO products (name, price, category, description, badge, image)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [name, price, category || 'general', description || '', badge || '', image || '']
  );
  res.json({ ok: true, id: result.insertId });
});

router.put('/admin/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { name, price, category, description, badge, keep_image, image } = req.body;
  const existing = await queryOne('SELECT * FROM products WHERE id = $1', [id]);
  if (!existing) return res.status(404).json({ ok: false, error: 'Produit introuvable' });

  const finalImage = keep_image === '1' ? existing.image : (image || '');
  await exec(
    `UPDATE products SET name=$1, price=$2, category=$3, description=$4, badge=$5, image=$6 WHERE id=$7`,
    [name ?? existing.name, price ?? existing.price, category || existing.category, 
     description ?? existing.description, badge ?? existing.badge, finalImage, id]
  );
  res.json({ ok: true });
});

router.delete('/admin/:id', requireAuth, async (req, res) => {
  await exec('DELETE FROM products WHERE id = $1', [Number(req.params.id)]);
  res.json({ ok: true });
});

router.post('/upload', requireAuth, async (req, res) => {
  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ ok: false, error: 'Content-Type doit être multipart/form-data' });
    }
    
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ ok: false, error: 'Boundary manquant' });
    }
    
    const parts = parseMultipart(buffer, boundary);
    const filePart = parts.find(p => p.name === 'image' && p.filename);
    
    if (!filePart) {
      return res.status(400).json({ ok: false, error: 'Aucun fichier image' });
    }
    
    const url = await uploadImage(filePart.data, filePart.filename);
    res.json({ ok: true, url });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

function parseMultipart(buffer, boundary) {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = 0;
  
  while (true) {
    const delimiterIndex = buffer.indexOf(delimiter, start);
    if (delimiterIndex === -1) break;
    
    const partStart = delimiterIndex + delimiter.length;
    const nextDelimiterIndex = buffer.indexOf(delimiter, partStart);
    if (nextDelimiterIndex === -1) break;
    
    const partData = buffer.subarray(partStart, nextDelimiterIndex - 2);
    const headerEnd = partData.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) continue;
    
    const headers = partData.subarray(0, headerEnd).toString();
    const body = partData.subarray(headerEnd + 4);
    
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const typeMatch = headers.match(/Content-Type: ([^\r\n]+)/);
    
    parts.push({
      name: nameMatch?.[1] || '',
      filename: filenameMatch?.[1] || '',
      type: typeMatch?.[1] || '',
      data: body
    });
    
    start = nextDelimiterIndex;
  }
  
  return parts;
}

export default router;