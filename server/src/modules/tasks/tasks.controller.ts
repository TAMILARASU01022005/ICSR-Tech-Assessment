import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Task, ITask, TaskStatus, TaskPriority } from "../../models/Task.js";
import { Project } from "../../models/Project.js";
import { User } from "../../models/User.js";
import { Comment } from "../../models/Comment.js";
import { logActivity } from "../../models/Activity.js";
import { normalizeRole } from "../../middleware/authorize.js";

// Helper to normalize status values
export function normalizeStatus(status?: string): TaskStatus | undefined {
  if (!status) return undefined;
  const s = status.toLowerCase().trim();
  if (s === "todo" || s === "to do") return "To Do";
  if (s === "in progress" || s === "inprogress") return "In Progress";
  if (s === "review") return "Review";
  if (s === "done" || s === "completed") return "Done";
  return status as TaskStatus;
}

// Helper to normalize priority values
export function normalizePriority(priority?: string): TaskPriority | undefined {
  if (!priority) return undefined;
  const p = priority.toLowerCase().trim();
  if (p === "low") return "Low";
  if (p === "medium") return "Medium";
  if (p === "high") return "High";
  if (p === "urgent" || p === "critical") return "Critical";
  return priority as TaskPriority;
}

export async function getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const {
      project,
      projectId,
      status,
      priority,
      assignee,
      assignedTo,
      search,
      overdue,
      page = "1",
      limit = "50",
    } = req.query;

    const query: any = {};
    const targetProject = project || projectId;

    if (targetProject) {
      if (!mongoose.Types.ObjectId.isValid(targetProject as string)) {
        res.status(400).json({ success: false, message: "Invalid project ID" });
        return;
      }
      query.project = targetProject;
    }

    const normStatus = normalizeStatus(status as string);
    if (normStatus && ["To Do", "In Progress", "Review", "Done"].includes(normStatus)) {
      query.status = normStatus;
    }

    if (overdue === "true") {
      query.status = { $ne: "Done" };
      query.dueDate = { $lt: new Date() };
    }

    const normPriority = normalizePriority(priority as string);
    if (normPriority && ["Low", "Medium", "High", "Critical"].includes(normPriority)) {
      query.priority = normPriority;
    }

    if (search) {
      query.title = { $regex: search as string, $options: "i" };
    }

    // Role-based visibility scoping
    if (role === "Employee") {
      // Employee sees ONLY tasks where assignedTo matches their authenticated user ID
      query.assignee = user.id;
    } else if (role === "Project Manager") {
      // PM sees tasks belonging to projects assigned to them
      const pmProjects = await Project.find({ projectManager: user.id }).select("_id");
      const pmProjectIds = pmProjects.map((p) => p._id);

      if (targetProject) {
        // If PM specifically queried a project, ensure it's one of their managed projects
        const isManaged = pmProjectIds.some((pId) => pId.toString() === targetProject.toString());
        if (!isManaged) {
          res.status(200).json({ success: true, total: 0, page: 1, totalPages: 0, tasks: [] });
          return;
        }
      } else {
        query.project = { $in: pmProjectIds };
      }

      const targetAssignee = assignee || assignedTo;
      if (targetAssignee) {
        query.assignee = targetAssignee;
      }
    } else if (role === "Admin") {
      const targetAssignee = assignee || assignedTo;
      if (targetAssignee) {
        query.assignee = targetAssignee;
      }
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate("project", "name status projectManager")
        .populate("assignee", "name email role")
        .populate("createdBy", "name email role")
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Task.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      tasks,
    });
  } catch (err) {
    next(err);
  }
}

