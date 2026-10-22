import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Comment } from "../../models/Comment.js";
import { Task } from "../../models/Task.js";
import { logActivity } from "../../models/Activity.js";
import { normalizeRole } from "../../middleware/authorize.js";

async function verifyTaskAccess(user: NonNullable<Request["user"]>, taskId: string): Promise<{ authorized: boolean; task?: any }> {
  const task = await Task.findById(taskId).populate<{ project: any }>("project");
  if (!task) return { authorized: false };

  const role = normalizeRole(user.role);
  if (role === "Admin") return { authorized: true, task };

  if (role === "Project Manager") {
    const pmId = task.project?.projectManager?._id?.toString() || task.project?.projectManager?.toString();
    return { authorized: pmId === user.id, task };
  }

  if (role === "Employee") {
    const assigneeId = (task.assignee as any)?._id?.toString() || task.assignee?.toString();
    return { authorized: assigneeId === user.id, task };
  }

  return { authorized: false };
}

export async function getComments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const taskId = req.params.taskId as string;
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      res.status(400).json({ success: false, message: "Invalid task ID" });
      return;
    }

    const { authorized, task } = await verifyTaskAccess(req.user!, taskId);
    if (!task) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }
    if (!authorized) {
      res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission to access comments for this task.",
      });
      return;
    }

    const comments = await Comment.find({ task: taskId })
      .populate("author", "name email role")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: comments.length, comments });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { task: taskId, taskId: taskIdAlt, content } = req.body;
    const targetTaskId = taskId || taskIdAlt;

    if (!targetTaskId || !mongoose.Types.ObjectId.isValid(targetTaskId)) {
      res.status(400).json({ success: false, message: "A valid task ID is required" });
      return;
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      res.status(400).json({ success: false, message: "Comment content cannot be empty" });
      return;
    }

    const { authorized, task } = await verifyTaskAccess(req.user!, targetTaskId);
    if (!task) {
      res.status(404).json({ success: false, message: "Task not found" });
      return;
    }
    if (!authorized) {
      res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission to add comments to this task.",
      });
      return;
    }

    const comment = await Comment.create({
      task: targetTaskId,
      author: req.user!.id,
      content: content.trim(),
    });

    const populated = await Comment.findById(comment._id).populate("author", "name email role");

    await logActivity(
      req.user!.id,
      "COMMENT_ADDED",
      "Comment",
      `Commented on task '${task.title}'`,
      task._id
    );

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: populated,
    });
  } catch (err) {
    next(err);
  }
}
