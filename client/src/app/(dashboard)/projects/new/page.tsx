"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { User, ProjectStatus } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { FiArrowLeft, FiAlertCircle, FiCheck, FiShield } from "react-icons/fi";

export default function NewProjectPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("Active");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [assignedEmployees, setAssignedEmployees] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== "Admin") {
        router.push("/projects");
        return;
      }

      async function loadUsers() {
        try {
          const data = await apiClient<{ success: boolean; users: User[] }>("/users");
          const allUsers = data.users || [];
          setUsers(allUsers);

          // Find first active PM
          const activePM = allUsers.find(
            (u) => u.role === "Project Manager" && u.isActive !== false
          );
          if (activePM) {
            setProjectManager(activePM.id || activePM._id || "");
          }
        } catch (err: any) {
          if (err.status !== 401) {
            console.error("Failed to load users", err);
          }
        } finally {
          setLoadingUsers(false);
        }
      }
      loadUsers();
    }
  }, [authLoading, user, router]);

  const toggleEmployee = (empId: string) => {
    setAssignedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }
    if (!projectManager) {
      setError("A responsible Project Manager must be assigned");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        status,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        projectManager,
        assignedEmployees,
      };

      const res = await apiClient<{ success: boolean; project: any }>("/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      router.push(`/projects/${res.project._id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  // Only active Project Managers and Employees
  const managers = users.filter(
    (u) => u.role === "Project Manager" && u.isActive !== false
  );
  const employees = users.filter(
    (u) => u.role === "Employee" && u.isActive !== false
  );

  if (!authLoading && user?.role !== "Admin") {
    return (
      <div className="max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center space-y-3">
        <FiShield className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Access Restricted</h2>
        <p className="text-xs text-zinc-500">Only Administrators have permission to initialize new projects.</p>
        <Link href="/projects">
          <Button size="sm" variant="outline">Return to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <FiArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Create New Project"
          description="Initialize a sponsored project, assign a dedicated Project Manager, and select authorized team employees"
        />
        <CardContent>
          {error && (
            <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <FiAlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Project Title"
              required
              placeholder="e.g. ICSR Cloud Architecture & Governance"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Description & Scope
              </label>
              <textarea
                rows={3}
                placeholder="Outline objectives, key deliverables, and client sponsor details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Project Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                options={[
                  { label: "Active", value: "Active" },
                  { label: "Completed", value: "Completed" },
                  { label: "Archived", value: "Archived" },
                ]}
              />

              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                label="Target Deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            {/* Project Manager Selection (Admin only) */}
            <Select
              label="Responsible Project Manager (Required)"
              value={projectManager}
              onChange={(e) => setProjectManager(e.target.value)}
              options={
                managers.length > 0
                  ? managers.map((m, idx) => ({
                      label: `${m.name} (${m.email})`,
                      value: m.id || m._id || `pm-${idx}`,
                    }))
                  : [{ label: "No active Project Managers available", value: "" }]
              }
            />

            {/* Team Members Multi-Select */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Assign Project Employees ({assignedEmployees.length} selected)
                </label>
                <span className="text-[11px] text-zinc-400">
                  Only assigned employees can view their tasks in this project
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                {employees.length === 0 ? (
                  <p className="p-3 text-xs text-zinc-400 col-span-2 text-center">
                    No active employees available to assign.
                  </p>
                ) : (
                  employees.map((emp, idx) => {
                    const empId = emp.id || emp._id || `emp-${idx}`;
                    const isSelected = assignedEmployees.includes(empId);
                    return (
                      <button
                        type="button"
                        key={empId}
                        onClick={() => toggleEmployee(empId)}
                        className={`flex items-center justify-between p-2 rounded-md text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-200"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-transparent text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <div>
                          <p>{emp.name}</p>
                          <p className="text-[10px] text-zinc-400">{emp.email}</p>
                        </div>
                        {isSelected && <FiCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Link href="/projects">
                <Button variant="outline" size="sm" type="button">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" size="sm" isLoading={submitting}>
                Create & Assign Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
