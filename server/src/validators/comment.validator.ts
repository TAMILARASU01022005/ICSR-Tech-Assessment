import { z } from "zod";

export const createCommentSchema = z.object({
  task: z.string().min(1, "Task ID is required"),
  content: z.string().min(1, "Comment content cannot be empty"),
});
