import { Router } from "express";
import { getComments, addComment } from "./comments.controller.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { createCommentSchema } from "../../validators/comment.validator.js";

const router = Router();

router.use(authenticate);

router.get("/task/:taskId", getComments);
router.post("/", validate(createCommentSchema), addComment);

export default router;
