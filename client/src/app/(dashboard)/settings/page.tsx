"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import {
  FiSettings,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
  FiMail,
  FiClock,
  FiSliders,
  FiDatabase,
} from "react-icons/fi";

export interface SystemSettingsData {
  organizationName: string;
  organizationShortName: string;
  contactEmail: string;
  defaultProjectDeadlineDays: number;
  defaultTaskPriority: "Low" | "Medium" | "High" | "Critical";
  emailNotificationsEnabled: boolean;
  dailyAuditDigestEnabled: boolean;
  maintenanceMode: boolean;
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState<SystemSettingsData>({
    organizationName: "Centre for Industrial Consultancy and Sponsored Research",
    organizationShortName: "ICSR Portal",
    contactEmail: "admin@icsr.edu",
    defaultProjectDeadlineDays: 90,
    defaultTaskPriority: "Medium",
    emailNotificationsEnabled: true,
    dailyAuditDigestEnabled: true,
    maintenanceMode: false,
  });

  useEffect(() => {
    if (!authLoading && user?.role === "Admin") {
      async function loadSettings() {
        try {
          const res = await apiClient<{ success: boolean; settings: SystemSettingsData }>("/settings");
          if (res.settings) {
            setForm(res.settings);
          }
        } catch (err: any) {
          if (err.status !== 401) {
            console.error("Failed to load settings:", err);
          }
        } finally {
          setLoading(false);
        }
      }
      loadSettings();
    }
  }, [authLoading, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await apiClient<{ success: boolean; message: string; settings: SystemSettingsData }>(
        "/settings",
        {
          method: "PATCH",
          body: JSON.stringify(form),
        }
      );
      if (res.settings) setForm(res.settings);
      setMessage({ text: res.message || "Settings saved successfully.", type: "success" });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== "Admin") {
    return (
      <div className="py-16 text-center">
        <FiShield className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Access Restricted</h2>
        <p className="text-xs text-zinc-500 mt-1">Only Administrators have permission to view system settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            System Settings & Preferences
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Global governance parameters, default project lifecycle defaults, and system notifications
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold">
          <FiShield className="w-3.5 h-3.5" />
          <span>Administrator Access Only</span>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <FiCheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <FiAlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Organization & Identity */}
          <Card>
            <CardHeader
              title="Organization & Identity"
              description="Define organization identification displayed on reports, notifications, and portal header"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Official Organization Name"
                  required
                  value={form.organizationName}
                  onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                  placeholder="e.g. ICSR - IIT Madras"
                />

                <Input
                  label="Portal Short Name / Brand Tag"
                  required
                  value={form.organizationShortName}
                  onChange={(e) => setForm({ ...form, organizationShortName: e.target.value })}
                  placeholder="e.g. ICSR Portal"
                />
              </div>

              <Input
                label="System Administration Contact Email"
                type="email"
                required
                leftIcon={<FiMail className="w-4 h-4" />}
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                placeholder="admin@icsr.edu"
              />
            </CardContent>
          </Card>

          {/* Lifecycle & Default Governance */}
          <Card>
            <CardHeader
              title="Project Lifecycle & Task Defaults"
              description="Standardized timelines and priority baselines for newly initialized projects and deliverables"
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Default Project Deadline Window (Days)"
                  type="number"
                  min="7"
                  max="730"
                  required
                  leftIcon={<FiClock className="w-4 h-4" />}
                  value={form.defaultProjectDeadlineDays.toString()}
                  onChange={(e) =>
                    setForm({ ...form, defaultProjectDeadlineDays: parseInt(e.target.value, 10) || 90 })
                  }
                />

                <Select
                  label="Default Deliverable Priority"
                  value={form.defaultTaskPriority}
                  onChange={(e) =>
                    setForm({ ...form, defaultTaskPriority: e.target.value as any })
                  }
                  options={[
                    { label: "Low", value: "Low" },
                    { label: "Medium", value: "Medium" },
                    { label: "High", value: "High" },
                    { label: "Critical", value: "Critical" },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* System Automation & Alerts */}
          <Card>
            <CardHeader
              title="Automation & System Services"
              description="Toggle automated notifications, audit tracking digests, and operational controls"
            />
            <CardContent className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={form.emailNotificationsEnabled}
                  onChange={(e) => setForm({ ...form, emailNotificationsEnabled: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Automated Assignment Email Alerts
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Dispatch notification events to members when tasks or projects are assigned or status changes.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={form.dailyAuditDigestEnabled}
                  onChange={(e) => setForm({ ...form, dailyAuditDigestEnabled: e.target.checked })}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Daily Governance Audit Digest
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Compile end-of-day audit summaries of project transitions and role adjustments for Administrators.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={form.maintenanceMode}
                  onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Maintenance Mode
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Restrict portal writes to Administrators during system upgrades and database maintenance windows.
                  </span>
                </div>
              </label>
            </CardContent>
          </Card>

          {/* Interface Appearance & Theme Card */}
          <Card>
            <CardHeader
              title="Interface Appearance & Theme"
              description="Customize the visual presentation of the ICSR portal. Default theme is configured as Light Theme."
            />
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Portal Display Theme</h4>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Switch between Light and Dark mode. Light theme is the institutional default for all members.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ThemeSwitcher showLabel />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="submit" isLoading={saving} className="px-6">
              Save Configuration
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
