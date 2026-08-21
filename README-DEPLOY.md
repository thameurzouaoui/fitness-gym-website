# ACTIV FITNESS — Deployment Guide

**Architecture**: Vercel (Frontend + Admin in ONE project) + Render (API) + Neon (PostgreSQL) + Vercel Blob (Uploads)

---

## 📦 Repository Structure

```
activ-fitness/
├── backend/                 # Render Web Service (rootDir: backend)
│   ├── src/
│   │   ├── db.js           # Neon/PostgreSQL client
│   │   ├── auth.js         # JWT + bcrypt
│   │   ├── upload.js       # Vercel Blob + Sharp resize
│   │   ├── middleware/auth.js
│   │   └── routes/
│   │       ├── auth.js
│   │       ├── products.js
│   │       ├── orders.js
│   │       ├── contacts.js
│   │       └── members.js
│   ├── scripts/
│   │   ├── migrate-to-neon.sql
│   │   └── seed-admin.js
│   ├── server.js
│   ├── package.json
│   ├── render.yaml
│   └── .env.example
├── frontend/               # Vercel Static Project (rootDir: frontend)
│   ├── index.html
│   ├── assets/
│   ├── admin/              # Admin panel (served at /admin)
│   │   ├── admin.html
│   │   ├── admin.css
│   │   └── admin.js
│   └── vercel.json
├── package.json            # Root workspace
└── README-DEPLOY.md
```

---

## 🔧 Phase 1: External Services Setup

### 1.1 Neon Database (PostgreSQL)

