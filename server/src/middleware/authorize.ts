import { Request, Response, NextFunction } from "express";
import { UserRole } from "../models/User.js";

export function normalizeRole(role?: string): "Admin" | "Project Manager" | "Employee" | string {
  if (!role) return "";
  const r = role.toLowerCase().trim();
  if (r === "admin") return "Admin";
  if (r === "pm" || r === "project manager" || r === "project_manager") return "Project Manager";
  if (r === "employee") return "Employee";
  return role;
}

export function authorize(...permittedRoles: (UserRole | string)[]) {
  const normalizedPermitted = permittedRoles.map((r) => normalizeRole(r));

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required." });
      return;
    }

    const userRole = normalizeRole(req.user.role);

    if (!normalizedPermitted.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' does not have permission to perform this action.`,
      });
      return;
    }

    next();
  };
}
