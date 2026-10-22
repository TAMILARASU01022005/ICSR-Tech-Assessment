import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

const BASE_URL = "http://localhost:5000/api";

interface AuthResponse {
  success: boolean;
  token: string;
  user: { id: string; name: string; email: string; role: string; isActive?: boolean };
}

async function login(email: string, password = "Password@123"): Promise<{ token: string; user: any }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as AuthResponse;
  if (!data.success) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  }
  return { token: data.token, user: data.user };
}

async function runTests() {
  console.log("==================================================================");
  console.log(" STARTING ICSR ADVANCED RBAC AUTOMATED SUITE");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate All Seed Roles
    console.log("\n--- Authenticating Users ---");
    const admin = await login("admin@icsr.edu");
    const pm1 = await login("pm@icsr.edu");
    const pm2 = await login("pm2@icsr.edu");
    const emp1 = await login("dev@icsr.edu");
    const emp2 = await login("design@icsr.edu");
    const emp3 = await login("qa@icsr.edu");

    assert(admin.user.role === "Admin", "Admin logged in successfully");
    assert(pm1.user.role === "Project Manager", "PM 1 logged in successfully");
    assert(pm2.user.role === "Project Manager", "PM 2 logged in successfully");
    assert(emp1.user.role === "Employee", "Employee 1 (dev) logged in successfully");
    assert(emp2.user.role === "Employee", "Employee 2 (design) logged in successfully");
    assert(emp3.user.role === "Employee", "Employee 3 (qa) logged in successfully");

    // SCENARIO 1: Admin creates a project, assigns a PM, and adds employees
    console.log("\n--- Scenario 1: Admin Project Creation & Assignment ---");
    const createProjectRes = await fetch(`${BASE_URL}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({
        name: "Bio-Imaging Cloud Repository",
        description: "High-resolution microscopy archiving",
        status: "Active",
        projectManager: pm1.user.id,
        assignedEmployees: [emp1.user.id, emp2.user.id],
      }),
    });
    const createdProjectData = (await createProjectRes.json()) as any;
    assert(createProjectRes.status === 201, "Admin creates project successfully (201)");
    const newProjectId = createdProjectData.project._id;

    // PM cannot create a project (Admin only)
    const pmCreateProjRes = await fetch(`${BASE_URL}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pm1.token}` },
      body: JSON.stringify({
        name: "Unauthorized PM Project",
        projectManager: pm1.user.id,
      }),
    });
    assert(pmCreateProjRes.status === 403, "PM cannot create projects (403 Forbidden)");

    // SCENARIO 2: PM logs in and sees only their own projects
    console.log("\n--- Scenario 2: PM Project Isolation ---");
    const pm1ProjectsRes = await fetch(`${BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${pm1.token}` },
    });
    const pm1ProjectsData = (await pm1ProjectsRes.json()) as any;
    const pm1ProjectIds = pm1ProjectsData.projects.map((p: any) => p._id);

    const pm2ProjectsRes = await fetch(`${BASE_URL}/projects`, {
      headers: { Authorization: `Bearer ${pm2.token}` },
    });
    const pm2ProjectsData = (await pm2ProjectsRes.json()) as any;
    const pm2ProjectIds = pm2ProjectsData.projects.map((p: any) => p._id);

    const overlap = pm1ProjectIds.filter((id: string) => pm2ProjectIds.includes(id));
    assert(overlap.length === 0, "PM 1 and PM 2 project lists are completely mutually isolated");
    assert(pm1ProjectIds.includes(newProjectId), "PM 1 sees newly assigned project");
    assert(!pm2ProjectIds.includes(newProjectId), "PM 2 cannot see PM 1's newly assigned project");

    // SCENARIO 3: PM creates tasks and assigns them to employees in the selected project
    console.log("\n--- Scenario 3: PM Task Creation & Project Member Assignment ---");
    const pmCreateTaskRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pm1.token}` },
      body: JSON.stringify({
        title: "Microscopy Compression Pipeline",
        description: "Implement lossless compression algorithm",
        project: newProjectId,
        assignee: emp1.user.id,
        priority: "High",
        status: "To Do",
      }),
    });
    const pmCreateTaskData = (await pmCreateTaskRes.json()) as any;
    assert(pmCreateTaskRes.status === 201, "PM creates task in authorized project (201)");
    const emp1TaskId = pmCreateTaskData.task._id;

    // PM attempts to assign task to employee NOT in the project (emp3 is not in newProjectId)
    const invalidAssigneeRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pm1.token}` },
      body: JSON.stringify({
        title: "Invalid Member Task",
        project: newProjectId,
        assignee: emp3.user.id,
      }),
    });
    assert(
      invalidAssigneeRes.status === 400,
      "PM rejected when assigning task to employee not in project (400 Bad Request)"
    );

    // SCENARIO 4: Employee A sees only Employee A's assigned tasks
    console.log("\n--- Scenario 4: Employee Task Privacy ---");
    const emp1TasksRes = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${emp1.token}` },
    });
    const emp1TasksData = (await emp1TasksRes.json()) as any;
    const emp1TaskAssigneeMismatch = emp1TasksData.tasks.some(
      (t: any) => (t.assignee?.id || t.assignee?._id || t.assignee) !== emp1.user.id
    );
    assert(
      !emp1TaskAssigneeMismatch && emp1TasksData.tasks.length > 0,
      `Employee 1 sees ONLY tasks assigned to themselves (${emp1TasksData.tasks.length} tasks)`
    );

    const emp2TasksRes = await fetch(`${BASE_URL}/tasks`, {
      headers: { Authorization: `Bearer ${emp2.token}` },
    });
    const emp2TasksData = (await emp2TasksRes.json()) as any;
    const emp2TaskAssigneeMismatch = emp2TasksData.tasks.some(
      (t: any) => (t.assignee?.id || t.assignee?._id || t.assignee) !== emp2.user.id
    );
    assert(
      !emp2TaskAssigneeMismatch && emp2TasksData.tasks.length > 0,
      `Employee 2 sees ONLY tasks assigned to themselves (${emp2TasksData.tasks.length} tasks)`
    );

    // SCENARIO 5: Employee A cannot access Employee B's task by guessing its ID
    console.log("\n--- Scenario 5: Employee Direct Task ID Tamper Defense ---");
    const emp2AccessEmp1TaskRes = await fetch(`${BASE_URL}/tasks/${emp1TaskId}`, {
      headers: { Authorization: `Bearer ${emp2.token}` },
    });
    assert(
      emp2AccessEmp1TaskRes.status === 403,
      "Employee 2 cannot read Employee 1's task by ID (403 Forbidden)"
    );

    // SCENARIO 6: Employee A cannot change assignedTo, project ownership, or user roles
    console.log("\n--- Scenario 6: Employee Privilege Escalation Protection ---");
    // Attempt 1: Employee trying to reassign task
    const empReassignRes = await fetch(`${BASE_URL}/tasks/${emp1TaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${emp1.token}` },
      body: JSON.stringify({ assignee: emp2.user.id, title: "Hacked Title" }),
    });
    // Task title and assignee should remain unchanged
    const verifyTaskRes = await fetch(`${BASE_URL}/tasks/${emp1TaskId}`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const verifyTaskData = (await verifyTaskRes.json()) as any;
    assert(
      verifyTaskData.task.title === "Microscopy Compression Pipeline" &&
        (verifyTaskData.task.assignee?.id || verifyTaskData.task.assignee?._id) === emp1.user.id,
      "Employee cannot modify task title or reassign task via PATCH /api/tasks/:id"
    );

    // Attempt 2: Employee trying dedicated assign endpoint
    const empAssignEndpointRes = await fetch(`${BASE_URL}/tasks/${emp1TaskId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${emp1.token}` },
      body: JSON.stringify({ assignee: emp2.user.id }),
    });
    assert(
      empAssignEndpointRes.status === 403,
      "Employee rejected from PATCH /api/tasks/:id/assign (403 Forbidden)"
    );

    // Attempt 3: Employee trying to modify user role
    const empRoleEscalationRes = await fetch(`${BASE_URL}/users/${emp1.user.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${emp1.token}` },
      body: JSON.stringify({ role: "Admin" }),
    });
    assert(
      empRoleEscalationRes.status === 403,
      "Employee rejected from modifying user roles (403 Forbidden)"
    );

    // SCENARIO 7: PM cannot read or modify another PM's projects or tasks
    console.log("\n--- Scenario 7: Cross-PM Boundary Isolation ---");
    // PM 2 attempts to view PM 1's project details
    const pm2ViewPm1ProjRes = await fetch(`${BASE_URL}/projects/${newProjectId}`, {
      headers: { Authorization: `Bearer ${pm2.token}` },
    });
    assert(
      pm2ViewPm1ProjRes.status === 403,
      "PM 2 cannot view PM 1's project (403 Forbidden)"
    );

    // PM 2 attempts to create a task in PM 1's project
    const pm2CreateTaskInPm1ProjRes = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pm2.token}` },
      body: JSON.stringify({
        title: "Unauthorized PM 2 Task",
        project: newProjectId,
      }),
    });
    assert(
      pm2CreateTaskInPm1ProjRes.status === 403,
      "PM 2 cannot create task in PM 1's project (403 Forbidden)"
    );

    // PM 2 attempts to update PM 1's task
    const pm2UpdatePm1TaskRes = await fetch(`${BASE_URL}/tasks/${emp1TaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pm2.token}` },
      body: JSON.stringify({ title: "Tampered by PM 2" }),
    });
    assert(
      pm2UpdatePm1TaskRes.status === 403,
      "PM 2 cannot update PM 1's task (403 Forbidden)"
    );

    // SCENARIO 8: Dedicated PATCH /api/tasks/:id/assign and status changes
    console.log("\n--- Scenario 8: Assignment Endpoint & Permitted Status Changes ---");
    // PM 1 reassigns task to emp2 (who is in newProjectId)
    const reassignRes = await fetch(`${BASE_URL}/tasks/${emp1TaskId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pm1.token}` },
      body: JSON.stringify({ assignee: emp2.user.id }),
    });
    assert(reassignRes.status === 200, "PM 1 successfully reassigns task to emp2 via /assign");

    // Employee 2 updates status of their newly assigned task to 'In Progress'
    const emp2StatusRes = await fetch(`${BASE_URL}/tasks/${emp1TaskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${emp2.token}` },
      body: JSON.stringify({ status: "In Progress" }),
    });
    assert(emp2StatusRes.status === 200, "Employee updates their assigned task status (200)");

    // Employee 1 (no longer assigned) tries to update status -> should be 403
    const emp1StatusAfterReassignRes = await fetch(`${BASE_URL}/tasks/${emp1TaskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${emp1.token}` },
      body: JSON.stringify({ status: "Done" }),
    });
    assert(
      emp1StatusAfterReassignRes.status === 403,
      "Unassigned employee cannot update status (403 Forbidden)"
    );

    // SCENARIO 9: Dashboard statistics respect each role's permissions
    console.log("\n--- Scenario 9: Dashboard Statistics Authorization Scoping ---");
    const adminDashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const adminDashData = (await adminDashRes.json()) as any;

    const pm1DashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${pm1.token}` },
    });
    const pm1DashData = (await pm1DashRes.json()) as any;

    const emp2DashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Authorization: `Bearer ${emp2.token}` },
    });
    const emp2DashData = (await emp2DashRes.json()) as any;

    assert(
      adminDashData.stats.totalProjects >= pm1DashData.stats.totalProjects,
      "Admin sees all projects on dashboard, PM sees only managed projects"
    );
    assert(
      pm1DashData.stats.totalTasks > emp2DashData.stats.totalTasks,
      "PM sees all tasks in their projects, Employee sees only their assigned tasks"
    );
    assert(
      emp2DashData.stats.totalTasks === emp2TasksData.tasks.length + 1, // +1 because we just assigned emp1TaskId to emp2
      "Employee dashboard task count exactly matches list of tasks assigned to that employee"
    );

    // SCENARIO 10: Comments and Activity Authorization
    console.log("\n--- Scenario 10: Comments & Activity Scoping ---");
    // Employee 2 comments on their assigned task
    const addCommentRes = await fetch(`${BASE_URL}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${emp2.token}` },
      body: JSON.stringify({ task: emp1TaskId, content: "Starting work on lossless compression algorithm." }),
    });
    assert(addCommentRes.status === 201, "Employee 2 successfully comments on assigned task (201)");

    // Employee 3 (unassigned) tries to view comments on that task
    const emp3ViewCommentsRes = await fetch(`${BASE_URL}/comments/task/${emp1TaskId}`, {
      headers: { Authorization: `Bearer ${emp3.token}` },
    });
    assert(
      emp3ViewCommentsRes.status === 403,
      "Unassigned Employee 3 cannot view comments on another employee's task (403 Forbidden)"
    );

    // Account Status Management: Admin deactivates and reactivates an account
    console.log("\n--- Scenario 11: Account Status (isActive) Management ---");
    const deactivateRes = await fetch(`${BASE_URL}/users/${emp3.user.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ isActive: false }),
    });
    assert(deactivateRes.status === 200, "Admin deactivates user account (200)");

    // Deactivated user fails login
    const deactivatedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "qa@icsr.edu", password: "Password@123" }),
    });
    assert(
      deactivatedLoginRes.status === 403,
      "Deactivated user cannot log in (403 Forbidden)"
    );

    // Reactivate account
    const reactivateRes = await fetch(`${BASE_URL}/users/${emp3.user.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${admin.token}` },
      body: JSON.stringify({ isActive: true }),
    });
    assert(reactivateRes.status === 200, "Admin reactivates user account (200)");

    console.log("\n==================================================================");
    console.log(` RBAC TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error("[Test Error]:", err);
    process.exit(1);
  }
}

runTests();