1. Go to [neon.tech](https://neon.tech) → Sign up with GitHub
2. Create project: **activ-fitness**
3. Copy connection string:
   ```
   postgresql://user:pass@ep-xxx.region.aws.neon.tech/activ_fitness?sslmode=require
   ```
4. Save as `DATABASE_URL`

### 1.2 Vercel Blob Storage

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Storage
2. Create Blob Store: **activ-fitness-uploads**
3. Copy **BLOB_READ_WRITE_TOKEN**

---

## 🚀 Phase 2: Backend Deployment (Render)

### 2.1 Push to GitHub

```bash
cd D:\Users\Z.Thameur\Desktop\ACTIV_FITNESS_BACKUP
git init
git add .
git commit -m "Initial commit: Hybrid deployment ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/activ-fitness.git
git push -u origin main
```

### 2.2 Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. **New** → **Web Service** → Connect your GitHub repo
3. Configure:
   - **Name**: `activ-fitness-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: `Free`
4. **Environment Variables** (add all):
   ```
   NODE_ENV=production
   DATABASE_URL=<your-neon-connection-string>
   JWT_SECRET=<auto-generate in Render>
   BLOB_READ_WRITE_TOKEN=<your-vercel-blob-token>
   FRONTEND_URL=https://activ-fitness.vercel.app
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123
   ```
5. **Deploy** → Wait for build to complete
6. Note your API URL: `https://activ-fitness-api.onrender.com`

### 2.3 Run Database Migration

In Render Shell (or locally with DATABASE_URL set):

```bash
# In Render: connect via SSH or use local terminal with DATABASE_URL
psql "$DATABASE_URL" -f backend/scripts/migrate-to-neon.sql

# Then seed admin user
cd backend && npm run seed:admin
```

---

## 🌐 Phase 3: Frontend + Admin Deployment (Single Vercel Project)

### 3.1 Deploy Combined Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New** → **Project**
2. Import your GitHub repo
3. **Configure**:
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
   - **Build Command**: `echo 'static site'`
   - **Output Directory**: `.`
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://activ-fitness-api.onrender.com
   ```
5. **Deploy** → Get URL: `https://activ-fitness.vercel.app`

**Result**: Both frontend and admin are on the same domain:
- Frontend: `https://activ-fitness.vercel.app/`
- Admin: `https://activ-fitness.vercel.app/admin`

---

## ⚙️ Phase 4: Update CORS with Actual URLs

After Vercel deployment, update Render environment variables with **actual** URL:

1. Go to Render → `activ-fitness-api` → **Environment**
2. Update:
   ```
   FRONTEND_URL=https://your-actual-frontend.vercel.app
   ```
3. **Save Changes** → Render will auto-redeploy

> **Note**: Only `FRONTEND_URL` is needed now (admin is on same domain)

---

## ✅ Phase 5: Verification Checklist

| Test | Command/Action | Expected |
|------|----------------|----------|
| API Health | `curl https://api.onrender.com/api/products` | JSON with 7 products |
| Admin Login | POST `/api/auth/login` with admin/admin123 | JWT token in cookie |
| Protected Route | GET `/api/admin/stats` with cookie | Dashboard stats |
| File Upload | POST `/api/products/upload` with image | Blob URL returned |
| Frontend Load | Visit `https://*.vercel.app` | Site loads, shop works |
| Admin Panel | Visit `https://*.vercel.app/admin` | Login → Dashboard works |
| Checkout Flow | Add to cart → Checkout | Order created in DB |
| Add Product | Admin → Products → New + Image | Product appears in shop |

---

## 🔄 Phase 6: Custom Domain (Optional)

### Frontend + Admin (Vercel - Same Domain)
1. Vercel Project → **Settings** → **Domains** → Add `activfitness.tn`
2. Configure DNS: CNAME → `cname.vercel-dns.com`
3. Admin automatically available at `https://activfitness.tn/admin`

### API (Render)
1. Render Service → **Settings** → **Custom Domains** → Add `api.activfitness.tn`
2. Update `FRONTEND_URL` in Render env vars to `https://activfitness.tn`

---

## 🛠 Local Development

```bash
# 1. Copy env file
cp backend/.env.example backend/.env
# Edit backend/.env with local values (use local Neon branch or Docker Postgres)

# 2. Install deps
cd backend && npm install

# 3. Run migration (if using local DB)
npm run migrate
npm run seed:admin

# 4. Start API
npm run dev
# → http://localhost:3000/api

# 5. For frontend, use any static server:
cd frontend && npx serve .
# → http://localhost:3000 (frontend)
# Admin at http://localhost:3000/admin
```

---

## 📝 Environment Variables Reference

| Variable | Where | Description |
|----------|-------|-------------|
| `DATABASE_URL` | Render, Local | Neon PostgreSQL connection string |
| `JWT_SECRET` | Render (auto), Local | 32+ char random string |
| `BLOB_READ_WRITE_TOKEN` | Render, Local | Vercel Blob token |
| `FRONTEND_URL` | Render | Vercel frontend URL (for CORS) |
| `ADMIN_USERNAME` | Render, Local | Admin username for seeding |
| `ADMIN_PASSWORD` | Render, Local | Admin password for seeding |
| `NEXT_PUBLIC_API_URL` | Vercel | Render API URL |

---

## 🐛 Troubleshooting

### API returns 500 / Database errors
- Check Render logs: `Dashboard → Logs`
- Verify `DATABASE_URL` is correct
- Run migration again: `psql "$DATABASE_URL" -f backend/scripts/migrate-to-neon.sql`

### CORS errors in browser console
- Verify `FRONTEND_URL` in Render matches **exactly** (including protocol)
- Check Render logs for CORS middleware output

### Admin panel shows "Non autorisé"
- Check JWT_SECRET is set in Render
- Clear browser cookies for the domain
- Verify cookie is being sent (HttpOnly, SameSite=lax)

### Image upload fails
- Verify `BLOB_READ_WRITE_TOKEN` is valid
- Check file size < 5MB, type is image/*
- Check Render logs for Sharp/Vercel Blob errors

### Frontend shows fallback products only
- Verify `NEXT_PUBLIC_API_URL` in Vercel project settings
- Check browser Network tab for failed `/api/products` call
- Ensure Render API is deployed and responding

---

## 📞 Support Commands

```bash
# View Render logs
# Dashboard → activ-fitness-api → Logs

# Run migration manually
psql "$DATABASE_URL" -f backend/scripts/migrate-to-neon.sql

# Seed admin manually
cd backend && DATABASE_URL="..." npm run seed:admin

# Test API locally
curl http://localhost:3000/api/products
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 🔐 Security Notes

- `JWT_SECRET` auto-generated by Render (32+ chars)
- Admin password hashed with bcrypt (cost 10)
- Cookies: HttpOnly, Secure (production), SameSite=lax
- CORS restricted to frontend domain
- File uploads: type validation, size limit, Sharp optimization
- SQL: Parameterized queries (no injection risk)

---

**Ready to deploy!** Follow phases 1-5 in order. Each phase builds on the previous.