import { Router } from "express";
import { getSettings, updateSettings } from "./settings.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

router.use(authenticate);

// Settings are reserved for Administrators
router.get("/", authorize("Admin"), getSettings);
router.patch("/", authorize("Admin"), updateSettings);

export default router;
