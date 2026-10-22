# ICSR Advanced Project Management System — REST API Documentation

Base URL: `http://localhost:5000/api`

---

## Authentication & Authorization Model

All protected routes require authentication via one of the following mechanisms:
1. **HttpOnly Cookie**: Automatically transmitted via browser requests in a cookie named `token`.
2. **Authorization Header**: Bearer token transmitted as `Authorization: Bearer <signed_jwt>`.

### Institutional Role Hierarchy & Scope

| Role | Scope & Permissions |
|---|---|
| **`Admin`** | Global governance across all projects, tasks, user provisioning, system settings, activity logs, and role escalation. Can assign tasks to Project Managers or assigned project team members. Only Admin can create or permanently delete projects. |
| **`Project Manager`** | Scoped strictly to projects assigned to them (`projectManager: user._id`). Can provision new **Employees**, allocate tasks strictly to project-assigned employees, update project details, archive/restore owned projects, and review deliverables. |
| **`Employee`** | Scoped to projects and tasks assigned to them (`assignedEmployees` or `assignee: user._id`). Can transition task workflow states (e.g. Kanban status), post comments in task discussion threads, and view project timelines. Cannot create projects, allocate tasks, or provision users. |

---

## 1. Authentication Endpoints

### Register User (Disabled)
* **Endpoint**: `POST /auth/register`
* **Access**: Public
* **Status**: **`403 Forbidden`**
* **Description**: Public self-registration is permanently disabled for institutional security compliance. User accounts must be provisioned through role-governed endpoints (`POST /api/users`) by an Administrator or Project Manager.
* **Response** (`403 Forbidden`):
  ```json
  {
    "success": false,
    "message": "Public registration is disabled. Accounts must be provisioned by an Administrator or Project Manager."
  }
  ```

---

### User Login
* **Endpoint**: `POST /auth/login`
* **Access**: Public
* **Request Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "email": "admin@icsr.edu",
    "password": "<account_password>"
  }
  ```
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "67174b8f1029384756abc001",
      "name": "Dr. A. Ramanathan (Admin)",
      "email": "admin@icsr.edu",
      "role": "Admin",
      "status": "Active"
    }
  }
  ```
* **Cookie**: Sets HttpOnly, Secure (in production), SameSite cookie named `token`.

---

### User Logout
* **Endpoint**: `POST /auth/logout`
* **Access**: Public
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
* **Cookie**: Clears the `token` cookie.

---

### Get Current Authenticated Profile
* **Endpoint**: `GET /auth/me`
* **Access**: Authenticated (`Admin`, `Project Manager`, `Employee`)
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "user": {
      "id": "67174b8f1029384756abc001",
      "name": "Dr. A. Ramanathan (Admin)",
      "email": "admin@icsr.edu",
      "role": "Admin",
      "status": "Active"
    }
  }
  ```

---

## 2. User Provisioning & Team Governance

### Provision New User / Team Member
* **Endpoint**: `POST /users`
* **Access**: `Admin`, `Project Manager`
* **Description**: Creates a new user account with cryptographic bcrypt password hashing.
  * **Admin Rules**: May provision either `Employee` or `Project Manager` roles. Can optionally attach the newly provisioned user directly to a `projectId`.
  * **Project Manager Rules**: Can **only** provision `Employee` accounts. If a PM specifies `role: "Project Manager"` or `role: "Admin"`, the request is rejected with `403 Forbidden`. If `projectId` is provided, the employee is automatically enrolled in the project's `assignedEmployees` array.
* **Request Body**:
  ```json
  {
    "name": "Vikram Sethi",
    "email": "vikram.sethi@icsr.edu",
    "password": "<secure_initial_password>",
    "role": "Employee",
    "projectId": "67174b8f1029384756abc101"
  }
  ```
* **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "User provisioned successfully",
    "user": {
      "id": "67174b8f1029384756abc999",
      "name": "Vikram Sethi",
      "email": "vikram.sethi@icsr.edu",
      "role": "Employee",
      "status": "Active"
    }
  }
  ```

---

### List Users
* **Endpoint**: `GET /users`
* **Access**: `Admin`, `Project Manager`
* **Query Parameters**:
  * `role`: Optional filter (`Admin`, `Project Manager`, `Employee`).
  * `search`: Fuzzy name/email search string.
  * `projectId`: Filter users participating in a specific project.
