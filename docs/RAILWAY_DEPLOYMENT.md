# Railway Deployment Guide — ICSR Advanced Project Management System

Deploying the ICSR Project Management System on [Railway](https://railway.app/) takes less than 5 minutes. Because this repository is a monorepo consisting of a Next.js client (`/client`) and an Express backend (`/server`), we deploy them as **two connected services** within a single Railway project.

---

## Architecture on Railway

```
[GitHub: ICSR-Tech-Assessment]
        │
        ├───► Service 1: `server` (Express API + MongoDB Atlas)
        │       └── URL: https://icsr-server-production.up.railway.app
        │
        └───► Service 2: `client` (Next.js 16 Frontend)
                └── URL: https://icsr-client-production.up.railway.app
```

---

## Step 1: Create a Railway Project

1. Log in to your [Railway Dashboard](https://railway.app/dashboard).
2. Click **"+ New Project"**.
3. Select **"Deploy from GitHub repo"**.
4. Choose **`TAMILARASU01022005/ICSR-Tech-Assessment`**.

---

## Step 2: Deploy the Backend API Service (`server`)

Railway will ask which directory to deploy or default to root. Configure the first service for the backend:

1. Click on the created service card and navigate to **Settings**:
   * **Service Name**: `icsr-server`
   * **Root Directory**: `server`
   * **Build Command**: `npm run build`
   * **Start Command**: `npm start`
   * **Healthcheck Path**: `/api/health`
2. Go to **Variables** tab and add the environment variables:

| Variable | Value / Description | Example |
|---|---|---|
| `PORT` | Set automatically by Railway, or specify `5000` | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | Your MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/icsr_pm?retryWrites=true&w=majority` |
| `JWT_SECRET` | Secure random string (min 32 characters) | `generate_random_secret_string_here` |
| `JWT_EXPIRES_IN` | Session token lifetime | `7d` |
| `CLIENT_URL` | Your frontend's Railway domain (copy after Step 3) | `https://icsr-client-production.up.railway.app` |

3. Go to **Settings** > **Networking** > Click **"Generate Domain"** to assign a public HTTPS domain (e.g. `https://icsr-server-production.up.railway.app`).

> **Tip (Database Seeding)**: Once the backend deploys, you can seed initial demo data by clicking **"Settings"** > **"Command Palette"** (or press `Ctrl+K`), choose **"One-off Command"**, and run:
> ```bash
> npm run seed
> ```

---

## Step 3: Deploy the Frontend Client Service (`client`)

1. In the same Railway Project canvas, click **"+ New"** > **"GitHub Repo"** > select `TAMILARASU01022005/ICSR-Tech-Assessment` again.
2. Rename the new service to `icsr-client`.
3. Go to **Settings**:
   * **Root Directory**: `client`
   * **Build Command**: `npm run build`
   * **Start Command**: `npm start`
   * **Healthcheck Path**: `/login`
4. Go to **Variables** tab and add:

| Variable | Value / Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your backend's Railway public domain + `/api` (e.g. `https://icsr-server-production.up.railway.app/api`) |
| `NODE_ENV` | `production` |

5. Go to **Settings** > **Networking** > Click **"Generate Domain"** to generate the public frontend domain.

---

## Step 4: Link Frontend and Backend (CORS & Cookies)

1. Copy your frontend domain (e.g., `https://icsr-client-production.up.railway.app`).
2. Go back to your `icsr-server` service > **Variables** tab.
3. Update `CLIENT_URL` with that exact URL (no trailing slash).
4. Railway will automatically redeploy the backend with the new CORS origin.

---

## Step 5: Verification Checklist

1. **Backend Health Check**:
   * Visit `https://your-server.up.railway.app/api/health` in your browser.
   * Expected response: `{"status":"healthy","timestamp":"..."}`
2. **Frontend Authentication**:
   * Visit `https://your-client.up.railway.app/`.
   * Automatically lands on `/login`.
   * Sign in with your institutional credentials.
3. **Database Connectivity**:
   * Projects, tasks, and analytics will populate directly from your MongoDB Atlas cloud cluster.
