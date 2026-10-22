# ICSR Advanced Project Management System — System Architecture

This document provides a comprehensive architectural overview of the ICSR Technical Assignment Project Management System. It details the system topology, multi-tier role-based access control (RBAC), sequence workflows, data models, theme engine, and institutional security mechanisms.

---

## 1. High-Level System Topology

The ICSR Project Management System is structured as a decoupled, multi-tier enterprise web application comprising a modern Next.js 16 frontend, an Express.js TypeScript REST API backend, and a cloud-native MongoDB database with automated local failover.

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Next.js 16 App Router)"]
        UI["React 19 Server & Client Components"]
        ThemeEngine["Universal Theme Engine (Light / Dark)"]
        AuthContext["Auth State & Role Guarding"]
        KanbanEngine["Interactive Kanban Board State"]
        APIClient["Typed API Client (Fetch + Credentials)"]
    end

    subgraph APILayer ["API Gateway & Controller Layer (Express + TypeScript)"]
        CORS["CORS & Helmet Security Middleware"]
        AuthMW["JWT Authentication (Cookie / Bearer)"]
        RBACMW["Role Authorization Middleware"]
        Validators["Zod Schema Validation Pipeline"]
        Controllers["Domain Controllers (Auth, Users, Projects, Tasks, Comments, Activity)"]
    end

    subgraph DataLayer ["Data & Persistence Layer"]
        Mongoose["Mongoose ODM (Strict Schemas & Cascade Hooks)"]
        AtlasDB[("MongoDB Atlas Cloud Cluster")]
        LocalDB[("Local MongoDB Fallback (127.0.0.1:27017)")]
    end

    UI --> APIClient
    ThemeEngine -.-> UI
    AuthContext -.-> UI
    KanbanEngine -.-> UI

    APIClient -->|HTTPS / JSON + Cookies| CORS
    CORS --> AuthMW
    AuthMW --> RBACMW
    RBACMW --> Validators
    Validators --> Controllers

    Controllers --> Mongoose
    Mongoose -->|Primary Connection| AtlasDB
    Mongoose -.->|Automated Fallback| LocalDB
```

---

## 2. Multi-Tier Role-Based Access Control (RBAC) Architecture

Security and isolation are implemented with a **defense-in-depth** strategy across three distinct layers:

```
[Layer 1: Frontend Route & Component Guards]
                 ↓
[Layer 2: API Route Authorization Middleware]
                 ↓
[Layer 3: Controller-Level Resource Ownership Enforcement]
```

### 1. Layer 1: Frontend Route & UI Guards
* **Navigation Filtering**: The sidebar and top navigation dynamically filter accessible menus based on the authenticated user's role (`user.role`).
* **Route Protection**: Protected views check the active session. Unauthorized roles attempting to access higher-privilege pages (such as `/settings` or `/team` with unauthorized role escalation) are redirected.
* **Component-Level Conditional Rendering**: Action controls (e.g., "Add Member", "Add Project", "Delete Project", "Assign to PM") only render if the authenticated user possesses explicit authority.

### 2. Layer 2: API Route Authorization Middleware
* Express route endpoints invoke `authenticate` to decode and verify signed JWTs from `req.cookies.token` or `Authorization: Bearer`.
* Routes chain `authorize("Admin")` or `authorize("Admin", "Project Manager")`. Any role outside the permitted whitelist is terminated with `403 Forbidden` before controller execution.

### 3. Layer 3: Controller-Level Resource Ownership Isolation
* Even when an authenticated Project Manager or Employee makes an authorized request, controllers verify resource ownership:
  * **Project Manager**: May only read, update, or archive projects where `project.projectManager.equals(user._id)`.
  * **Employee**: May only access projects and tasks where they are explicitly enumerated in `assignedEmployees` or `task.assignee`.
  * **Role Mutation Lockdown**: Project Managers are barred from elevating users to `Admin` or `Project Manager` (enforced at the controller level with HTTP 403).

---

## 3. Core Operational Workflows

### Workflow 1: Authentication & Session Lifecycle

Public registration is disabled. Users authenticate using enterprise credentials issued by system administrators.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Browser)
    participant Client as Next.js Client
    participant AuthAPI as Express Auth Module
    participant DB as MongoDB Atlas

    User->>Client: Enters Email & Password
    Client->>AuthAPI: POST /api/auth/login { email, password }
    AuthAPI->>DB: Find User by Email
    DB-->>AuthAPI: User document (with bcrypt hash)
    AuthAPI->>AuthAPI: Verify password via bcrypt.compare()
    alt Invalid Credentials
        AuthAPI-->>Client: 401 Unauthorized { message: "Invalid credentials" }
        Client-->>User: Display error notification
    else Credentials Valid & Active
        AuthAPI->>AuthAPI: Sign JWT with user ID and role
        AuthAPI-->>Client: 200 OK + Set-Cookie: token (HttpOnly) + User payload
        Client->>Client: Update AuthContext & navigate to /dashboard
        Client-->>User: Render role-tailored dashboard
    end
```

