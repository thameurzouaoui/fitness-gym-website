import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './src/routes/auth.js';
import productsRoutes from './src/routes/products.js';
import ordersRoutes from './src/routes/orders.js';
import contactsRoutes from './src/routes/contacts.js';
import membersRoutes from './src/routes/members.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

console.log('🔧 CORS FRONTEND_URL:', FRONTEND_URL);

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Explicit OPTIONS handling for preflight
app.options('*', cors({
  origin: FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/members', membersRoutes);

app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'API inconnue' }));

app.listen(PORT, () => {
  console.log('==========================================');
  console.log(`  ACTIV FITNESS — API en marche`);
  console.log(`  API      : http://localhost:${PORT}/api`);
  console.log(`  Admin    : on Vercel (same domain)`);
  console.log('==========================================');
});