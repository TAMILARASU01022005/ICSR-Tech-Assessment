# ICSR Project Management System — Setup & Deployment Guide

This guide walks through configuring, installing, seeding, running, and verifying the ICSR Project Management System full-stack application.

---

## System Requirements

* **Node.js**: v18.0.0 or higher (Tested and verified with v25.9.0 / v20.x)
* **npm**: v9.0.0 or higher
* **MongoDB**: A running MongoDB Atlas cloud cluster (recommended) or local MongoDB instance (`mongodb://127.0.0.1:27017`)
* **Operating System**: Windows, macOS, or Linux

---

## 1. Environment Configuration

### Backend Environment (`server/.env`)
Create or edit `server/.env` based on `server/.env.example`:

```dotenv
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
# Set your MongoDB Atlas URI or leave as local fallback
MONGODB_URI=<your_mongodb_connection_uri>

# JWT Authentication
JWT_SECRET=your_secure_random_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Frontend Origin for CORS & Cookies
CLIENT_URL=http://localhost:3000
```

> **Note on Database Connection**: The backend automatically attempts to connect to the configured `MONGODB_URI`. If MongoDB Atlas connectivity encounters network or IP whitelist restrictions, the server automatically fails over to the local MongoDB fallback at `mongodb://127.0.0.1:27017/icsr_pm`.

### Frontend Environment (`client/.env.local`)
Create or edit `client/.env.local` based on `client/.env.example`:

```dotenv
# Backend API Base URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 2. Installation & Database Seeding

### Step 1: Install Dependencies
From the repository root directory:

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 2: Seed the Database
Populate initial institutional projects, deliverable tasks, seeded user accounts, comments, and audit activity records:

```bash
cd server
npm run seed
```

### Pre-Seeded Institutional Demo Accounts

| Role | Name | Email Address | Permissions Summary |
|---|---|---|---|
| **Administrator** | Dr. A. Ramanathan (Admin) | `admin@icsr.edu` | Full system governance, project creation, archive & delete, assign tasks to PMs, user status & role management, add PMs and Employees |
| **Project Manager** | Priya Sharma (PM 1) | `pm@icsr.edu` | Scoped to assigned projects, allocate tasks strictly to project employees, provision new Employees, update milestones |
| **Project Manager** | Dr. Rajesh Varma (PM 2) | `pm2@icsr.edu` | Fully isolated project portfolio, manage PM 2 projects, allocate tasks to assigned team members |
| **Employee** | Arun Kumar (Dev) | `dev@icsr.edu` | View assigned projects and tasks, drag-and-drop Kanban status updates, post task comments |
| **Employee** | Meera Nair (UI/UX) | `design@icsr.edu` | View assigned deliverables, participate in task discussions, update milestone statuses |
| **Employee** | Suresh Raina (QA) | `qa@icsr.edu` | QA testing deliverables, status verification, task comments |

---

## 3. Running the Application Locally

Run the backend API server and Next.js frontend client concurrently:

### Terminal 1 — Start Backend Server
```bash
cd server
npm run dev
# Server starts at http://localhost:5000
# API endpoint base: http://localhost:5000/api
```

### Terminal 2 — Start Frontend Application
```bash
cd client
npm run dev
# Next.js starts at http://localhost:3000
```

Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## 4. Key Workflows & Features

### 1. Theme Switcher (Light Mode / Dark Mode)
- **Default Theme**: All pages default to **Light Theme** (`--background: #ffffff`, `--foreground: #18181b`).
- **Toggle Switcher**: Accessible via the Moon/Sun icon in the **Topbar** on every dashboard page, in the login view header, and in Settings.
- **Persistence**: Selections are saved in `localStorage` (`icsr_theme`) with an anti-FOUC `<head>` script to prevent flicker upon reload.

### 2. User Provisioning (Public Registration Removed)
- **Public `/register` is disabled**: Direct registration is blocked (returns 403 Forbidden). Accounts must be created by authorized personnel.
- **Admin Portal**: Admins can click **`+ Add Member`** on the `/team` page to create `Employee` or `Project Manager` accounts with optional project assignment.
- **Project Manager Portal**: Project Managers can click **`+ Add Employee`** on `/team` or directly from `/projects/[projectId]` to provision new employees and attach them to their projects.

### 3. Role-Based Task Assignment Rules
- **Admin**: The task assignment dropdown shows **only the Project Manager** of that project.
- **Project Manager**: The task assignment dropdown shows **only assigned team members (Employees)** for that project.
- **Employee**: Can view assigned tasks, update statuses via Kanban drag-and-drop, and post discussion comments.

---

## 5. Verification & Testing

### Run Automated RBAC Test Suite
The project includes a 33-test automated authorization test suite covering project isolation, task privacy, tamper defense, and role boundaries:

```bash
cd server
npx tsx src/utils/test-rbac.ts
# Output: RBAC TEST SUITE COMPLETED: 33 PASSED, 0 FAILED
```

### Production Build Verification
To ensure TypeScript and production bundles compile cleanly without errors:

```bash
# Check server compilation
cd server
npm run build

# Check Next.js client production build
cd ../client
npm run build
```

---


## 6. Related Documentation

* **[README.md](../README.md)**: System overview, visual screenshots, and feature highlights.
* **[API.md](API.md)**: Full REST API specification, request/response payloads, and role authorization matrix.
* **[ARCHITECTURE.md](ARCHITECTURE.md)**: System topology, multi-tier RBAC architecture, sequence diagrams, and schema models.
* **[TESTING.md](TESTING.md)**: Detailed report on the 33-test automated RBAC verification suite and Playwright browser testing.