export async function getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid task ID" });
      return;
    }

    const task = await Task.findById(id)
      .populate("project", "name status projectManager assignedEmployees")
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role");

    if (!task) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }

    const user = req.user!;
    const role = normalizeRole(user.role);

    // Strict Authorization Checks
    if (role === "Admin") {
      // Admin has access to all tasks
    } else if (role === "Project Manager") {
      const pmId = (task.project as any)?.projectManager?.toString();
      if (pmId !== user.id) {
        res.status(403).json({
          success: false,
          message: "Forbidden. You do not have permission to view tasks outside your managed projects.",
        });
        return;
      }
    } else if (role === "Employee") {
      const assigneeId = (task.assignee as any)?._id?.toString() || task.assignee?.toString();
      if (assigneeId !== user.id) {
        res.status(403).json({
          success: false,
          message: "Forbidden. Employees are only permitted to access tasks directly assigned to them.",
        });
        return;
      }
    } else {
      res.status(403).json({ success: false, message: "Forbidden. Access denied." });
      return;
    }

    res.status(200).json({ success: true, task });
  } catch (err) {
    next(err);
  }
}

export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);

    if (role === "Employee") {
      res.status(403).json({ success: false, message: "Forbidden. Employees cannot create tasks." });
      return;
    }

    const {
      title,
      description,
      project,
      projectId,
      assignee,
      assignedTo,
      priority,
      status,
      dueDate,
    } = req.body;

    const targetProjectId = project || projectId;
    if (!targetProjectId || !mongoose.Types.ObjectId.isValid(targetProjectId)) {
      res.status(400).json({ success: false, message: "A valid Project ID is required" });
      return;
    }

    const targetProject = await Project.findById(targetProjectId);
    if (!targetProject) {
      res.status(404).json({ success: false, message: "Associated project not found" });
      return;
    }

    // Role check: PM can only create tasks within their authorized projects
    if (role === "Project Manager") {
      if (targetProject.projectManager.toString() !== user.id) {
        res.status(403).json({
          success: false,
          message: "Forbidden. You can only create tasks for projects assigned to you as Project Manager.",
        });
        return;
      }
    }

    // Validate assignee if provided
    const targetAssigneeId = assignee || assignedTo;
    if (targetAssigneeId) {
      if (!mongoose.Types.ObjectId.isValid(targetAssigneeId)) {
        res.status(400).json({ success: false, message: "Invalid assignee user ID" });
        return;
      }

      const assigneeUser = await User.findById(targetAssigneeId);
      if (!assigneeUser || assigneeUser.isActive === false) {
        res.status(400).json({ success: false, message: "Assignee user not found or is deactivated" });
        return;
      }

      // Check if employee or manager belongs to the project
      const isProjectManager = targetProject.projectManager.toString() === targetAssigneeId;
      const belongsToProject = targetProject.assignedEmployees.some(
        (emp) => emp.toString() === targetAssigneeId
      );

      if (role === "Admin") {
        if (!isProjectManager && !belongsToProject) {
          res.status(400).json({
            success: false,
            message: "Selected user must be this project's manager or an assigned team employee.",
          });
          return;
        }
      } else {
        if (!belongsToProject) {
          res.status(400).json({
            success: false,
            message: "Selected employee does not belong to this project's assigned team members.",
          });
          return;
        }
      }
    }

    const normStatus = normalizeStatus(status) || "To Do";
    const normPriority = normalizePriority(priority) || "Medium";

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      project: targetProjectId,
      assignee: targetAssigneeId || undefined,
      createdBy: user.id,
      priority: normPriority,
      status: normStatus,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    const populated = await Task.findById(task._id)
      .populate("project", "name status projectManager")
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role");

    await logActivity(
      user.id,
      "TASK_CREATED",
      "Task",
      `Created task '${task.title}' in project '${targetProject.name}'`,
      task._id
    );

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      task: populated,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid task ID" });
      return;
    }

    const task = await Task.findById(id).populate<{ project: any }>("project");
    if (!task) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }

    const user = req.user!;
    const role = normalizeRole(user.role);

    const pmId = task.project?.projectManager?._id?.toString() || task.project?.projectManager?.toString();
    const isManagerOrAdmin = role === "Admin" || (role === "Project Manager" && pmId === user.id);
    const assigneeId = (task.assignee as any)?._id?.toString() || task.assignee?.toString();
    const isAssignee = assigneeId === user.id;

    if (!isManagerOrAdmin && !isAssignee) {
      res.status(403).json({
        success: false,
        message: "Forbidden. You are not authorized to update this task.",
      });
      return;
    }

    const {
      title,
      description,
      priority,
      status,
      dueDate,
      assignee,
      assignedTo,
    } = req.body;

    // If Employee: can update ONLY permitted statuses
    if (role === "Employee") {
      if (!isAssignee) {
        res.status(403).json({ success: false, message: "Forbidden. You can only update tasks assigned to you." });
        return;
      }

      if (status !== undefined) {
        const normStatus = normalizeStatus(status);
        if (!normStatus || !["To Do", "In Progress", "Review", "Done"].includes(normStatus)) {
          res.status(400).json({ success: false, message: "Invalid task status value" });
          return;
        }

        const oldStatus = task.status;
        task.status = normStatus;
        await task.save();

        await logActivity(
          user.id,
          "TASK_STATUS_UPDATED",
          "Task",
          `Updated status of '${task.title}' from ${oldStatus} to ${normStatus}`,
          task._id
        );
      }
    } else {
      // Admin or authorized PM: can update details, priority, due date, status, assignee
      if (title !== undefined && typeof title === "string" && title.trim()) {
        task.title = title.trim();
      }
      if (description !== undefined) {
        task.description = typeof description === "string" ? description.trim() : "";
      }
      if (priority !== undefined) {
        const normPriority = normalizePriority(priority);
        if (normPriority) task.priority = normPriority;
      }
      if (status !== undefined) {
        const normStatus = normalizeStatus(status);
        if (normStatus) {
          if (normStatus !== task.status) {
            await logActivity(
              user.id,
              "TASK_STATUS_UPDATED",
              "Task",
              `Updated status of '${task.title}' from ${task.status} to ${normStatus}`,
              task._id
            );
          }
          task.status = normStatus;
        }
      }
      if (dueDate !== undefined) {
        task.dueDate = dueDate ? new Date(dueDate) : undefined;
      }

      const targetAssigneeId = assignee !== undefined ? assignee : assignedTo;
      if (targetAssigneeId !== undefined) {
        if (targetAssigneeId === null || targetAssigneeId === "") {
          task.assignee = undefined;
        } else {
          if (!mongoose.Types.ObjectId.isValid(targetAssigneeId)) {
            res.status(400).json({ success: false, message: "Invalid assignee user ID" });
            return;
          }
          const assigneeUser = await User.findById(targetAssigneeId);
          if (!assigneeUser || assigneeUser.isActive === false) {
            res.status(400).json({ success: false, message: "Assignee user not found or is deactivated" });
            return;
          }

          const project = await Project.findById(task.project);
          if (project) {
            const isProjectManager = project.projectManager.toString() === targetAssigneeId;
            const belongsToProject = project.assignedEmployees.some(
              (emp) => emp.toString() === targetAssigneeId
            );

            if (role === "Admin") {
              if (!isProjectManager && !belongsToProject) {
                res.status(400).json({
                  success: false,
                  message: "Selected user must be this project's manager or an assigned team employee.",
                });
                return;
              }
            } else {
              if (!belongsToProject) {
                res.status(400).json({
                  success: false,
                  message: "Selected employee does not belong to this project's assigned team members.",
                });
                return;
              }
            }
          }
          task.assignee = targetAssigneeId;
        }
      }

      await task.save();
    }

    const populated = await Task.findById(task._id)
      .populate("project", "name status projectManager")
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role");

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      task: populated,
    });
  } catch (err) {
    next(err);
  }
}

