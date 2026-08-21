import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

import { exec } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import adminRoutes from './src/routes/admin.js';
import productsRoutes from './src/routes/products.js';
import ordersRoutes from './src/routes/orders.js';
import contactsRoutes from './src/routes/contacts.js';
import membersRoutes from './src/routes/members.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const ALLOWED_ORIGINS = new Set([
  FRONTEND_URL,
  'https://fitnessgym-website.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'null',
]);
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.has(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return cb(null, true);
    return cb(new Error('Origin non autorise: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

console.log('🔧 CORS FRONTEND_URL:', FRONTEND_URL);

process.on('unhandledRejection', err => console.error('⚠️ Unhandled rejection:', err?.stack || err));

app.use(cors(corsOptions));

// Explicit OPTIONS handling for preflight
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/members', membersRoutes);

app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'API inconnue' }));

async function ensureAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);
  await exec(
    `INSERT INTO users (username, password, name)
     VALUES ($1, $2, 'Master Admin')
     ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
    [username, hash]
  );
  console.log('✅ Admin user ready:', username);
}

ensureAdmin().catch(e => console.error('❌ Admin seed failed:', e.message));

app.listen(PORT, () => {
  console.log('==========================================');
  console.log(`  ACTIV FITNESS — API en marche`);
  console.log(`  API      : http://localhost:${PORT}/api`);
  console.log(`  Admin    : on Vercel (same domain)`);
  console.log('==========================================');
});