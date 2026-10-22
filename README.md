# ICSR Technical Assignment — Advanced Project Management System

An enterprise-grade, full-stack project management platform engineered for institutional governance, clinical project workflows, and team collaboration. Built with **Next.js 16 (App Router + Turbopack)**, **React 19**, **Express.js with TypeScript**, and **MongoDB (Atlas Cloud + Local Fallback)**.

The platform implements multi-tier role-based access control (RBAC), role-governed user provisioning, dual-mode task delegation, an interactive 4-column drag-and-drop Kanban workflow, an institutional audit activity trail, password visibility toggle functionality, and a universal dual-theme engine (default light mode with zero-FOUC persistence).

---

## Technical Documentation Suite

The complete technical documentation is organized in the [`docs/`](docs/) directory:

| Guide | Description | Link |
|---|---|:---:|
| **Setup & Deployment** | Step-by-step instructions for installation, database configuration, database seeding, and running dev servers | [docs/SETUP.md](docs/SETUP.md) |
| **REST API Specification** | Comprehensive endpoint documentation, role authorization matrix, request/response JSON payloads, and query filters | [docs/API.md](docs/API.md) |
| **System Architecture** | High-level topology, multi-tier RBAC defense-in-depth, sequence workflows (Mermaid), data models, and theme engine | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| **Testing & Verification** | 33-test automated RBAC test suite report, Playwright MCP browser testing procedures, and production build checks | [docs/TESTING.md](docs/TESTING.md) |

---

## Visual Preview & Interface Screenshots

| Overview Analytics & Metrics | Projects Portfolio Grid |
|---|---|
| ![Dashboard Overview](docs/screenshots/admin-dashboard.png) | ![Projects Portfolio](docs/screenshots/manager-dashboard.png) |

| Tasks Table & Comment Discussions | Interactive 4-Column Kanban Workflow |
|---|---|
| ![Tasks Table & Discussion](docs/screenshots/task-table-comments.png) | ![Kanban Board](docs/screenshots/kanban-board.png) |

| Team Governance & Role Administration | Mobile Responsive Viewport (390px) |
|---|---|
| ![Team Governance](docs/screenshots/07-team-governance.png) | ![Mobile View](docs/screenshots/09-mobile-responsive.png) |

---

## Key Feature Highlights

### 1. Multi-Tier Role-Based Access Control (RBAC)
* **Administrator**: Global institutional governance. Creates and deletes projects, assigns Project Managers, assigns milestone tasks to PMs, provisions users, modifies roles, and configures institutional settings.
* **Project Manager**: Scoped strictly to assigned projects. Manages timelines, provisions new Employees directly into project teams, allocates tasks strictly to assigned employees, and archives/restores owned projects.
* **Employee**: Scoped to assigned projects and tasks. Interactive Kanban drag-and-drop task status updates, participating in task discussions, and monitoring personal deadlines.

### 2. Role-Governed User Provisioning
* **Public Self-Registration Disabled**: Public registration endpoint is locked to prevent unauthorized account creation.
* **Admin Provisioning**: Administrators can provision either `Employee` or `Project Manager` accounts with optional project assignment.
* **PM Provisioning**: Project Managers can provision `Employee` accounts strictly from the team directory or project detail view; role elevation is locked.

### 3. Dual-Mode Task Assignment & Delegation
* **Admin Mode**: When creating a project task, the Admin assigns it to the **Project Manager** as milestone deliverable owner (or project team members).
* **PM Mode**: Project Managers assign tasks strictly to their project's **assigned employees**.
* **Strict Validation**: The API validates that assignees belong to the project team, rejecting invalid assignments.

### 4. Interactive Form Experience & Password Visibility
* Password fields include a secure view/hide toggle icon (`FiEye` / `FiEyeOff`), allowing users to verify their input without compromising security.
* Direct root navigation routes immediately to the authentication portal.

