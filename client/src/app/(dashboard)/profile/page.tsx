"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RoleBadge } from "@/components/ui/Badge";
import {
  FiUser,
  FiMail,
  FiLock,
  FiCheckCircle,
  FiAlertCircle,
  FiShield,
  FiLogOut,
  FiCalendar,
} from "react-icons/fi";

export default function ProfilePage() {
  const { user, login, logout } = useAuth();

  // Profile Form state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Sync profile fields when user loads
  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    setProfileMsg(null);

    try {
      const res = await apiClient<{ success: boolean; message: string; user: any }>("/users/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });

      setProfileMsg({ text: res.message || "Profile updated successfully.", type: "success" });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileMsg({ text: err.message || "Failed to update profile.", type: "error" });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "New passwords do not match.", type: "error" });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ text: "Password must be at least 6 characters long.", type: "error" });
      return;
    }

    setUpdatingPassword(true);

    try {
      const res = await apiClient<{ success: boolean; message: string }>("/users/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      setPasswordMsg({ text: res.message || "Password changed successfully.", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMsg(null), 4000);
    } catch (err: any) {
      setPasswordMsg({ text: err.message || "Failed to change password.", type: "error" });
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Account Profile & Security
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage your personal profile information, security credentials, and session access
          </p>
        </div>

        {user?.role && <RoleBadge role={user.role} />}
      </div>

      {/* Account Overview Card */}
      <Card>
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>{user?.name}</span>
              </h2>
              <p className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                <FiMail className="w-3.5 h-3.5 text-zinc-400" />
                <span>{user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100 dark:border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="text-rose-600 hover:text-rose-700 border-rose-200 hover:border-rose-300 dark:border-rose-900/60"
            >
              <FiLogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details Form */}
      <Card>
        <CardHeader
          title="Personal Information"
          description="Update your contact details and display identity across task discussions and project boards"
        />
        <CardContent>
          {profileMsg && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                profileMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
              }`}
            >
              {profileMsg.type === "success" ? (
                <FiCheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <FiAlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<FiUser className="w-4 h-4" />}
                placeholder="Your full name"
              />

              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<FiMail className="w-4 h-4" />}
                placeholder="you@icsr.edu"
              />
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-xs text-zinc-500 border border-zinc-200/70 dark:border-zinc-800 flex items-start gap-2">
              <FiShield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Account Role Policy:{" "}
                </span>
                <span>
                  Your active permission role is <strong>{user?.role}</strong>. System security policies prohibit self-escalating or changing roles from the profile interface. Role changes require administrator governance.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" isLoading={updatingProfile}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Change Form */}
      <Card>
        <CardHeader
          title="Security & Password"
          description="Update your account password to maintain system security"
        />
        <CardContent>
          {passwordMsg && (
            <div
              className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                passwordMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
              }`}
            >
              {passwordMsg.type === "success" ? (
                <FiCheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <FiAlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              leftIcon={<FiLock className="w-4 h-4" />}
              placeholder="••••••••"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="New Password (min 6 chars)"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<FiLock className="w-4 h-4" />}
                placeholder="••••••••"
              />

              <Input
                label="Confirm New Password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<FiLock className="w-4 h-4" />}
                placeholder="••••••••"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" variant="secondary" isLoading={updatingPassword}>
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