* **Behavior**:
  * `Admin`: Returns all matching institutional accounts.
  * `Project Manager`: Returns employees and team members belonging to their managed projects.
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "count": 4,
    "users": [
      {
        "id": "67174b8f1029384756abc002",
        "name": "Priya Sharma (PM 1)",
        "email": "pm@icsr.edu",
        "role": "Project Manager",
        "status": "Active",
        "createdAt": "2026-10-01T08:00:00.000Z"
      }
    ]
  }
  ```

---

### Update User Profile
* **Endpoint**: `PATCH /users/profile`
* **Access**: Authenticated (`Admin`, `Project Manager`, `Employee`)
* **Request Body**:
  ```json
  {
    "name": "Dr. A. Ramanathan, Ph.D.",
    "email": "a.ramanathan@icsr.edu"
  }
  ```
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "user": { ... }
  }
  ```

---

### Change Password
* **Endpoint**: `POST /users/change-password`
* **Access**: Authenticated (`Admin`, `Project Manager`, `Employee`)
* **Request Body**:
  ```json
  {
    "currentPassword": "<current_password>",
    "newPassword": "<new_secure_password>"
  }
  ```
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Password updated successfully"
  }
  ```

---

### Update User Role
* **Endpoint**: `PATCH /users/:id/role`
* **Access**: `Admin` only
* **Request Body**:
  ```json
  {
    "role": "Project Manager"
  }
  ```
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "User role updated successfully",
    "user": { ... }
  }
  ```

---

### Update User Status (Activate / Deactivate)
* **Endpoint**: `PATCH /users/:id/status`
* **Access**: `Admin` only
* **Request Body**:
  ```json
  {
    "status": "Inactive"
  }
  ```
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "User status updated to Inactive"
  }
  ```

---

## 3. Project Portfolio Management

### List Projects
* **Endpoint**: `GET /projects`
* **Access**: Authenticated
* **Query Parameters**:
  * `status`: Filter by status (`Active`, `Completed`, `On Hold`, `Archived`).
  * `search`: Fuzzy search across project name and description.
  * `includeArchived`: `true` to include archived institutional projects (default `false`).
* **Role Scoping**:
  * `Admin`: Receives all projects across the institution.
  * `Project Manager`: Receives projects where `projectManager == user._id`.
  * `Employee`: Receives projects where `assignedEmployees` contains `user._id`.
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "count": 2,
    "projects": [
      {
        "id": "67174b8f1029384756abc101",
        "name": "E2B Safety Reporting Automation",
        "description": "Integration with regulatory clinical reporting standards",
        "status": "Active",
        "startDate": "2026-10-01T00:00:00.000Z",
        "deadline": "2026-12-15T00:00:00.000Z",
        "projectManager": {
          "id": "67174b8f1029384756abc002",
          "name": "Priya Sharma (PM 1)",
          "email": "pm@icsr.edu"
        },
        "assignedEmployees": [
          {
            "id": "67174b8f1029384756abc004",
            "name": "Arun Kumar (Dev)",
            "email": "dev@icsr.edu"
          }
        ],
        "taskCount": 4,
        "completedTaskCount": 2,
        "progress": 50,
        "isArchived": false
      }
    ]
  }
  ```

---

### Get Project Details
* **Endpoint**: `GET /projects/:id`
* **Access**: Authenticated (`Admin`, assigned `Project Manager`, or assigned `Employee`)
* **Response** (`200 OK`): Returns populated project details including manager, assigned team, task deliverables, and progress metric.

---

### Create Institutional Project
* **Endpoint**: `POST /projects`
* **Access**: `Admin` only
* **Description**: Initializes an institutional project and establishes the responsible Project Manager and initial employee roster.
* **Request Body**:
  ```json
  {
    "name": "Pharmacovigilance Signal Detection AI",
    "description": "Machine learning ingestion for clinical adverse signal discovery",
    "status": "Active",
    "startDate": "2026-11-01T00:00:00.000Z",
    "deadline": "2027-02-28T00:00:00.000Z",
    "projectManager": "67174b8f1029384756abc002",
    "assignedEmployees": [
      "67174b8f1029384756abc004",
      "67174b8f1029384756abc005"
    ]
  }
  ```