// Dedicated endpoint: PATCH /api/tasks/:id/assign
export async function assignTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid task ID" });
      return;
    }

    const task = await Task.findById(id).populate<{ project: any }>("project");
    if (!task) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }

    const user = req.user!;
    const role = normalizeRole(user.role);
    const pmId = task.project?.projectManager?._id?.toString() || task.project?.projectManager?.toString();

    const isAuthorized = role === "Admin" || (role === "Project Manager" && pmId === user.id);
    if (!isAuthorized) {
      res.status(403).json({
        success: false,
        message: "Forbidden. Only Administrators or the project's Project Manager can assign tasks.",
      });
      return;
    }

    const { assignee, assignedTo } = req.body;
    const targetAssigneeId = assignee !== undefined ? assignee : assignedTo;

    if (!targetAssigneeId) {
      task.assignee = undefined;
      await task.save();
      res.status(200).json({ success: true, message: "Task unassigned successfully", task });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(targetAssigneeId)) {
      res.status(400).json({ success: false, message: "Invalid assignee user ID" });
      return;
    }

    const assigneeUser = await User.findById(targetAssigneeId);
    if (!assigneeUser || assigneeUser.isActive === false) {
      res.status(400).json({ success: false, message: "Assignee user not found or account is deactivated" });
      return;
    }

    const project = await Project.findById(task.project);
    if (!project) {
      res.status(404).json({ success: false, message: "Associated project not found" });
      return;
    }

    const isProjectManager = project.projectManager.toString() === targetAssigneeId;
    const belongsToProject = project.assignedEmployees.some(
      (emp) => emp.toString() === targetAssigneeId
    );

    if (role === "Admin") {
      if (!isProjectManager && !belongsToProject) {
        res.status(400).json({
          success: false,
          message: "Selected user must be this project's manager or an assigned team employee.",
        });
        return;
      }
    } else {
      if (normalizeRole(assigneeUser.role) !== "Employee" || !belongsToProject) {
        res.status(400).json({
          success: false,
          message: "Employee must belong to this project's assigned team members.",
        });
        return;
      }
    }

    task.assignee = targetAssigneeId;
    await task.save();

    await logActivity(
      user.id,
      "TASK_ASSIGNED",
      "Task",
      `Assigned task '${task.title}' to ${assigneeUser.name}`,
      task._id
    );

    const populated = await Task.findById(task._id)
      .populate("project", "name status projectManager")
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role");

    res.status(200).json({
      success: true,
      message: `Task successfully assigned to ${assigneeUser.name}`,
      task: populated,
    });
  } catch (err) {
    next(err);
  }
}

