import { Request, Response, NextFunction } from "express";
import { Project } from "../../models/Project.js";
import { Task } from "../../models/Task.js";
import { Activity } from "../../models/Activity.js";
import { User } from "../../models/User.js";
import { normalizeRole } from "../../middleware/authorize.js";

export async function getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const projectQuery: any = {};
    const taskQuery: any = {};

    let scopedProjectIds: any[] = [];
    let scopedTaskIds: any[] = [];

    if (role === "Project Manager") {
      projectQuery.projectManager = user.id;
      const pmProjects = await Project.find(projectQuery).select("_id");
      scopedProjectIds = pmProjects.map((p) => p._id);

      taskQuery.project = { $in: scopedProjectIds };
      const pmTasks = await Task.find(taskQuery).select("_id");
      scopedTaskIds = pmTasks.map((t) => t._id);
    } else if (role === "Employee") {
      // Employee: strictly their assigned tasks and projects containing their assigned tasks
      taskQuery.assignee = user.id;
      const empTasks = await Task.find({ assignee: user.id }).select("_id project");
      scopedTaskIds = empTasks.map((t) => t._id);

      const assignedProjectIds = [...new Set(empTasks.map((t) => t.project?.toString()).filter(Boolean))];
      projectQuery._id = { $in: assignedProjectIds };
      scopedProjectIds = assignedProjectIds;
    }

    const now = new Date();

    const activityFilter: any =
      role === "Admin"
        ? {}
        : role === "Project Manager"
        ? {
            $or: [
              { actor: user.id },
              { relatedResourceId: { $in: [...scopedProjectIds, ...scopedTaskIds] } },
            ],
          }
        : {
            $or: [
              { actor: user.id },
              { relatedResourceId: { $in: scopedTaskIds } },
            ],
          };

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      archivedProjects,
      totalTeamMembers,
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      reviewTasks,
      overdueTasks,
      tasksForCharts,
      recentActivity,
      upcomingDeadlines,
    ] = await Promise.all([
      Project.countDocuments(projectQuery),
      Project.countDocuments({ ...projectQuery, status: "Active" }),
      Project.countDocuments({ ...projectQuery, status: "Completed" }),
      Project.countDocuments({ ...projectQuery, status: "Archived" }),
      role === "Admin"
        ? User.countDocuments()
        : role === "Project Manager"
        ? Project.find(projectQuery)
            .distinct("assignedEmployees")
            .then((emps) => emps.length + 1)
        : 1, // Employee only monitors themselves
      Task.countDocuments(taskQuery),
      Task.countDocuments({ ...taskQuery, status: "Done" }),
      Task.countDocuments({ ...taskQuery, status: "In Progress" }),
      Task.countDocuments({ ...taskQuery, status: "To Do" }),
      Task.countDocuments({ ...taskQuery, status: "Review" }),
      Task.countDocuments({
        ...taskQuery,
        status: { $ne: "Done" },
        dueDate: { $lt: now },
      }),
      Task.find(taskQuery).select("status priority dueDate"),
      Activity.find(activityFilter)
        .populate("actor", "name email role")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      Task.find({
        ...taskQuery,
        status: { $ne: "Done" },
        dueDate: { $gte: now },
      })
        .populate("project", "name")
        .populate("assignee", "name email")
        .sort({ dueDate: 1 })
        .limit(5)
        .lean(),
    ]);

    // Status distribution
    const statusData = [
      { name: "To Do", count: todoTasks, color: "#64748b" },
      { name: "In Progress", count: inProgressTasks, color: "#3b82f6" },
      { name: "Review", count: reviewTasks, color: "#eab308" },
      { name: "Done", count: completedTasks, color: "#10b981" },
    ];

    // Priority distribution
    const priorityCounts: Record<string, number> = {
      Low: 0,
      Medium: 0,
      High: 0,
      Critical: 0,
    };
    tasksForCharts.forEach((t) => {
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority]++;
      }
    });

    const priorityData = [
      { priority: "Low", count: priorityCounts["Low"], color: "#94a3b8" },
      { priority: "Medium", count: priorityCounts["Medium"], color: "#38bdf8" },
      { priority: "High", count: priorityCounts["High"], color: "#f97316" },
      { priority: "Critical", count: priorityCounts["Critical"], color: "#ef4444" },
    ];

    res.status(200).json({
      success: true,
      stats: {
        totalProjects,
        activeProjects,
        completedProjects,
        archivedProjects,
        totalTeamMembers,
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        reviewTasks,
        pendingTasks: todoTasks + inProgressTasks + reviewTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      charts: {
        statusData,
        priorityData,
      },
      recentActivity,
      upcomingDeadlines,
    });
  } catch (err) {
    next(err);
  }
}
