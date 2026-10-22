import mongoose, { Schema, Document } from "mongoose";

export interface ISystemSetting extends Document {
  organizationName: string;
  organizationShortName: string;
  contactEmail: string;
  defaultProjectDeadlineDays: number;
  defaultTaskPriority: "Low" | "Medium" | "High" | "Critical";
  emailNotificationsEnabled: boolean;
  dailyAuditDigestEnabled: boolean;
  maintenanceMode: boolean;
  updatedAt: Date;
}

const systemSettingSchema = new Schema<ISystemSetting>(
  {
    organizationName: {
      type: String,
      default: "Centre for Industrial Consultancy and Sponsored Research",
    },
    organizationShortName: {
      type: String,
      default: "ICSR Portal",
    },
    contactEmail: {
      type: String,
      default: "admin@icsr.edu",
    },
    defaultProjectDeadlineDays: {
      type: Number,
      default: 90,
    },
    defaultTaskPriority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    emailNotificationsEnabled: {
      type: Boolean,
      default: true,
    },
    dailyAuditDigestEnabled: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const SystemSetting = mongoose.model<ISystemSetting>("SystemSetting", systemSettingSchema);
