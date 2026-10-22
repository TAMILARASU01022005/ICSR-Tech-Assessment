import { Request, Response, NextFunction } from "express";
import { Activity } from "../../models/Activity.js";
import { Project } from "../../models/Project.js";
import { Task } from "../../models/Task.js";
import { normalizeRole } from "../../middleware/authorize.js";

export async function getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user!;
    const role = normalizeRole(user.role);
    const { limit = "30", page = "1", search, action, resourceType, startDate, endDate } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 30;
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};

    // Role-based scoping
    if (role === "Project Manager") {
      const pmProjects = await Project.find({ projectManager: user.id }).select("_id");
      const pIds = pmProjects.map((p) => p._id);
      const pmTasks = await Task.find({ project: { $in: pIds } }).select("_id");
      const tIds = pmTasks.map((t) => t._id);

      query.$or = [
        { actor: user.id },
        { relatedResourceId: { $in: [...pIds, ...tIds] } },
      ];
    } else if (role === "Employee") {
      // Employee sees only activity for tasks assigned to them or actions they performed
      const empTasks = await Task.find({ assignee: user.id }).select("_id");
      const tIds = empTasks.map((t) => t._id);

      query.$or = [
        { actor: user.id },
        { relatedResourceId: { $in: tIds } },
      ];
    }

    if (action) {
      query.action = action;
    }

    if (resourceType) {
      query.relatedResourceType = resourceType;
    }

    if (search) {
      query.summary = { $regex: search as string, $options: "i" };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate("actor", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Activity.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      activities,
    });
  } catch (err) {
    next(err);
  }
}