### 5. Universal Theme Switcher (Default: Light Mode)
* **Institutional Light Mode by Default**: Tailored for dense, readable SaaS dashboards.
* **Zero-FOUC Architecture**: Synchronous inline script in `<head>` checks `localStorage` and eliminates theme flicker on page load.
* **Tailwind CSS v4 Integration**: Configured with `@custom-variant dark (&:where(.dark, .dark *));`.
* **Universal Access**: Theme toggle accessible in the Topbar, Login view, and Settings.

### 6. Automated 33-Test RBAC Test Suite
* Dedicated test harness in `server/src/utils/test-rbac.ts`.
* Tests all 11 security scenarios across 33 assertions with 100% pass rate.
* Executed via `npx tsx src/utils/test-rbac.ts`.

### 7. Cloud-Native Database with Resilient Fallback
* Primary connection: **MongoDB Atlas** cloud cluster.
* Automated local fallback: Connects to local MongoDB instance if Atlas connectivity encounters network or IP whitelist restrictions.

---

## Role-Based Access Control Matrix

| Feature / Action | Administrator (`Admin`) | Project Manager (`Project Manager`) | Employee (`Employee`) |
|---|:---:|:---:|:---:|
| **Dashboard Metrics** | System-wide statistics | Scoped to managed projects | Scoped to assigned deliverables |
| **Create Project** | ✅ Yes | ❌ No | ❌ No |
| **Edit Project** | ✅ Any project | ✅ Owned projects only | ❌ View only |
| **Archive / Restore Project** | ✅ Yes | ✅ Owned projects only | ❌ No |
| **Delete Project** | ✅ Yes (Cascade cleanup) | ❌ No | ❌ No |
| **Create Task** | ✅ Yes (Assigns to PM/Dev) | ✅ Yes (Assigns to Dev) | ❌ No |
| **Reassign Task** | ✅ Yes | ✅ Within project team | ❌ No |
| **Update Task Status (Kanban)** | ✅ Yes | ✅ Yes | ✅ Assigned tasks |
| **Task Discussion Comments** | ✅ Read & Post | ✅ Read & Post | ✅ Read & Post |
| **Provision User Accounts** | ✅ PM & Employee | ✅ Employee only | ❌ No |
| **Modify User Roles / Status** | ✅ Yes | ❌ No | ❌ No |
| **Access System Settings** | ✅ Full access | ❌ Forbidden | ❌ Forbidden |
| **Audit Activity Trail** | ✅ System-wide | ✅ System-wide | ✅ System-wide |

---

## Quick Start Guide

### System Prerequisites
* **Node.js**: v18.0.0+ (Tested on v25.9.0 and v20.x)
* **npm**: v9.0.0+
* **MongoDB**: MongoDB Atlas URI or local MongoDB (`mongodb://127.0.0.1:27017`)

---

### Step 1: Install Dependencies

```bash
# Clone the repository
git clone https://github.com/example/icsr-project-management.git
cd ICSR-TA

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

---

### Step 2: Environment Configuration

#### Backend (`server/.env`)
Create or configure `server/.env` based on `server/.env.example`:
```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=<your_mongodb_connection_uri>
JWT_SECRET=<your_secure_random_jwt_secret_key>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

