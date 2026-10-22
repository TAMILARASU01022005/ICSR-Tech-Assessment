# ICSR Technical Assignment — Documentation Directory

Welcome to the comprehensive technical documentation for the **ICSR Advanced Project Management System**. This directory contains detailed guides, API contracts, architectural diagrams, and verification reports for the full-stack system.

---

## Documentation Index

| Document | Primary Audience | Description |
|---|---|---|
| **[SETUP.md]** | Developers, DevOps, Evaluators | Environment configuration (`.env`), MongoDB Atlas cloud setup with local fallback, database seeding commands, institutional demo credentials, local startup commands, and automated test execution. |
| **[API.md]** | Backend Engineers, API Consumers | Complete REST API specification: disabled public registration, role-governed user provisioning, dual-mode task assignment rules, query filters, request/response JSON schemas, and role authorization matrix. |
| **[ARCHITECTURE.md]** | Architects, Senior Engineers | System topology diagram, multi-tier RBAC defense-in-depth model, sequence diagrams (Auth, User Provisioning, Task Delegation, Kanban drag-and-drop), database entity-relationship schema, and universal theme engine. |
| **[TESTING.md]** | QA Engineers, Evaluators | The 33-test automated RBAC verification suite (`test-rbac.ts`), Playwright MCP end-to-end browser testing procedures, Kanban persistence checks, and TypeScript production build benchmarks. |

---

## Core System Highlights

* **3-Tier Role-Based Access Control (RBAC)**: Complete functional separation across **Administrator**, **Project Manager**, and **Employee** roles.
* **Role-Governed User Provisioning**: Public registration is locked (`403 Forbidden`). Administrators provision Project Managers or Employees; Project Managers provision Employees directly into project teams.
* **Dual-Mode Task Assignment**: Administrators allocate tasks to Project Managers as milestone deliverables; Project Managers allocate tasks strictly to assigned team members.
* **Universal Light / Dark Theme**: Clean light mode by default with seamless toggle to dark mode, zero flash of unstyled content (anti-FOUC inline script), and persistent state in `localStorage`.
* **Automated 33-Test Security Suite**: Comprehensive integration testing validating 100% of RBAC constraints via `npx tsx src/utils/test-rbac.ts`.
* **Database Resiliency**: Cloud-native MongoDB Atlas integration with automated failover to local MongoDB (`127.0.0.1:27017`).
