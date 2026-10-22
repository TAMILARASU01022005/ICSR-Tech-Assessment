import mongoose, { Schema, Document } from "mongoose";

export type ProjectStatus = "Active" | "Completed" | "Archived";

export interface IProject extends Document {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate?: Date;
  deadline?: Date;
  projectManager: mongoose.Types.ObjectId;
  assignedEmployees: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["Active", "Completed", "Archived"],
      default: "Active",
      index: true,
    },
    startDate: { type: Date },
    deadline: { type: Date },
    projectManager: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedEmployees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>("Project", projectSchema);
