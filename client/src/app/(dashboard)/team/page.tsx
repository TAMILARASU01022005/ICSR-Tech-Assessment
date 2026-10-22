"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { User, UserRole, Project } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  FiUsers,
  FiSearch,
  FiMail,
  FiCalendar,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiToggleLeft,
  FiToggleRight,
  FiPlus,
  FiUser,
  FiLock,
  FiFolder,
} from "react-icons/fi";

export default function TeamPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Add User / Add Employee Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("Employee");
  const [newProjectId, setNewProjectId] = useState("");
  const [submittingUser, setSubmittingUser] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "Admin";
  const isManager = currentUser?.role === "Project Manager";
  const canAddUser = isAdmin || isManager;

  const fetchUsers = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.append("search", search.trim());
      if (roleFilter) q.append("role", roleFilter);

      const res = await apiClient<{ success: boolean; users: User[] }>(`/users?${q.toString()}`);
      setUsers(res.users || []);
    } catch (err: any) {
      if (err.status !== 401) {
        console.error("Failed to fetch users", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await apiClient<{ success: boolean; projects: Project[] }>("/projects");
      setProjects(res.projects || []);
    } catch (err) {
      console.error("Failed to fetch projects for user assignment", err);
    }
  };

  const openAddModal = () => {
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("Employee");
    setNewProjectId("");
    setModalError(null);
    fetchProjects();
    setIsAddModalOpen(true);
  };

  const handleCreateUser = async () => {
    if (!newName.trim()) {
      setModalError("Please provide a full name.");
      return;
    }
    if (!newEmail.trim()) {
      setModalError("Please provide a valid email address.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setModalError("Password must be at least 6 characters.");
      return;
    }

    setSubmittingUser(true);
    setModalError(null);

    try {
      const res = await apiClient<{ success: boolean; message: string; user: User }>("/users", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          role: isAdmin ? newRole : "Employee",
          projectId: newProjectId || undefined,
        }),
      });

      setIsAddModalOpen(false);
      setMessage({
        text: res.message || `${isAdmin ? newRole : "Employee"} account provisioned successfully.`,
        type: "success",
      });
      setTimeout(() => setMessage(null), 3500);
      fetchUsers();
    } catch (err: any) {
      setModalError(err.message || "Failed to create user account.");
    } finally {
      setSubmittingUser(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchUsers();
    }
  }, [roleFilter, authLoading, currentUser]);

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    if (!isAdmin) {
      alert("Only Administrators can modify user roles.");
      return;
    }

    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    setUpdatingId(targetUserId);
    setMessage(null);

    try {
      await apiClient(`/users/${targetUserId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId || u._id === targetUserId ? { ...u, role: newRole } : u))
      );
      setMessage({ text: "User role successfully updated.", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update role", type: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (targetUserId: string, newStatus: boolean) => {
    if (!isAdmin) {
      alert("Only Administrators can modify account status.");
      return;
    }

    if (!confirm(`Are you sure you want to ${newStatus ? "activate" : "deactivate"} this account?`)) {
      return;
    }

    setUpdatingId(targetUserId);
    setMessage(null);

    try {
      await apiClient(`/users/${targetUserId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus }),
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId || u._id === targetUserId ? { ...u, isActive: newStatus } : u
        )
      );
      setMessage({
        text: `Account successfully ${newStatus ? "activated" : "deactivated"}.`,
        type: "success",
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update account status", type: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {isAdmin ? "Team & Role Governance" : "Project Team & Workload"}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isAdmin
              ? "Registered investigators, engineers, managers, and access boundaries"
              : "Team members and workload distribution across your authorized projects"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
              <FiShield className="w-3.5 h-3.5" />
              <span>Admin Governance Active</span>
            </div>
          )}

          {canAddUser && (
            <Button
              onClick={openAddModal}
              size="sm"
              leftIcon={<FiPlus className="w-3.5 h-3.5" />}
            >
              {isAdmin ? "Add Member" : "Add Employee"}
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
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

      {/* Search and Filters */}
      <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchUsers();
          }}
          className="w-full sm:w-80 flex items-center gap-2"
        >
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<FiSearch className="w-3.5 h-3.5" />}
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm" variant="secondary" className="h-8">
            Filter
          </Button>
        </form>

        <div className="w-full sm:w-48">
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 text-xs"
            options={[
              { label: "All Roles", value: "" },
              { label: "Admin", value: "Admin" },
              { label: "Project Manager", value: "Project Manager" },
              { label: "Employee", value: "Employee" },
            ]}
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={4} />
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<FiUsers className="w-6 h-6 text-zinc-400" />}
              title="No members found"
              description="No user accounts match your active search criteria."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-500 font-semibold">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Current Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Projects</th>
                    <th className="py-3 px-4">Tasks</th>
                    <th className="py-3 px-4">Completion</th>
                    <th className="py-3 px-4">Joined Date</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Role Management</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {users.map((u, idx) => {
                    const userId = u.id || u._id || `user-${idx}`;
                    const isSelf = userId === (currentUser?.id || currentUser?._id);
                    const isActive = u.isActive !== false;

                    return (
                      <tr
                        key={userId}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {u.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                          <div>
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="ml-2 text-[10px] text-zinc-400">(You)</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <FiMail className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{u.email}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <RoleBadge role={u.role} />
                        </td>

                        <td className="py-3.5 px-4">
                          {isAdmin && !isSelf ? (
                            <button
                              type="button"
                              disabled={updatingId === userId}
                              onClick={() => handleStatusChange(userId, !isActive)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-colors ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-rose-50 hover:text-rose-700"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-emerald-50 hover:text-emerald-700"
                              }`}
                              title={isActive ? "Click to deactivate" : "Click to activate"}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isActive ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                              />
                              <span>{isActive ? "Active" : "Inactive"}</span>
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isActive ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                              />
                              <span>{isActive ? "Active" : "Inactive"}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-zinc-700 dark:text-zinc-300">
                          {u.projectsCount ?? 0}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-zinc-700 dark:text-zinc-300">
                          {u.tasksCount ?? 0}
                        </td>

                        <td className="py-3.5 px-4 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${u.progress ?? 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-semibold text-zinc-500">
                              {u.progress ?? 0}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-zinc-500">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Active"}
                        </td>

                        {isAdmin && (
                          <td className="py-3.5 px-4 text-right">
                            <select
                              disabled={updatingId === userId || isSelf}
                              value={u.role}
                              onChange={(e) => handleRoleChange(userId, e.target.value as UserRole)}
                              className="text-xs px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-2xs focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                            >
                              <option value="Employee">Employee</option>
                              <option value="Project Manager">Project Manager</option>
                              <option value="Admin">Admin</option>
                            </select>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Add User / Add Employee Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isAdmin ? "Add Team Member" : "Add Employee"}
        description={
          isAdmin
            ? "Provision a new Employee or Project Manager account for the portal"
            : "Provision a new Employee account and assign them to your projects"
        }
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              disabled={submittingUser}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreateUser}
              isLoading={submittingUser}
            >
              {isAdmin ? "Create Account" : "Add Employee"}
            </Button>
          </>
        }
      >
        {modalError && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <FiAlertCircle className="w-4 h-4 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateUser();
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Full Name*
            </label>
            <Input
              placeholder="e.g. Dr. Rajesh Kumar"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              leftIcon={<FiUser className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Email Address*
            </label>
            <Input
              type="email"
              placeholder="rajesh@icsr.edu"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              leftIcon={<FiMail className="w-4 h-4" />}
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Initial Password* (min 6 characters)
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              leftIcon={<FiLock className="w-4 h-4" />}
            />
          </div>

          {isAdmin ? (
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Account Role*
              </label>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                options={[
                  { label: "Employee (Team Member)", value: "Employee" },
                  { label: "Project Manager", value: "Project Manager" },
                ]}
              />
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Account Role
              </label>
              <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-medium flex items-center justify-between">
                <span>Employee</span>
                <span className="text-[10px] text-zinc-400">Fixed for Project Manager provisioning</span>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Assign to Project (Optional)
            </label>
            <Select
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              options={[
                { label: "-- None (Assign Later) --", value: "" },
                ...projects.map((p) => ({
                  label: `${p.name} (${p.status})`,
                  value: p.id || (p as any)._id,
                })),
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
