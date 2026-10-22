import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Project, IProject } from "../../models/Project.js";
import { Task } from "../../models/Task.js";
import { Comment } from "../../models/Comment.js";
import { User } from "../../models/User.js";
import { logActivity } from "../../models/Activity.js";
import { normalizeRole } from "../../middleware/authorize.js";

// Helper to check user access to a project
export async function canAccessProject(user: NonNullable<Request["user"]>, project: any): Promise<boolean> {
  const role = normalizeRole(user.role);
  if (role === "Admin") return true;

  const pmId = project.projectManager?._id?.toString() || project.projectManager?.toString();

  if (role === "Project Manager") {
    return pmId === user.id;
  }

  // Employee can only access if they have at least one task assigned in this project
  const taskCount = await Task.countDocuments({ project: project._id, assignee: user.id });
  return taskCount > 0;
}

export async function getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const { status, search, page = "1", limit = "20" } = req.query;

    const query: any = {};

    // Role-based scoping
    if (role === "Project Manager") {
      query.projectManager = user.id;
    } else if (role === "Employee") {
      // Employee gets projects associated with their assigned tasks
      const assignedTasks = await Task.find({ assignee: user.id }).select("project");
      const assignedProjectIds = [...new Set(assignedTasks.map((t) => t.project.toString()))];
      query._id = { $in: assignedProjectIds };
    }

    if (status && ["Active", "Completed", "Archived"].includes(status as string)) {
      query.status = status;
    }

    if (search) {
      query.name = { $regex: search as string, $options: "i" };
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate("projectManager", "name email role isActive")
        .populate("assignedEmployees", "name email role isActive")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Project.countDocuments(query),
    ]);

    // Attach task metrics to each project based on role scope
    const projectIds = projects.map((p) => p._id);
    const taskQuery: any = { project: { $in: projectIds } };
    if (role === "Employee") {
      taskQuery.assignee = user.id; // Strictly scoped to employee's assigned tasks
    }
    const tasks = await Task.find(taskQuery).select("project status");

    const enriched = projects.map((p) => {
      const pTasks = tasks.filter((t) => t.project.toString() === p._id.toString());
      const totalTasks = pTasks.length;
      const completedTasks = pTasks.filter((t) => t.status === "Done").length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      return {
        ...p,
        totalTasks,
        completedTasks,
        progress,
      };
    });

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      projects: enriched,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid project ID" });
      return;
    }

    const project = await Project.findById(id)
      .populate("projectManager", "name email role isActive")
      .populate("assignedEmployees", "name email role isActive")
      .populate("createdBy", "name email role");

    if (!project) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    const hasAccess = await canAccessProject(req.user!, project);
    if (!hasAccess) {
      res.status(403).json({ success: false, message: "Forbidden. You do not have permission to view this project." });
      return;
    }

    const role = normalizeRole(req.user!.role);

    // Filter tasks based on role: Employee sees only their own assigned tasks
    const taskQuery: any = { project: project._id };
    if (role === "Employee") {
      taskQuery.assignee = req.user!.id;
    }

    const tasks = await Task.find(taskQuery)
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "Done").length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.status(200).json({
      success: true,
      project: {
        ...project.toObject(),
        totalTasks,
        completedTasks,
        progress,
        tasks,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = normalizeRole(req.user!.role);
    if (role !== "Admin") {
      res.status(403).json({ success: false, message: "Forbidden. Only Administrators can create projects." });
      return;
    }

    const {
      name,
      description,
      status,
      startDate,
      deadline,
      dueDate,
      projectManager,
      managerId,
      assignedEmployees,
      employeeIds,
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, message: "Project name is required" });
      return;
    }

    // Support both projectManager and managerId
    const targetPmId = projectManager || managerId;
    if (!targetPmId || !mongoose.Types.ObjectId.isValid(targetPmId)) {
      res.status(400).json({ success: false, message: "A valid Project Manager ID is required" });
      return;
    }

    // Validate PM account exists, is active, and has Project Manager role
    const pmUser = await User.findById(targetPmId);
    if (!pmUser) {
      res.status(400).json({ success: false, message: "Project Manager user not found" });
      return;
    }
    if (pmUser.isActive === false) {
      res.status(400).json({ success: false, message: "Selected Project Manager account is deactivated" });
      return;
    }
    if (normalizeRole(pmUser.role) !== "Project Manager") {
      res.status(400).json({
        success: false,
        message: "Selected user does not have the 'Project Manager' role",
      });
      return;
    }

    // Support both assignedEmployees and employeeIds
    const targetEmployees = assignedEmployees || employeeIds || [];
    if (!Array.isArray(targetEmployees)) {
      res.status(400).json({ success: false, message: "assignedEmployees must be an array of user IDs" });
      return;
    }

    // Validate all employees exist, are active, and have Employee role
    for (const empId of targetEmployees) {
      if (!mongoose.Types.ObjectId.isValid(empId)) {
        res.status(400).json({ success: false, message: `Invalid employee ID: ${empId}` });
        return;
      }
      const empUser = await User.findById(empId);
      if (!empUser) {
        res.status(400).json({ success: false, message: `Employee user with ID ${empId} not found` });
        return;
      }
      if (empUser.isActive === false) {
        res.status(400).json({ success: false, message: `Employee ${empUser.name} is deactivated` });
        return;
      }
      if (normalizeRole(empUser.role) !== "Employee") {
        res.status(400).json({
          success: false,
          message: `User ${empUser.name} does not have the 'Employee' role`,
        });
        return;
      }
    }

    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      status: status || "Active",
      startDate: startDate ? new Date(startDate) : undefined,
      deadline: deadline ? new Date(deadline) : dueDate ? new Date(dueDate) : undefined,
      projectManager: targetPmId,
      assignedEmployees: targetEmployees,
      createdBy: req.user!.id,
    });

    const populated = await Project.findById(project._id)
      .populate("projectManager", "name email role isActive")
      .populate("assignedEmployees", "name email role isActive");

    await logActivity(req.user!.id, "PROJECT_CREATED", "Project", `Created project '${project.name}'`, project._id);

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project: populated,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid project ID" });
      return;
    }

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    const role = normalizeRole(req.user!.role);
    const pmId = project.projectManager?.toString();
    const isAuthorized = role === "Admin" || (role === "Project Manager" && pmId === req.user!.id);

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: "Forbidden. Not authorized to update this project." });
      return;
    }

    const {
      name,
      description,
      status,
      startDate,
      deadline,
      dueDate,
      projectManager,
      managerId,
      assignedEmployees,
      employeeIds,
    } = req.body;

    if (name !== undefined) project.name = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (status !== undefined) project.status = status;
    if (startDate !== undefined) project.startDate = startDate ? new Date(startDate) : undefined;
    if (deadline !== undefined || dueDate !== undefined) {
      const d = deadline ?? dueDate;
      project.deadline = d ? new Date(d) : undefined;
    }

    // Field-level restrictions: Only Admin can reassign Project Manager or change assigned employees
    const targetPmId = projectManager ?? managerId;
    if (targetPmId !== undefined) {
      if (role !== "Admin") {
        res.status(403).json({ success: false, message: "Only Administrators can change project manager" });
        return;
      }
      if (!mongoose.Types.ObjectId.isValid(targetPmId)) {
        res.status(400).json({ success: false, message: "Invalid projectManager ID" });
        return;
      }
      const pmUser = await User.findById(targetPmId);
      if (!pmUser || pmUser.isActive === false || normalizeRole(pmUser.role) !== "Project Manager") {
        res.status(400).json({
          success: false,
          message: "Selected Project Manager must be an active user with the Project Manager role",
        });
        return;
      }
      project.projectManager = targetPmId;
    }

    const targetEmployees = assignedEmployees ?? employeeIds;
    if (targetEmployees !== undefined) {
      if (role !== "Admin") {
        res.status(403).json({ success: false, message: "Only Administrators can assign project employees" });
        return;
      }
      if (!Array.isArray(targetEmployees)) {
        res.status(400).json({ success: false, message: "assignedEmployees must be an array of user IDs" });
        return;
      }
      for (const empId of targetEmployees) {
        if (!mongoose.Types.ObjectId.isValid(empId)) {
          res.status(400).json({ success: false, message: `Invalid employee ID: ${empId}` });
          return;
        }
        const empUser = await User.findById(empId);
        if (!empUser || empUser.isActive === false || normalizeRole(empUser.role) !== "Employee") {
          res.status(400).json({
            success: false,
            message: `All assigned employees must be active users with the Employee role`,
          });
          return;
        }
      }
      project.assignedEmployees = targetEmployees;
    }

    await project.save();

    const populated = await Project.findById(project._id)
      .populate("projectManager", "name email role isActive")
      .populate("assignedEmployees", "name email role isActive");

    await logActivity(req.user!.id, "PROJECT_UPDATED", "Project", `Updated project '${project.name}'`, project._id);

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      project: populated,
    });
  } catch (err) {
    next(err);
  }
}