* **Response** (`201 Created`): Returns created project document.

---

### Update Project
* **Endpoint**: `PUT /projects/:id` or `PATCH /projects/:id`
* **Access**: `Admin`, or the assigned `Project Manager` of the project.
* **Request Body**: Any valid subset of project fields (`name`, `description`, `status`, `deadline`, `assignedEmployees`).
* **Response** (`200 OK`): Returns updated project document.

---

### Archive Project
* **Endpoint**: `PATCH /projects/:id/archive`
* **Access**: `Admin`, or assigned `Project Manager`.
* **Description**: Soft-archives the project (`isArchived: true`, `status: "Archived"`).
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Project archived successfully"
  }
  ```

---

### Restore Project
* **Endpoint**: `PATCH /projects/:id/restore`
* **Access**: `Admin`, or assigned `Project Manager`.
* **Description**: Restores an archived project (`isArchived: false`, `status: "Active"`).
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Project restored successfully"
  }
  ```

---

### Delete Project
* **Endpoint**: `DELETE /projects/:id`
* **Access**: `Admin` only
* **Description**: Permanently deletes the project document and cascade removes all associated tasks, comments, and audit activity records.
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Project and associated tasks deleted permanently"
  }
  ```

---

## 4. Task Deliverables & Kanban Workflow

### List Tasks
* **Endpoint**: `GET /tasks`
* **Access**: Authenticated
* **Query Parameters**:
  * `projectId`: Filter tasks by project ID.
  * `status`: Filter by status (`To Do`, `In Progress`, `Review`, `Done`).
  * `priority`: Filter by priority (`Low`, `Medium`, `High`, `Critical`).
  * `search`: Fuzzy text search on title or description.
* **Role Scoping**:
  * `Admin`: Access to all tasks.
  * `Project Manager`: Scoped to tasks belonging to projects they manage.
  * `Employee`: Scoped to tasks assigned to them or within projects they are enrolled in.
* **Response** (`200 OK`): Array of populated task documents.

---

### Create Task Deliverable
* **Endpoint**: `POST /tasks`
* **Access**: `Admin`, `Project Manager`
* **Role Assignment Validation Rules**:
  * **Admin Rule**: The Admin can assign tasks to the project's **Project Manager** (as milestone owner) or any **assigned employee** in the project.
  * **Project Manager Rule**: The PM can **only** assign tasks to **assigned employees** belonging to that project's `assignedEmployees` array. Attempting to assign outside the project returns `400 Bad Request`.
  * **Employee Rule**: Employees receive `403 Forbidden`.
* **Request Body**:
  ```json
  {
    "title": "Configure E2B(R3) XML Transformer",
    "description": "Construct automated parser for MedDRA adverse event schemas",
    "project": "67174b8f1029384756abc101",
    "assignee": "67174b8f1029384756abc004",
    "priority": "High",
    "status": "To Do",
    "dueDate": "2026-11-20T00:00:00.000Z"
  }
  ```
* **Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Task created successfully",
    "task": {
      "id": "67174b8f1029384756abc201",
      "title": "Configure E2B(R3) XML Transformer",
      "status": "To Do",
      "priority": "High",
      "project": "67174b8f1029384756abc101",
      "assignee": {
        "id": "67174b8f1029384756abc004",
        "name": "Arun Kumar (Dev)",
        "email": "dev@icsr.edu"
      },
      "createdBy": "67174b8f1029384756abc002"
    }
  }
  ```

---

### Update Task
* **Endpoint**: `PUT /tasks/:id` or `PATCH /tasks/:id`
* **Access**: `Admin`, managing `Project Manager`, or the assigned `Employee`.
* **Description**: Allows updating task title, description, priority, status, or due date. (Employees may only update progress and status).
* **Response** (`200 OK`): Returns updated task.

---

### Reassign Task
* **Endpoint**: `PATCH /tasks/:id/assign`
* **Access**: `Admin`, `Project Manager`
* **Request Body**:
  ```json
  {
    "assignee": "67174b8f1029384756abc005"
  }
  ```
