# Render Deployment Guide — ICSR Advanced Project Management System

Deploying the ICSR Project Management System on [Render](https://render.com/) is straightforward and supported via Render's **Free Tier**.

This repository includes a native **Render Blueprint (`render.yaml`)**, which can automatically set up both the backend API and Next.js frontend with linked environment variables in one click, or you can configure them manually.

---

## Method 1: One-Click Deploy via Render Blueprint (Recommended)

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **"Blueprints"** in the top navigation bar.
3. Click **"New Blueprint Instance"**.
4. Connect your GitHub repository: **`TAMILARASU01022005/ICSR-Tech-Assessment`**.
5. Render will automatically read [`render.yaml`](../render.yaml) and configure:
   * **`icsr-backend`** (Web Service, Node, root: `server`, start: `npm start`)
   * **`icsr-frontend`** (Web Service, Node, root: `client`, start: `npm start`)
   * Linked environment variables between services (`CLIENT_URL` and `NEXT_PUBLIC_API_URL`).
6. Fill in the only required secret prompt:
   * **`MONGODB_URI`**: Paste your MongoDB Atlas connection string.
7. Click **"Apply"**. Render will build and deploy both services automatically!

---

## Method 2: Manual Setup (Two Web Services)

If you prefer to configure services manually in Render:

### Step 1: Deploy Backend Web Service (`icsr-backend`)
1. Click **"New +"** → **"Web Service"**.
2. Connect your repository: **`TAMILARASU01022005/ICSR-Tech-Assessment`**.
3. Configure the service:
   * **Name**: `icsr-backend`
   * **Region**: Oregon (or your preferred region)
   * **Branch**: `main`
   * **Root Directory**: `server`
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
4. Expand **Advanced** and set:
   * **Health Check Path**: `/api/health`
5. Under **Environment Variables**, add:

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `10000` | Render default web port |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/icsr_pm?retryWrites=true&w=majority` | Your Atlas connection string |
| `JWT_SECRET` | `<your_secure_random_jwt_secret_key>` | Random secret (min 32 chars) |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `CLIENT_URL` | `https://icsr-frontend.onrender.com` | Your frontend Render URL (update after Step 2) |

6. Click **"Create Web Service"**. Render will provide a public URL like:
   `https://icsr-backend.onrender.com`

---

### Step 2: Deploy Frontend Web Service (`icsr-frontend`)
1. Click **"New +"** → **"Web Service"**.
2. Connect the same repository: **`TAMILARASU01022005/ICSR-Tech-Assessment`**.
3. Configure:
   * **Name**: `icsr-frontend`
   * **Region**: Same as backend
   * **Branch**: `main`
   * **Root Directory**: `client`
   * **Runtime**: `Node`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
   * **Instance Type**: `Free`
4. Expand **Advanced** and set:
   * **Health Check Path**: `/login`
5. Under **Environment Variables**, add:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `NEXT_PUBLIC_API_URL` | `https://icsr-backend.onrender.com/api` *(Your backend URL from Step 1 + `/api`)* |

6. Click **"Create Web Service"**. Render will provide a public URL like:
   `https://icsr-frontend.onrender.com`

---

### Step 3: Link CORS on Backend
1. Copy your frontend Render URL: `https://icsr-frontend.onrender.com`.
2. Go to your `icsr-backend` service → **Environment**.
3. Update `CLIENT_URL` with that exact URL (without trailing slash).
4. Save Changes. Render will redeploy the backend with CORS whitelisted.

---

### Step 4: Seed Database on Render (One-Time)
Once your backend is running:
1. Open your `icsr-backend` service on Render.
2. Click **"Shell"** tab on the left menu.
3. Run:
   ```bash
   npm run seed
   ```
4. All initial projects, deliverable tasks, and demo accounts will populate into your MongoDB Atlas database.

---

### Verification
* **Backend Health Check**:
  Visit `https://icsr-backend.onrender.com/api/health` → `{"status":"healthy","timestamp":"..."}`
* **Frontend Portal**:
  Visit `https://icsr-frontend.onrender.com/` → directly lands on `/login`.
