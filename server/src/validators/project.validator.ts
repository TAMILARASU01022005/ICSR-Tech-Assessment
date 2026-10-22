import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters"),
  description: z.string().optional().default(""),
  status: z.enum(["Active", "Completed", "Archived"]).optional().default("Active"),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  projectManager: z.string().min(1, "Project manager is required"),
  assignedEmployees: z.array(z.string()).optional().default([]),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  status: z.enum(["Active", "Completed", "Archived"]).optional(),
  startDate: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  projectManager: z.string().optional(),
  assignedEmployees: z.array(z.string()).optional(),
});