* **Validation**: Enforces the same role-governed assignment rules as task creation.
* **Response** (`200 OK`): Returns reassigned task document.

---

### Update Task Status (Kanban Drop & Quick Status)
* **Endpoint**: `PATCH /tasks/:id/status`
* **Access**: Authenticated (`Admin`, `Project Manager`, or the assigned `Employee`)
* **Request Body**:
  ```json
  {
    "status": "In Progress"
  }
  ```
  *Allowed status values*: `"To Do"` | `"In Progress"` | `"Review"` | `"Done"`
* **Side Effects**: Automatically logs an audit trail event in the Activity collection. If moved to `"Done"`, records completion timestamp.
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Task status updated to In Progress",
    "task": { ... }
  }
  ```

---

### Delete Task
* **Endpoint**: `DELETE /tasks/:id`
* **Access**: `Admin`, or managing `Project Manager`.
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Task deleted successfully"
  }
  ```

---

## 5. Discussions & Task Comments

### List Comments for Task
* **Endpoint**: `GET /comments/task/:taskId`
* **Access**: Authenticated
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "count": 2,
    "comments": [
      {
        "id": "67174b8f1029384756abc301",
        "task": "67174b8f1029384756abc201",
        "content": "XML transformer passed unit tests against ICH E2B(R3) sample envelopes.",
        "author": {
          "id": "67174b8f1029384756abc004",
          "name": "Arun Kumar (Dev)",
          "email": "dev@icsr.edu",
          "role": "Employee"
        },
        "createdAt": "2026-10-15T14:32:00.000Z"
      }
    ]
  }
  ```

---

### Add Comment to Task
* **Endpoint**: `POST /comments`
* **Access**: Authenticated (`Admin`, `Project Manager`, `Employee`)
* **Request Body**:
  ```json
  {
    "task": "67174b8f1029384756abc201",
    "content": "Verified in staging. Ready for final review."
  }
  ```
* **Response** (`201 Created`): Returns created comment document with populated author profile.

---

## 6. Audit Activity & Live Dashboard Metrics

### List System Audit Activity
* **Endpoint**: `GET /activity`
* **Access**: Authenticated
* **Query Parameters**:
  * `limit`: Number of activity records to return (default `30`, max `100`).
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "count": 10,
    "activity": [
      {
        "id": "67174b8f1029384756abc401",
        "type": "TASK_STATUS_CHANGED",
        "description": "Arun Kumar (Dev) moved task 'Configure E2B Schema Validator' to In Progress",
        "user": {
          "id": "67174b8f1029384756abc004",
          "name": "Arun Kumar (Dev)"
        },
        "project": "67174b8f1029384756abc101",
        "task": "67174b8f1029384756abc201",
        "createdAt": "2026-10-22T08:12:00.000Z"
      }
    ]
  }
  ```

---

### Dashboard Aggregate Metrics
* **Endpoint**: `GET /dashboard/stats` or `GET /dashboard`
* **Access**: Authenticated
* **Calculation**: Dynamically aggregated from MongoDB according to caller role:
  * `Admin`: System-wide counts and distributions.
  * `Project Manager`: Aggregated across projects managed by caller.
  * `Employee`: Aggregated across projects and tasks assigned to caller.
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "stats": {
      "totalProjects": 3,
      "activeProjects": 2,
      "completedProjects": 1,
      "totalTasks": 8,
      "completedTasks": 3,
      "inProgressTasks": 3,
      "pendingTasks": 2,
      "overdueTasks": 0,
      "completionRate": 37.5
    },
    "charts": {
      "statusData": [
        { "name": "To Do", "count": 2, "color": "#64748b" },
        { "name": "In Progress", "count": 3, "color": "#3b82f6" },
        { "name": "Review", "count": 1, "color": "#eab308" },
        { "name": "Done", "count": 2, "color": "#10b981" }
      ],
      "priorityData": [
        { "priority": "Low", "count": 1, "color": "#94a3b8" },
        { "priority": "Medium", "count": 3, "color": "#38bdf8" },
        { "priority": "High", "count": 3, "color": "#f97316" },
        { "priority": "Critical", "count": 1, "color": "#ef4444" }
      ]
    },
    "recentActivity": [ ... ],
    "upcomingDeadlines": [ ... ]
  }
  ```

---

## 7. Institutional System Settings

### Get System Settings
* **Endpoint**: `GET /settings`
* **Access**: `Admin` only
* **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "settings": {
      "institutionName": "ICSR Institutional Project Center",
      "defaultTaskDeadlineDays": 14,
      "allowSelfRegistration": false,
      "requireAdminProjectApproval": true,
      "emailNotifications": true
    }
  }
  ```

