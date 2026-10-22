import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Comment } from "../models/Comment.js";
import { Activity } from "../models/Activity.js";
import { connectDB } from "../config/database.js";

async function seed() {
  console.log("[Seed] Connecting to database...");
  await connectDB();

  console.log("[Seed] Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Comment.deleteMany({}),
    Activity.deleteMany({}),
  ]);

  console.log("[Seed] Creating users...");
  const admin = await User.create({
    name: "Dr. A. Ramanathan (Admin)",
    email: "admin@icsr.edu",
    password: "Password@123",
    role: "Admin",
    isActive: true,
  });

  const pm1 = await User.create({
    name: "Priya Sharma (PM 1)",
    email: "pm@icsr.edu",
    password: "Password@123",
    role: "Project Manager",
    isActive: true,
  });

  const pm2 = await User.create({
    name: "Dr. Rajesh Varma (PM 2)",
    email: "pm2@icsr.edu",
    password: "Password@123",
    role: "Project Manager",
    isActive: true,
  });

  const emp1 = await User.create({
    name: "Arun Kumar (Dev)",
    email: "dev@icsr.edu",
    password: "Password@123",
    role: "Employee",
    isActive: true,
  });

  const emp2 = await User.create({
    name: "Meera Nair (UI/UX)",
    email: "design@icsr.edu",
    password: "Password@123",
    role: "Employee",
    isActive: true,
  });

  const emp3 = await User.create({
    name: "Kavita Reddy (QA)",
    email: "qa@icsr.edu",
    password: "Password@123",
    role: "Employee",
    isActive: true,
  });

  console.log("[Seed] Creating projects with isolated PM ownership...");
  const project1 = await Project.create({
    name: "ICSR Industrial Research Portal",
    description: "Enterprise system for tracking sponsored consultancy projects, budgets, and milestone deliverables.",
    status: "Active",
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    projectManager: pm1._id,
    assignedEmployees: [emp1._id, emp2._id],
    createdBy: admin._id,
  });

  const project2 = await Project.create({
    name: "Automated Safety Reporting Engine",
    description: "Cloud-based pharmacovigilance and ICSR adverse event intake pipeline with automated E2B XML export.",
    status: "Active",
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    projectManager: pm1._id,
    assignedEmployees: [emp1._id],
    createdBy: admin._id,
  });

  const project3 = await Project.create({
    name: "Clinical Trial Data Management System",
    description: "Secure, audit-trailed platform for multi-center clinical trial electronic data capture (EDC).",
    status: "Active",
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    projectManager: pm2._id,
    assignedEmployees: [emp2._id, emp3._id],
    createdBy: admin._id,
  });

  const project4 = await Project.create({
    name: "Patent & Technology Licensing Tracker",
    description: "Internal tracking repository for intellectual property filing, commercialization agreements, and royalties.",
    status: "Completed",
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    projectManager: pm2._id,
    assignedEmployees: [emp3._id],
    createdBy: admin._id,
  });

  console.log("[Seed] Creating tasks with strict assignment boundaries...");
  // PM1 tasks
  const task1 = await Task.create({
    title: "Implement JWT Session & Cookie Authentication",
    description: "Ensure secure token storage, HttpOnly cookies, and role-based route guards.",
    project: project1._id,
    assignee: emp1._id,
    createdBy: pm1._id,
    priority: "Critical",
    status: "Done",
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });

  const task2 = await Task.create({
    title: "Design Responsive Project Dashboard Shell",
    description: "Build sidebar navigation, stats overview cards, and clean typography using Impeccable guidelines.",
    project: project1._id,
    assignee: emp2._id,
    createdBy: pm1._id,
    priority: "High",
    status: "In Progress",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  });

  const task3 = await Task.create({
    title: "Build Kanban Board Drag-and-Drop Workflow",
    description: "Create interactive Kanban board with 4 columns and instant backend persistence on status drop.",
    project: project1._id,
    assignee: emp1._id,
    createdBy: pm1._id,
    priority: "High",
    status: "To Do",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  });

  const task4 = await Task.create({
    title: "E2B (R3) XML Validation Middleware",
    description: "Write schema validator for clinical safety reports and medical device adverse incident records.",
    project: project2._id,
    assignee: emp1._id,
    createdBy: pm1._id,
    priority: "Medium",
    status: "Review",
    dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
  });

  // PM2 tasks
  const task5 = await Task.create({
    title: "EDC Case Report Form Designer",
    description: "Build dynamic schema renderer for patient intake electronic case report forms.",
    project: project3._id,
    assignee: emp2._id,
    createdBy: pm2._id,
    priority: "High",
    status: "In Progress",
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
  });

  const task6 = await Task.create({
    title: "HIPAA Audit Log Protocol Testing",
    description: "Verify tamper-proof access logging for electronic protected health information (ePHI).",
    project: project3._id,
    assignee: emp3._id,
    createdBy: pm2._id,
    priority: "Critical",
    status: "To Do",
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
  });

  const task7 = await Task.create({
    title: "Royalty Distribution Calculator",
    description: "Automated calculation engine for quarterly technology commercialization payouts.",
    project: project4._id,
    assignee: emp3._id,
    createdBy: pm2._id,
    priority: "Low",
    status: "Done",
    dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  });

  console.log("[Seed] Creating comments...");
  await Comment.create([
    {
      task: task1._id,
      author: pm1._id,
      content: "Great job completing the token refresh logic. Verification passed.",
    },
    {
      task: task2._id,
      author: emp2._id,
      content: "Sidebar collapsed state and mobile drawer are finalized. Working on metrics cards now.",
    },
    {
      task: task5._id,
      author: pm2._id,
      content: "Please ensure field validations match CDISC ODM standards.",
    },
    {
      task: task6._id,
      author: emp3._id,
      content: "Automated test suite is written. Executing integration tests against HIPAA rules.",
    },
  ]);

  console.log("[Seed] Creating activity audit logs...");
  await Activity.create([
    {
      actor: admin._id,
      action: "PROJECT_CREATED",
      relatedResourceType: "Project",
      relatedResourceId: project1._id,
      summary: "Created project 'ICSR Industrial Research Portal'",
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
    {
      actor: admin._id,
      action: "PROJECT_CREATED",
      relatedResourceType: "Project",
      relatedResourceId: project3._id,
      summary: "Created project 'Clinical Trial Data Management System'",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
    {
      actor: pm1._id,
      action: "TASK_CREATED",
      relatedResourceType: "Task",
      relatedResourceId: task1._id,
      summary: "Created task 'Implement JWT Session & Cookie Authentication'",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      actor: emp1._id,
      action: "TASK_STATUS_UPDATED",
      relatedResourceType: "Task",
      relatedResourceId: task1._id,
      summary: "Moved 'Implement JWT Session & Cookie Authentication' to Done",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      actor: pm2._id,
      action: "TASK_CREATED",
      relatedResourceType: "Task",
      relatedResourceId: task5._id,
      summary: "Created task 'EDC Case Report Form Designer'",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log("\n=======================================================");
  console.log(" Database Seed Completed Successfully!");
  console.log(" Seeded Accounts (all passwords: Password@123):");
  console.log("   Admin:             admin@icsr.edu   (Dr. A. Ramanathan)");
  console.log("   PM 1:              pm@icsr.edu      (Priya Sharma)");
  console.log("   PM 2:              pm2@icsr.edu     (Dr. Rajesh Varma)");
  console.log("   Employee (Dev):    dev@icsr.edu     (Arun Kumar)");
  console.log("   Employee (UI/UX):  design@icsr.edu  (Meera Nair)");
  console.log("   Employee (QA):     qa@icsr.edu      (Kavita Reddy)");
  console.log("=======================================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("[Seed Error]:", err);
  process.exit(1);
});
