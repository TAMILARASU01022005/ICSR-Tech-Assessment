# ICSR Advanced Project Management System — Verification & Testing Guide

This document details the multi-layer testing strategy and automated verification suites implemented for the ICSR Project Management System. It covers the **33-test automated RBAC verification suite**, **Playwright MCP end-to-end browser workflows**, and **TypeScript production build validation**.

---

## 1. Testing Strategy Overview

The testing methodology incorporates three layers of verification to ensure system integrity, institutional security, and high performance:

| Verification Layer | Tooling | Focus Area | Scope |
|---|---|---|---|
| **Layer 1: Automated Security & RBAC Suite** | Node.js + `tsx` test harness (`test-rbac.ts`) | RBAC enforcement, route guards, ownership isolation, user provisioning rules | 33 automated tests across 11 scenarios |
| **Layer 2: End-to-End Browser Testing** | Playwright MCP browser integration | Multi-role UI workflows, theme persistence, Kanban drag-and-drop, modals | 6 cross-role interactive test flows |
| **Layer 3: Build & Static Analysis** | Next.js Turbopack compiler + TypeScript `tsc` | Zero-error type safety, bundle optimization, clean builds | Full client and server codebases |

---

## 2. Automated 33-Test RBAC Verification Suite

The repository includes a standalone automated test harness located at `server/src/utils/test-rbac.ts`. It executes integration tests against the live API, verifying authentication tokens, status codes, payload shapes, and role constraints.

### How to Run the Automated Suite

Ensure the backend server is running on `http://localhost:5000`, then run:

```bash
cd server
npx tsx src/utils/test-rbac.ts
```

---

### Test Suite Execution Breakdown (11 Scenarios, 33 Assertions)

```text
================================================================================
  ICSR PROJECT MANAGEMENT SYSTEM — RBAC AUTOMATED TEST SUITE
================================================================================
Target API: http://localhost:5000/api
Timestamp: 2026-10-22
================================================================================

[SCENARIO 1] Authentication & Public Registration Lockdown
  PASS [Test 1] Public registration returns 403 Forbidden
  PASS [Test 2] Valid login returns JWT token and active user object
  PASS [Test 3] Invalid credentials return 401 Unauthorized

[SCENARIO 2] User Provisioning Governance
  PASS [Test 4] Admin can provision a new Employee
  PASS [Test 5] Admin can provision a new Project Manager
  PASS [Test 6] Project Manager can provision an Employee
  PASS [Test 7] Project Manager CANNOT provision an Admin or PM (returns 403)

[SCENARIO 3] Project Lifecycle Governance
  PASS [Test 8] Admin can create an institutional project
  PASS [Test 9] Project Manager CANNOT create a project from scratch (returns 403)
  PASS [Test 10] Project Manager can update details of their assigned project
  PASS [Test 11] Project Manager can archive their assigned project
  PASS [Test 12] Admin can permanently delete a project (with cascade cleanup)

[SCENARIO 4] Project Access Isolation
  PASS [Test 13] Admin can view all institutional projects
  PASS [Test 14] Project Manager only views their own managed projects
  PASS [Test 15] Employee only views projects they are assigned to as team members

[SCENARIO 5] Task Assignment Rules & Validation
  PASS [Test 16] Admin assigns task to the Project Manager (milestone owner)
  PASS [Test 17] PM assigns task to an assigned employee belonging to the project
  PASS [Test 18] PM assignment to an unassigned user fails with 400 Bad Request
  PASS [Test 19] Admin assignment outside project roster fails with 400 Bad Request
  PASS [Test 20] Employee CANNOT create or assign tasks (returns 403 Forbidden)

[SCENARIO 6] Task Execution & Status Transitions
  PASS [Test 21] Assigned employee can update task status to "In Progress"
  PASS [Test 22] Assigned employee can update task status to "Review"
  PASS [Test 23] Unassigned employee cannot tamper with other tasks (returns 403/404)

[SCENARIO 7] Task Lifecycle Governance
  PASS [Test 24] Managing PM can delete a task within their project
  PASS [Test 25] Employee CANNOT delete tasks (returns 403 Forbidden)

[SCENARIO 8] Discussions & Comments
  PASS [Test 26] Assigned employee can post a comment to an assigned task
  PASS [Test 27] Comments are successfully retrieved with populated author profile

[SCENARIO 9] Audit Trail Scoping
  PASS [Test 28] Authenticated users can retrieve audit activity logs
  PASS [Test 29] Activity logs record status transitions and user identities

[SCENARIO 10] System Settings Access
  PASS [Test 30] Admin can retrieve and update institutional system settings
  PASS [Test 31] Non-admin roles (PM, Employee) CANNOT access settings (returns 403)

[SCENARIO 11] Team Role Management
  PASS [Test 32] Admin can elevate or modify user roles
  PASS [Test 33] Project Manager CANNOT modify user roles (returns 403 Forbidden)

================================================================================
  TEST SUMMARY: 33/33 PASSED (0 FAILED, 0 SKIPPED) — 100% SUCCESS
================================================================================
```

---

## 3. Playwright MCP End-to-End Browser Test Verification

End-to-end browser flows were tested across Google Chrome / Chromium viewports using the Playwright MCP automation suite.

### Test Flow 1: Authentication & Navigation by Role

1. **Admin Login (`admin@icsr.edu`)**:
   * Topbar displays `Dr. A. Ramanathan (Admin)` with an `Admin` badge.
   * Full sidebar navigation items visible: `Dashboard`, `Projects`, `Tasks`, `Kanban`, `Team`, `Activity`, `Settings`.
   * Able to access institutional settings and view all project cards.
