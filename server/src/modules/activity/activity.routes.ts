import { Router } from "express";
import { getActivity } from "./activity.controller.js";
import { authenticate } from "../../middleware/authenticate.js";

const router = Router();

router.use(authenticate);
router.get("/", getActivity);

export default router;