---

### Update System Settings
* **Endpoint**: `PATCH /settings`
* **Access**: `Admin` only
* **Request Body**: Subset of configuration key-value pairs.
* **Response** (`200 OK`): Returns updated institutional settings object.

---

## 8. Role Authorization Summary Matrix

| Endpoint | Method | Public | Admin | Project Manager | Employee | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| `/auth/register` | POST | ❌ | ❌ | ❌ | ❌ | Disabled (403). Use `/users` |
| `/auth/login` | POST | ✅ | ✅ | ✅ | ✅ | Issues signed JWT + HttpOnly cookie |
| `/auth/logout` | POST | ✅ | ✅ | ✅ | ✅ | Clears cookie |
| `/auth/me` | GET | ❌ | ✅ | ✅ | ✅ | Returns authenticated identity |
| `/users` | GET | ❌ | ✅ | ✅ | ❌ | Admin: all; PM: project team members |
| `/users` | POST | ❌ | ✅ | ✅ | ❌ | Admin: add PM/Dev; PM: add Dev strictly |
| `/users/profile` | PATCH | ❌ | ✅ | ✅ | ✅ | Update own name & email |
| `/users/change-password` | POST | ❌ | ✅ | ✅ | ✅ | Update own password |
| `/users/:id/role` | PATCH | ❌ | ✅ | ❌ | ❌ | Admin role escalation |
| `/users/:id/status` | PATCH | ❌ | ✅ | ❌ | ❌ | Admin user activation/suspension |
| `/projects` | GET | ❌ | ✅ | ✅ | ✅ | Scoped by role & project assignment |
| `/projects` | POST | ❌ | ✅ | ❌ | ❌ | Admin creates projects |
| `/projects/:id` | GET | ❌ | ✅ | ✅ | ✅ | Scoped by project assignment |
| `/projects/:id` | PUT / PATCH | ❌ | ✅ | ✅ | ❌ | PM can update owned projects |
| `/projects/:id/archive` | PATCH | ❌ | ✅ | ✅ | ❌ | PM can archive owned projects |
| `/projects/:id/restore` | PATCH | ❌ | ✅ | ✅ | ❌ | PM can restore owned projects |
| `/projects/:id` | DELETE | ❌ | ✅ | ❌ | ❌ | Admin only (Cascade deletes tasks) |
| `/tasks` | GET | ❌ | ✅ | ✅ | ✅ | Scoped by role & project assignment |
| `/tasks` | POST | ❌ | ✅ | ✅ | ❌ | Admin: assign to PM/Dev; PM: assign to Dev |
| `/tasks/:id` | GET | ❌ | ✅ | ✅ | ✅ | Scoped by project assignment |
| `/tasks/:id` | PUT / PATCH | ❌ | ✅ | ✅ | ✅ | Dev can update progress & status |
| `/tasks/:id/assign` | PATCH | ❌ | ✅ | ✅ | ❌ | Validates team membership |
| `/tasks/:id/status` | PATCH | ❌ | ✅ | ✅ | ✅ | Kanban drag-and-drop state updates |
| `/tasks/:id` | DELETE | ❌ | ✅ | ✅ | ❌ | Admin or managing PM |
| `/comments/task/:id` | GET | ❌ | ✅ | ✅ | ✅ | Task discussion thread |
| `/comments` | POST | ❌ | ✅ | ✅ | ✅ | Post task comment |
| `/activity` | GET | ❌ | ✅ | ✅ | ✅ | Scoped audit trail |
| `/dashboard/stats` | GET | ❌ | ✅ | ✅ | ✅ | Live calculated aggregations |
| `/settings` | GET / PATCH | ❌ | ✅ | ❌ | ❌ | Institutional system settings |