export async function archiveProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    const role = normalizeRole(req.user!.role);
    const pmId = project.projectManager?.toString();
    const isAuthorized = role === "Admin" || (role === "Project Manager" && pmId === req.user!.id);

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: "Forbidden. Not authorized to archive this project." });
      return;
    }

    project.status = "Archived";
    await project.save();

    await logActivity(req.user!.id, "PROJECT_ARCHIVED", "Project", `Archived project '${project.name}'`, project._id);

    res.status(200).json({ success: true, message: "Project archived successfully", project });
  } catch (err) {
    next(err);
  }
}

export async function restoreProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    const role = normalizeRole(req.user!.role);
    const pmId = project.projectManager?.toString();
    const isAuthorized = role === "Admin" || (role === "Project Manager" && pmId === req.user!.id);

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: "Forbidden. Not authorized to restore this project." });
      return;
    }

    project.status = "Active";
    await project.save();

    await logActivity(req.user!.id, "PROJECT_RESTORED", "Project", `Restored project '${project.name}' to Active`, project._id);

    res.status(200).json({ success: true, message: "Project restored successfully", project });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = normalizeRole(req.user!.role);
    if (role !== "Admin") {
      res.status(403).json({ success: false, message: "Forbidden. Only Administrators can delete projects." });
      return;
    }

    const id = req.params.id as string;
    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({ success: false, message: "Project not found" });
      return;
    }

    // Safely delete all project tasks and their comments
    const tasks = await Task.find({ project: id }).select("_id");
    const taskIds = tasks.map((t) => t._id);

    await Promise.all([
      Comment.deleteMany({ task: { $in: taskIds } }),
      Task.deleteMany({ project: id }),
      Project.findByIdAndDelete(id),
    ]);

    await logActivity(req.user!.id, "PROJECT_DELETED", "Project", `Deleted project '${project.name}' and all associated tasks`);

    res.status(200).json({ success: true, message: "Project and associated tasks deleted successfully" });
  } catch (err) {
    next(err);
  }
}