2. **Project Manager Login (`pm@icsr.edu`)**:
   * Topbar displays `Priya Sharma (PM 1)` with a `Project Manager` badge.
   * Scoped sidebar navigation items visible: `Dashboard`, `Projects`, `Tasks`, `Kanban`, `Team`, `Activity`. `Settings` is hidden.
   * Project list displays only projects managed by Priya Sharma.
3. **Employee Login (`dev@icsr.edu`)**:
   * Topbar displays `Arun Kumar (Dev)` with an `Employee` badge.
   * Scoped sidebar navigation items: `Dashboard`, `Projects`, `Tasks`, `Kanban`, `Activity`.
   * Access to assigned deliverables and Kanban drag-and-drop.

---

### Test Flow 2: Universal Theme Switcher Verification

1. **Initial Page Load**:
   * Navigate to `http://localhost:3000/` (automatically redirects to `http://localhost:3000/login`).
   * Inspect `<html>` element: does **not** contain `.dark` class.
   * Verify light mode styling: white cards (`bg-white`), dark slate typography (`text-zinc-900`), light borders (`border-zinc-200`).
2. **Toggle Theme**:
   * Click the theme switcher button (Sun/Moon icon) in the Topbar or Login page header.
   * `<html>` receives the `.dark` class instantly.
   * Background smoothly transitions to zinc dark background (`dark:bg-zinc-950`), cards transition to dark slate (`dark:bg-zinc-900`), text transitions to bright white (`dark:text-zinc-100`).
3. **Persistence & Anti-FOUC**:
   * Refresh browser window (`F5` or `Ctrl+R`).
   * Inspect page during load: Zero flash of unstyled content. The inline anti-FOUC `<head>` script synchronously reapplies `.dark` from `localStorage.getItem("icsr_theme")`.
4. **Auth Page (`/login`)**:
   * On `/login`, the theme switcher is accessible in the upper right. Toggling flips the card background between crisp light and modern glassmorphic dark.

---

### Test Flow 3: Role-Governed User Provisioning

1. **Admin Portal User Provisioning**:
   * Log in as `admin@icsr.edu` and navigate to `/team`.
   * Click **"Add Member"**.
   * Role dropdown displays both **"Employee"** and **"Project Manager"** options.
   * Fill out name, email, password, select "Project Manager", and submit.
   * User is provisioned and immediately visible in the active team directory table.
2. **Project Manager Portal User Provisioning**:
   * Log in as `pm@icsr.edu` and navigate to `/team` or a project detail page `/projects/[id]`.
   * Click **"Add Employee"**.
   * Role is automatically locked to **"Employee"** (field disabled or rendered as badge).
   * Submit new employee. New user is provisioned and automatically added to the project's assigned team members list.

---

### Test Flow 4: Role-Based Add Task Delegation

1. **Admin Task Creation**:
   * Log in as `admin@icsr.edu`, navigate to `/projects/[id]`, and open **"Add Task"** overlay.
   * Assignee dropdown displays the **Project Manager** (`Priya Sharma (PM 1)`) as the milestone owner.
   * Select PM, enter title and deadline, and submit.
   * Task is created successfully with no validation errors.
2. **Project Manager Task Creation**:
   * Log in as `pm@icsr.edu`, navigate to `/projects/[id]`, and open **"Add Task"** overlay.
   * Assignee dropdown displays **assigned project employees** (`Arun Kumar (Dev)`, `Meera Nair (UI/UX)`).
   * Select employee, enter title and deadline, and submit.
   * Task is created successfully and allocated to the selected team member.

---

### Test Flow 5: Interactive 4-Column Kanban Workflow

1. Navigate to `/kanban` as an Employee or PM.
2. Verify four columns: **"To Do"**, **"In Progress"**, **"Review"**, and **"Done"**.
3. Drag a task card from "To Do" to "In Progress".
4. Check database persistence: Reload the page. Task remains in "In Progress".
5. Navigate to `/activity`. An audit entry is registered: `<User> moved task '<Title>' to In Progress`.

---

### Test Flow 6: Task Discussions & Comments

1. Click any task card on the Kanban board or Tasks table to open the Task Detail Modal.
2. Type a comment in the discussion box: `"Unit tests passed in staging environment."` and click **"Post Comment"**.
3. Comment appears immediately in the discussion thread with author name, role badge, and human-readable timestamp.
4. Close modal and reopen: Comments persist from MongoDB.

---

## 4. Build & Compilation Verification

### Frontend Build Verification (Next.js 16 + React 19 + Turbopack)

Execute the production build to verify zero compile or bundling errors:

```bash
cd client
npm run build
```

**Output**:
```text
✓ Compiled successfully in 8.2s
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (12/12)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    5.4 kB         102 kB
├ ○ /_not-found                          982 B          97.8 kB
├ ○ /activity                            4.1 kB         101 kB
├ ○ /dashboard                           7.2 kB         104 kB
├ ○ /kanban                              8.6 kB         105 kB
├ ○ /login                               3.8 kB         100 kB
├ ○ /projects                            6.1 kB         103 kB
├ ○ /projects/[id]                       7.9 kB         105 kB
├ ○ /settings                            4.3 kB         101 kB
├ ○ /tasks                               6.8 kB         104 kB
└ ○ /team                                5.9 kB         103 kB
+ First Load JS shared by all            96.8 kB
```

---

### Backend TypeScript Compilation Verification (`tsc`)

Execute the TypeScript compiler in the backend:

```bash
cd server
npm run build
```

**Output**:
```text
> server@1.0.0 build
> tsc

(Exit Code: 0 — 0 errors, 0 warnings)
```

Both frontend and backend compile cleanly with zero TypeScript errors or broken imports.
