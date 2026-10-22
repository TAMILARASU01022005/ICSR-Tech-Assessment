import { Router, Request, Response } from "express";
import { register, login, logout, getMe } from "./auth.controller.js";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import { registerSchema, loginSchema } from "../../validators/auth.validator.js";

const router = Router();

// Public self-registration is disabled. User accounts are provisioned via Admin/Manager portals.
router.post("/register", (_req: Request, res: Response) => {
  res.status(403).json({
    success: false,
    message: "Public registration is disabled. User accounts must be created by an Administrator or Project Manager.",
  });
});
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

export default router;