---

### Workflow 2: Role-Governed User Provisioning

To prevent rogue account creation, user provisioning is restricted to Administrators and Project Managers under strict role constraints.

```mermaid
sequenceDiagram
    autonumber
    actor AdminPM as Administrator or Project Manager
    participant Client as Next.js Dashboard
    participant UserAPI as Express Users Controller
    participant DB as MongoDB Atlas

    AdminPM->>Client: Clicks "Add Member" / "Add Employee"
    Client->>Client: Render Modal (PM view locks role to "Employee")
    AdminPM->>Client: Submits Name, Email, Password, Role, [ProjectId]
    Client->>UserAPI: POST /api/users
    
    UserAPI->>UserAPI: Authenticate caller role
    alt Caller is Project Manager & Role != Employee
        UserAPI-->>Client: 403 Forbidden ("Project Managers can only provision Employees")
    else Validation Passed
        UserAPI->>DB: Check for existing email
        alt Email Exists
            UserAPI-->>Client: 409 Conflict ("Email already in use")
        else Unique Email
            UserAPI->>UserAPI: Hash password with bcrypt (10 salt rounds)
            UserAPI->>DB: Insert new User { role, status: "Active" }
            opt ProjectId Provided
                UserAPI->>DB: Append new user ID to Project.assignedEmployees
            end
            UserAPI->>DB: Log Activity { type: "USER_PROVISIONED" }
            UserAPI-->>Client: 201 Created { user: { id, name, email, role } }
            Client->>Client: Update UI table & project roster dynamically
        end
    end
```

---

### Workflow 3: Dual-Mode Task Assignment & Delegation

Task assignment enforces distinct responsibilities between executive administrators and project managers:

```mermaid
sequenceDiagram
    autonumber
    actor Creator as Admin or Project Manager
    participant Client as Add Task Overlay
    participant TaskAPI as Express Tasks Controller
    participant DB as MongoDB Atlas

    Creator->>Client: Opens "Add Task" for Project
    Client->>Client: Inspect Creator Role
    
    alt Creator is Admin
        Client->>Client: Populate Assignee dropdown with Project's PM
    else Creator is Project Manager
        Client->>Client: Populate Assignee dropdown with Project's Assigned Employees
    end

    Creator->>Client: Selects Assignee, Priority, Due Date & Submits
    Client->>TaskAPI: POST /api/tasks { title, project, assignee, priority, dueDate }
    
    TaskAPI->>DB: Fetch Target Project
    TaskAPI->>TaskAPI: Validate Assignee against Project Team
    
    alt Creator is PM & Assignee not in project.assignedEmployees
        TaskAPI-->>Client: 400 Bad Request ("Selected employee does not belong to this project's assigned team members")
    else Creator is Admin & Assignee not (PM or assignedEmployees)
        TaskAPI-->>Client: 400 Bad Request ("Assignee must be the Project Manager or an assigned employee")
    else Assignment Valid
        TaskAPI->>DB: Insert Task document { status: "To Do", createdBy }
        TaskAPI->>DB: Log Activity { type: "TASK_CREATED" }
        TaskAPI-->>Client: 201 Created { task }
        Client->>Client: Insert into Kanban column "To Do"
    end
```

---

### Workflow 4: Interactive Kanban State Transitions

```mermaid
sequenceDiagram
    autonumber
    actor Employee as Assigned Employee / PM / Admin
    participant Kanban as Kanban Board (HTML5 Drag & Drop)
    participant TaskAPI as Express Tasks Controller
    participant DB as MongoDB Atlas

    Employee->>Kanban: Drags task card from "In Progress" to "Done"
    Kanban->>Kanban: Optimistic UI update (re-renders columns instantly)
    Kanban->>TaskAPI: PATCH /api/tasks/:id/status { status: "Done" }
    
    TaskAPI->>DB: Update Task status & completedAt timestamp
    TaskAPI->>DB: Record Activity { type: "TASK_STATUS_CHANGED", from: "In Progress", to: "Done" }
    TaskAPI-->>Kanban: 200 OK { task }
    
    opt Failure Rollback
        TaskAPI-->>Kanban: 500 / 403 Error
        Kanban->>Kanban: Rollback card position & show error toast
    end
```

---

## 4. Universal Theme Engine Architecture

The application implements a zero-FOUC (Flash of Unstyled Content), persistent light and dark theme engine tailored for dense, data-rich SaaS dashboards.

