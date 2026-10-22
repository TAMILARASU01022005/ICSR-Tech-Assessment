import { Router } from "express";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  assignTask,
  updateTaskStatus,
  deleteTask,
} from "./tasks.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

router.use(authenticate);

router.get("/", getTasks);
router.get("/:id", getTaskById);
router.post("/", authorize("Admin", "Project Manager"), createTask);
router.put("/:id", updateTask);
router.patch("/:id", updateTask);
router.patch("/:id/assign", authorize("Admin", "Project Manager"), assignTask);
router.patch("/:id/status", updateTaskStatus);
router.delete("/:id", authorize("Admin", "Project Manager"), deleteTask);

export default router;
