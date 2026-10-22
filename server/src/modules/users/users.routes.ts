import { Router } from "express";
import {
  getAllUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  updateProfile,
  changePassword,
} from "./users.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

router.use(authenticate);

router.get("/", authorize("Admin", "Project Manager"), getAllUsers);
router.post("/", authorize("Admin", "Project Manager"), createUser);
router.patch("/profile", updateProfile);
router.post("/change-password", changePassword);
router.patch("/:id/role", authorize("Admin"), updateUserRole);
router.patch("/:id/status", authorize("Admin"), updateUserStatus);

export default router;