### Design Principles & Defaults
* **Default Theme**: **Light Mode** is the institutional default across all login, authentication, and dashboard pages.
* **Tailwind CSS v4 Configuration**: Configured with `@custom-variant dark (&:where(.dark, .dark *));` in `client/src/app/globals.css`.
* **Synchronous Anti-FOUC Script**: An inline script executes in `<head>` before DOM hydration, reading `localStorage.getItem("icsr_theme")` and applying the `.dark` class to `document.documentElement` if explicitly set to dark.
* **Component-Level React Context**: `ThemeProvider` exposes `theme` ("light" | "dark") and `toggleTheme()` to provide seamless toggle controls in the Topbar, Login view, and Settings page.

```mermaid
flowchart LR
    BrowserLoad["Page Load"] --> AntiFOUC["Inline Script in &lt;head&gt;"]
    AntiFOUC --> ReadStorage{"Check localStorage.icsr_theme"}
    ReadStorage -->|"dark"| AddDarkClass["Add .dark class to &lt;html&gt;"]
    ReadStorage -->|"light" or null (default)| SetLight["Ensure no .dark class (Default: Light)"]
    AddDarkClass --> Hydrate["React 19 Hydrates ThemeProvider"]
    SetLight --> Hydrate
    Hydrate --> UserToggle["User Clicks Theme Switcher"]
    UserToggle --> UpdateContext["Toggle Theme in React State"]
    UpdateContext --> SaveStorage["Persist choice to localStorage"]
    UpdateContext --> ToggleDOMClass["Add/Remove .dark on &lt;html&gt;"]
```

---

## 5. Database Schema & Entity Relationships

The data model is built using Mongoose schemas over MongoDB with explicit relationship integrity:

```mermaid
erDiagram
    User ||--o{ Project : "manages as PM"
    User }o--o{ Project : "participates in (assignedEmployees)"
    Project ||--o{ Task : "contains"
    User ||--o{ Task : "assigned to"
    User ||--o{ Task : "created by"
    Task ||--o{ Comment : "has discussions"
    User ||--o{ Comment : "authored by"
    User ||--o{ Activity : "triggered by"
    Project ||--o{ Activity : "associated with"
    Task ||--o{ Activity : "associated with"

    User {
        ObjectId _id PK
        string name
        string email UK
        string password
        string role "Admin | Project Manager | Employee"
        string status "Active | Inactive"
        datetime createdAt
    }

    Project {
        ObjectId _id PK
        string name
        string description
        string status "Active | Completed | On Hold | Archived"
        ObjectId projectManager FK
        ObjectId[] assignedEmployees FK
        datetime startDate
        datetime deadline
        boolean isArchived
        datetime createdAt
    }

    Task {
        ObjectId _id PK
        string title
        string description
        ObjectId project FK
        ObjectId assignee FK
        ObjectId createdBy FK
        string status "To Do | In Progress | Review | Done"
        string priority "Low | Medium | High | Critical"
        datetime dueDate
        datetime completedAt
        datetime createdAt
    }

    Comment {
        ObjectId _id PK
        ObjectId task FK
        ObjectId author FK
        string content
        datetime createdAt
    }

    Activity {
        ObjectId _id PK
        string type "PROJECT_CREATED | TASK_STATUS_CHANGED | ..."
        string description
        ObjectId user FK
        ObjectId project FK
        ObjectId task FK
        datetime createdAt
    }

    SystemSettings {
        ObjectId _id PK
        string institutionName
        number defaultTaskDeadlineDays
        boolean allowSelfRegistration
        boolean emailNotifications
        datetime updatedAt
    }
```

---

## 6. Security Architecture & Threat Mitigation

| Security Concern | Implementation & Mitigation |
|---|---|
| **Credential Theft** | Passwords salted and hashed with `bcryptjs` (work factor: 10 rounds). Passwords never returned in API payloads (`select("-password")`). |
| **Token Hijacking & XSS** | JWTs transmitted via `HttpOnly`, `SameSite=Lax` cookies to prevent client-side JavaScript access. In production, `Secure` flag enforces HTTPS. |
| **Header Injection & Clickjacking** | Helmet middleware injects OWASP-recommended HTTP security headers: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`. |
| **Cross-Origin Abuse** | Express CORS configured strictly with `origin: CLIENT_URL` (whitelisted) and `credentials: true`. Wildcards (`*`) are disallowed. |
| **Payload Injection & Tampering** | Incoming request payloads undergo runtime validation via Zod schemas (`auth.validator.ts`, `task.validator.ts`, `comment.validator.ts`) prior to controller logic. |
| **Unauthorized Privilege Escalation** | Multi-layer authorization checks prevent non-admins from modifying user roles or account statuses. Public registration disabled. |
| **Data Integrity on Deletion** | Project deletion employs transactional or cascade cleanup logic to purge associated tasks, discussions, and activity records. |
