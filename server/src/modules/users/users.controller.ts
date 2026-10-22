import { Request, Response, NextFunction } from "express";
import { User, UserRole } from "../../models/User.js";
import { Project } from "../../models/Project.js";
import { Task } from "../../models/Task.js";
import { logActivity } from "../../models/Activity.js";

export async function getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userRole = req.user?.role;
    if (userRole === "Employee") {
      res.status(403).json({ success: false, message: "Employees are not authorized to view the team directory." });
      return;
    }

    const { role, search } = req.query;
    const andConditions: any[] = [];

    // PM only sees themselves, employees assigned to their projects, or employees they created
    if (userRole === "Project Manager") {
      const pmProjects = await Project.find({ projectManager: req.user!.id }).select("assignedEmployees");
      const allowedIds = new Set<string>([req.user!.id]);
      pmProjects.forEach((p) => {
        p.assignedEmployees?.forEach((empId) => allowedIds.add(empId.toString()));
      });
      andConditions.push({
        $or: [
          { _id: { $in: Array.from(allowedIds) } },
          { createdBy: req.user!.id },
        ],
      });
    }

    if (role && ["Admin", "Project Manager", "Employee"].includes(role as string)) {
      andConditions.push({ role });
    }

    if (search) {
      andConditions.push({
        $or: [
          { name: { $regex: search as string, $options: "i" } },
          { email: { $regex: search as string, $options: "i" } },
        ],
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const [users, allProjects, allTasks] = await Promise.all([
      User.find(query).select("-password").sort({ createdAt: -1 }),
      Project.find().select("assignedEmployees projectManager"),
      Task.find().select("assignee status"),
    ]);

    const formattedUsers = users.map((u) => {
      const uId = u._id.toString();
      const userProjects = allProjects.filter(
        (p) =>
          p.projectManager?.toString() === uId ||
          p.assignedEmployees?.some((e) => e.toString() === uId)
      );
      const userTasks = allTasks.filter((t) => t.assignee?.toString() === uId);
      const completedTasks = userTasks.filter((t) => t.status === "Done").length;
      const progress = userTasks.length > 0 ? Math.round((completedTasks / userTasks.length) * 100) : 0;

      return {
        id: uId,
        _id: uId,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive ?? true,
        createdAt: u.createdAt,
        projectsCount: userProjects.length,
        tasksCount: userTasks.length,
        completedTasksCount: completedTasks,
        progress,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    if (!["Admin", "Project Manager", "Employee"].includes(role)) {
      res.status(400).json({ success: false, message: "Invalid role specified" });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Safeguard: Prevent demoting the last remaining active Administrator
    if (targetUser.role === "Admin" && role !== "Admin") {
      const adminCount = await User.countDocuments({ role: "Admin", isActive: { $ne: false } });
      if (adminCount <= 1) {
        res.status(400).json({
          success: false,
          message: "Cannot demote the last remaining active Administrator.",
        });
        return;
      }
    }

    const oldRole = targetUser.role;
    targetUser.role = role as UserRole;
    await targetUser.save();

    await logActivity(
      req.user!.id,
      "USER_ROLE_UPDATED",
      "User",
      `Updated ${targetUser.name}'s role from ${oldRole} to ${role}`,
      targetUser._id
    );

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive ?? true,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id as string;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res.status(400).json({ success: false, message: "isActive must be a boolean" });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    // Safeguard: Prevent deactivating the last active Admin
    if (targetUser.role === "Admin" && !isActive) {
      const activeAdminCount = await User.countDocuments({ role: "Admin", isActive: { $ne: false } });
      if (activeAdminCount <= 1) {
        res.status(400).json({
          success: false,
          message: "Cannot deactivate the last remaining active Administrator.",
        });
        return;
      }
    }

    targetUser.isActive = isActive;
    await targetUser.save();

    await logActivity(
      req.user!.id,
      "USER_STATUS_UPDATED",
      "User",
      `Updated ${targetUser.name}'s status to ${isActive ? "Active" : "Inactive"}`,
      targetUser._id
    );

    res.status(200).json({
      success: true,
      message: `User status updated to ${isActive ? "Active" : "Inactive"} successfully`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: targetUser.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const { name, email } = req.body;
    if (name && typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }
    if (email && typeof email === "string" && email.trim() && email.trim().toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.trim().toLowerCase() });
      if (existing) {
        res.status(409).json({ success: false, message: "Email is already registered to another account." });
        return;
      }
      user.email = email.trim().toLowerCase();
    }

    // Explicitly reject/ignore any attempts to change role or isActive via profile
    await user.save();
    await logActivity(user._id, "PROFILE_UPDATED", "User", `${user.name} updated their profile`);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive ?? true,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
      return;
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Current password does not match." });
      return;
    }

    user.password = newPassword;
    await user.save();

    await logActivity(user._id, "PASSWORD_CHANGED", "User", `${user.name} updated their password`);

    res.status(200).json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const creatorRole = req.user?.role;
    if (creatorRole !== "Admin" && creatorRole !== "Project Manager") {
      res.status(403).json({ success: false, message: "Unauthorized to create users." });
      return;
    }

    const { name, email, password, role, projectId } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, message: "Full Name is required." });
      return;
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      res.status(400).json({ success: false, message: "Email is required." });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ success: false, message: "Invalid email address format." });
      return;
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
      return;
    }

    let targetRole: UserRole = "Employee";
    if (creatorRole === "Admin") {
      if (role && !["Admin", "Project Manager", "Employee"].includes(role)) {
        res.status(400).json({ success: false, message: "Invalid role specified." });
        return;
      }
      targetRole = (role as UserRole) || "Employee";
    } else if (creatorRole === "Project Manager") {
      // Project Manager can ONLY create Employee accounts
      if (role && role !== "Employee") {
        res.status(403).json({
          success: false,
          message: "Project Managers are only authorized to create Employee accounts.",
        });
        return;
      }
      targetRole = "Employee";
    }

    // Check email uniqueness
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({ success: false, message: "A user with this email address already exists." });
      return;
    }

    // Validate project assignment if specified
    let projectToAssign: any = null;
    if (projectId) {
      projectToAssign = await Project.findById(projectId);
      if (!projectToAssign) {
        res.status(404).json({ success: false, message: "Selected project not found." });
        return;
      }

      if (creatorRole === "Project Manager" && projectToAssign.projectManager?.toString() !== req.user!.id) {
        res.status(403).json({ success: false, message: "You can only assign employees to projects you manage." });
        return;
      }
    }

    // Create user in DB (User schema pre-save hook handles bcrypt password hashing)
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: targetRole,
      isActive: true,
      createdBy: req.user!.id,
    });

    // If project assignment is requested, attach user to project
    if (projectToAssign) {
      if (targetRole === "Employee") {
        if (!projectToAssign.assignedEmployees.some((e: any) => e.toString() === newUser._id.toString())) {
          projectToAssign.assignedEmployees.push(newUser._id);
          await projectToAssign.save();
        }
      } else if (targetRole === "Project Manager" && creatorRole === "Admin") {
        projectToAssign.projectManager = newUser._id;
        await projectToAssign.save();
      }
    }

    await logActivity(
      req.user!.id,
      "USER_CREATED",
      "User",
      `${req.user!.name} created ${targetRole} account for ${newUser.name} (${newUser.email})${
        projectToAssign ? ` and assigned to ${projectToAssign.name}` : ""
      }`,
      newUser._id
    );

    res.status(201).json({
      success: true,
      message: `${targetRole} created successfully`,
      user: {
        id: newUser._id.toString(),
        _id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
        projectsCount: projectToAssign ? 1 : 0,
        tasksCount: 0,
        completedTasksCount: 0,
        progress: 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

