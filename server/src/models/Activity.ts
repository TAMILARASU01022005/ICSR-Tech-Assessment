import mongoose, { Schema, Document } from "mongoose";

export interface IActivity extends Document {
  actor: mongoose.Types.ObjectId;
  action: string;
  relatedResourceType: "Project" | "Task" | "User" | "Comment";
  relatedResourceId?: mongoose.Types.ObjectId;
  summary: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, index: true },
    relatedResourceType: {
      type: String,
      enum: ["Project", "Task", "User", "Comment"],
      required: true,
    },
    relatedResourceId: { type: Schema.Types.ObjectId },
    summary: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Activity = mongoose.model<IActivity>("Activity", activitySchema);

// Helper to record activity easily
export async function logActivity(
  actorId: string | mongoose.Types.ObjectId,
  action: string,
  resourceType: "Project" | "Task" | "User" | "Comment",
  summary: string,
  resourceId?: string | mongoose.Types.ObjectId
): Promise<void> {
  try {
    await Activity.create({
      actor: actorId,
      action,
      relatedResourceType: resourceType,
      relatedResourceId: resourceId,
      summary,
    });
  } catch (err) {
    console.error("[Activity Log Error]:", err);
  }
}
