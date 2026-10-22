import { Request, Response, NextFunction } from "express";
import { SystemSetting } from "../../models/SystemSetting.js";
import { logActivity } from "../../models/Activity.js";

export async function getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }

    res.status(200).json({
      success: true,
      settings,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let settings = await SystemSetting.findOne();
    if (!settings) {
      settings = await SystemSetting.create({});
    }

    const {
      organizationName,
      organizationShortName,
      contactEmail,
      defaultProjectDeadlineDays,
      defaultTaskPriority,
      emailNotificationsEnabled,
      dailyAuditDigestEnabled,
      maintenanceMode,
    } = req.body;

    if (organizationName !== undefined) settings.organizationName = organizationName;
    if (organizationShortName !== undefined) settings.organizationShortName = organizationShortName;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (defaultProjectDeadlineDays !== undefined) settings.defaultProjectDeadlineDays = Number(defaultProjectDeadlineDays);
    if (defaultTaskPriority !== undefined) settings.defaultTaskPriority = defaultTaskPriority;
    if (emailNotificationsEnabled !== undefined) settings.emailNotificationsEnabled = Boolean(emailNotificationsEnabled);
    if (dailyAuditDigestEnabled !== undefined) settings.dailyAuditDigestEnabled = Boolean(dailyAuditDigestEnabled);
    if (maintenanceMode !== undefined) settings.maintenanceMode = Boolean(maintenanceMode);

    await settings.save();

    await logActivity(
      req.user!.id,
      "SETTINGS_UPDATED",
      "User",
      `Admin updated system preferences and settings`
    );

    res.status(200).json({
      success: true,
      message: "System settings saved successfully",
      settings,
    });
  } catch (err) {
    next(err);
  }
}
