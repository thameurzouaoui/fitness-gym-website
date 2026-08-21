'use strict';
/* ============================================================
   ACTIV FITNESS — Database layer (built-in node:sqlite)
   Creates tables + seeds admin user and shop products.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DATA_DIR, 'activ.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

const config = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'config.json'), 'utf8'));
  } catch {
    return { port: 3000, admin: { username: 'admin', password: 'admin123' }, siteName: 'ACTIV FITNESS' };
  }
})();

function ensureDirs() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function copySeedImages() {
  const sourceDir = path.join(__dirname, '..', 'front end', 'assets', 'images');
  const files = [
    'prod-whey.jpg', 'prod-bcaa.jpg', 'prod-gloves-red.jpg', 'prod-gloves-gold.jpg',
    'prod-gloves-yellow.jpg', 'prod-punchbag.jpg', 'prod-kimono.jpg'
  ];
  if (!fs.existsSync(sourceDir)) return;
  for (const f of files) {
    const src = path.join(sourceDir, f);
    const dst = path.join(UPLOADS_DIR, f);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      try { fs.copyFileSync(src, dst); } catch { /* ignore */ }
    }
  }
}

const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT DEFAULT '',
    image TEXT DEFAULT '',
    badge TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_ref TEXT UNIQUE,
    customer_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT DEFAULT '',
    total REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    qty INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    message TEXT DEFAULT '',
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    plan TEXT NOT NULL,
    price TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

/* ---------- Seed admin user from config ---------- */
{
  const hash = bcrypt.hashSync(String(config.admin.password), 10);
  db.prepare(
    `INSERT INTO users (username, password, name)
     VALUES (?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET password = excluded.password`
  ).run(String(config.admin.username), hash, 'Master Admin');
}

/* ---------- Seed products (only if table empty) ---------- */
{
  const count = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  if (count === 0) {
    ensureDirs();
    copySeedImages();
    const seed = [
      ['Whey Protein Box', 149, 'supplements', 'Premium 100% whey — chocolate, 1kg', '/uploads/prod-whey.jpg', 'Best Seller'],
      ['BCAA Energy', 89, 'supplements', 'Amino acids + energy boost, 400g', '/uploads/prod-bcaa.jpg', 'New'],
      ['Boxing Gloves Pro', 199, 'boxing', 'Genuine leather, 10oz — all sizes', '/uploads/prod-gloves-red.jpg', ''],
      ['Sparring Gold Gloves', 179, 'boxing', 'Signed-collection, 12oz premium', '/uploads/prod-gloves-gold.jpg', 'Limited'],
      ['Training Gloves', 129, 'boxing', 'Breathable mesh, 8oz — beginners', '/uploads/prod-gloves-yellow.jpg', ''],
      ['Boxing Punch Bag', 299, 'boxing', 'Heavy bag 30kg with chains & swivel', '/uploads/prod-punchbag.jpg', ''],
      ['Takondo Kimono', 155, 'takondo', 'Official club uniform, 100% cotton', '/uploads/prod-kimono.jpg', 'Official']
    ];
    const ins = db.prepare(
      'INSERT INTO products (name, price, category, description, image, badge) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const p of seed) ins.run(...p);
    console.log('[db] Seeded ' + seed.length + ' products');
  }
}

module.exports = { db, config, DB_PATH, UPLOADS_DIR };