#### Frontend (`client/.env.local`)
Create or configure `client/.env.local` based on `client/.env.example`:
```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

### Step 3: Seed Database

Populate initial institutional projects, deliverable tasks, user accounts, and activity records:

```bash
cd server
npm run seed
```

---

### Step 4: Run Application Locally

Open two terminal windows:

#### Terminal 1 — Start Express Backend
```bash
cd server
npm run dev
# Server running at: http://localhost:5000
# REST API base: http://localhost:5000/api
```

#### Terminal 2 — Start Next.js Frontend
```bash
cd client
npm run dev
# Frontend ready at: http://localhost:3000
```

---

## Pre-Seeded Institutional Demo Accounts

Seeded demo accounts configured for institutional role testing:

| Role | Name | Email Address | Permissions Scope |
|---|---|---|---|
| **Administrator** | Dr. A. Ramanathan (Admin) | `admin@icsr.edu` | System-wide governance, project creation, role management, settings |
| **Project Manager** | Priya Sharma (PM 1) | `pm@icsr.edu` | Scoped to assigned projects, allocate tasks to employees, provision employees |
| **Project Manager** | Dr. Rajesh Varma (PM 2) | `pm2@icsr.edu` | Isolated project portfolio, manage PM 2 deliverables and team |
| **Employee** | Arun Kumar (Dev) | `dev@icsr.edu` | Assigned projects/tasks, interactive Kanban status updates, comments |
| **Employee** | Meera Nair (UI/UX) | `design@icsr.edu` | Design deliverables, milestone progress, task discussions |
| **Employee** | Suresh Raina (QA) | `qa@icsr.edu` | Quality assurance deliverables, status verification |

---

## Automated Verification Suite

Run the 33-test automated RBAC verification suite:

```bash
cd server
npx tsx src/utils/test-rbac.ts
```

**Result**:
```text
================================================================================
  TEST SUMMARY: 33/33 PASSED (0 FAILED, 0 SKIPPED) — 100% SUCCESS
================================================================================
```

---

## Project Structure

```text
ICSR-TA/
├── client/                          # Next.js 16 App Router Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/        # Enterprise login view & theme toggle
│   │   │   ├── (dashboard)/         # Protected role-tailored dashboard views
│   │   │   │   ├── dashboard/       # Metrics cards & Recharts distributions
│   │   │   │   ├── projects/        # Project portfolio & project detail view
│   │   │   │   ├── tasks/           # Tasks table with search & filtering
│   │   │   │   ├── kanban/          # 4-column drag-and-drop workflow
│   │   │   │   ├── team/            # Team roster & user provisioning modal
│   │   │   │   ├── activity/        # Institutional audit activity trail
│   │   │   │   └── settings/        # System settings (Admin only)
│   │   │   ├── globals.css          # Tailwind CSS v4 & custom dark variant
│   │   │   └── layout.tsx           # Anti-FOUC script, ThemeProvider & AuthProvider
│   │   ├── components/
│   │   │   ├── layout/              # Responsive Sidebar & Topbar
│   │   │   ├── ui/                  # Accessible UI component library (Input with eye toggle, Button, Modal)
│   │   │   └── shared/              # EmptyState, ErrorBoundary, ThemeSwitcher
│   │   ├── context/                 # ThemeContext & AuthContext
│   │   ├── lib/                     # Typed API client with credentials
│   │   └── types/                   # Shared TypeScript interfaces
├── server/                          # Express.js + TypeScript Backend
│   ├── src/
│   │   ├── config/                  # Database configuration with Atlas + fallback
│   │   ├── models/                  # Mongoose models (User, Project, Task, Comment, Activity)
│   │   ├── middleware/              # JWT auth, RBAC authorization, Zod validation
│   │   ├── modules/                 # Controllers & routes (Auth, Users, Projects, Tasks, etc.)
│   │   ├── validators/              # Zod validation schemas
│   │   └── utils/
│   │       ├── seed.ts              # Database seeder with sample accounts
│   │       └── test-rbac.ts         # 33-test automated RBAC verification suite
└── docs/                            # Documentation Directory
    ├── README.md                    # Documentation index
    ├── SETUP.md                     # Installation, database seeding & run guide
    ├── API.md                       # Comprehensive REST API reference & schemas
    ├── ARCHITECTURE.md              # System architecture, RBAC, workflows & diagrams
    ├── TESTING.md                   # Automated 33-test suite & Playwright E2E guide
    └── screenshots/                 # High-resolution interface captures
```

---

## License

This project is developed as part of the technical assessment for ICSR. All rights reserved.
