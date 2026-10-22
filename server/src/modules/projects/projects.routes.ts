import { Router } from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  archiveProject,
  restoreProject,
  deleteProject,
} from "./projects.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

router.use(authenticate);

router.get("/", getProjects);
router.get("/:id", getProjectById);
router.post("/", authorize("Admin"), createProject);
router.put("/:id", authorize("Admin", "Project Manager"), updateProject);
router.patch("/:id", authorize("Admin", "Project Manager"), updateProject);
router.patch("/:id/archive", authorize("Admin", "Project Manager"), archiveProject);
router.patch("/:id/restore", authorize("Admin", "Project Manager"), restoreProject);
router.delete("/:id", authorize("Admin"), deleteProject);

export default router;
