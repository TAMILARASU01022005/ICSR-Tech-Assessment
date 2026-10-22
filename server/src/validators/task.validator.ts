import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(2, "Task title must be at least 2 characters"),
  description: z.string().optional().default(""),
  project: z.string().min(1, "Project is required"),
  assignee: z.string().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional().default("Medium"),
  status: z.enum(["To Do", "In Progress", "Review", "Done"]).optional().default("To Do"),
  dueDate: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  project: z.string().optional(),
  assignee: z.string().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
  status: z.enum(["To Do", "In Progress", "Review", "Done"]).optional(),
  dueDate: z.string().optional().nullable(),
});