// Quick status change endpoint (used by Kanban and task status buttons)
export async function updateTaskStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    const normStatus = normalizeStatus(status);
    if (!normStatus || !["To Do", "In Progress", "Review", "Done"].includes(normStatus)) {
      res.status(400).json({ success: false, message: "Invalid status value" });
      return;
    }

    const task = await Task.findById(id).populate<{ project: any }>("project");
    if (!task) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }

    const user = req.user!;
    const role = normalizeRole(user.role);
    const pmId = task.project?.projectManager?._id?.toString() || task.project?.projectManager?.toString();
    const isManagerOrAdmin = role === "Admin" || (role === "Project Manager" && pmId === user.id);
    const assigneeId = (task.assignee as any)?._id?.toString() || task.assignee?.toString();
    const isAssignee = assigneeId === user.id;

    if (!isManagerOrAdmin && !isAssignee) {
      res.status(403).json({ success: false, message: "Forbidden. Not authorized to update this task status." });
      return;
    }

    const oldStatus = task.status;
    task.status = normStatus;
    await task.save();

    await logActivity(
      user.id,
      "TASK_STATUS_UPDATED",
      "Task",
      `Moved '${task.title}' from ${oldStatus} to ${normStatus}`,
      task._id
    );

    const populated = await Task.findById(task._id)
      .populate("project", "name status projectManager")
      .populate("assignee", "name email role")
      .populate("createdBy", "name email role");

    res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      task: populated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const task = await Task.findById(id).populate<{ project: any }>("project");
    if (!task) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }

    const user = req.user!;
    const role = normalizeRole(user.role);
    const pmId = task.project?.projectManager?._id?.toString() || task.project?.projectManager?.toString();
    const isAuthorized = role === "Admin" || (role === "Project Manager" && pmId === user.id);

    if (!isAuthorized) {
      res.status(403).json({ success: false, message: "Forbidden. Not authorized to delete this task." });
      return;
    }

    await Promise.all([
      Comment.deleteMany({ task: id }),
      Task.findByIdAndDelete(id),
    ]);

    await logActivity(user.id, "TASK_DELETED", "Task", `Deleted task '${task.title}'`);

    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (err) {
    next(err);
  }
}
