# StockSense - Inventory & Warehouse Management System

Modern, relational inventory management ERP application built with React (Vite, TailwindCSS) and Node.js Express with PostgreSQL.

---

## 🚀 Quick Deployment Guide

### Option 1: Render (Recommended for Full Stack + PostgreSQL)

1. **Create a Free PostgreSQL Database**:
   - Go to [render.com](https://render.com) $\rightarrow$ **New** $\rightarrow$ **PostgreSQL**.
   - Copy the **Internal Database URL** or **External Database URL**.

2. **Deploy Backend (Web Service)**:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `PORT`: `5000`
     - `DATABASE_URL`: `postgresql://...` (your PostgreSQL connection string)
     - `JWT_SECRET`: `your_secure_random_jwt_secret_key`
     - `NODE_ENV`: `production`

3. **Deploy Frontend (Static Site / Vercel)**:
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`

---

### Option 2: Railway

1. Click **New Project** $\rightarrow$ **Provision PostgreSQL**.
2. Add Service from GitHub repo $\rightarrow$ Select `server` directory.
3. Set Environment variable `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`.
4. Add Service for `client` directory $\rightarrow$ Set `VITE_API_URL` to backend domain.

---

### Option 3: Docker Deployment

Run both Frontend, Backend, and PostgreSQL with a single command:
```bash
docker-compose up --build
```

---

## 🛠 Local Setup & Development

### 1. Database & Backend
```bash
cd server
npm install
# Set your DATABASE_URL in .env
npm start
# (Optional) Seed sample initial data:
npm run seed
```

### 2. Frontend
```bash
cd client
npm install
npm run dev
```
Client runs at `http://localhost:5173` and connects to `http://localhost:5000/api`.
