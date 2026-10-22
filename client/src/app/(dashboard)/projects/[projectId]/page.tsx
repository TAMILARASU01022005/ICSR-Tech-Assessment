"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Project, Task, TaskPriority, TaskStatus, User } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { StatusBadge, PriorityBadge, RoleBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  FiArrowLeft,
  FiCalendar,
  FiUser,
  FiUsers,
  FiPlus,
  FiArchive,
  FiTrash2,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiEdit3,
  FiRotateCw,
  FiColumns,
} from "react-icons/fi";

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("Medium");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Add Employee Modal State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeeSuccess, setEmployeeSuccess] = useState<string | null>(null);

  const currentUserId = user?.id || (user as any)?._id;
  const pmId = project?.projectManager?.id || (project?.projectManager as any)?._id;
  const isManagerOrAdmin =
    user?.role === "Admin" ||
    (user?.role === "Project Manager" && Boolean(pmId) && String(pmId) === String(currentUserId));

  const openTaskModal = () => {
    setTaskError(null);
    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskPriority("Medium");
    if (user?.role === "Admin" && project?.projectManager) {
      setTaskAssignee(project.projectManager.id || (project.projectManager as any)._id || "");
    } else {
      setTaskAssignee("");
    }
    setIsTaskModalOpen(true);
  };

  const openAddEmployeeModal = () => {
    setEmpName("");
    setEmpEmail("");
    setEmpPassword("");
    setEmployeeError(null);
    setIsEmployeeModalOpen(true);
  };

  const handleCreateEmployee = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!empName.trim()) {
      setEmployeeError("Please provide the employee's full name.");
      return;
    }
    if (!empEmail.trim()) {
      setEmployeeError("Please provide an email address.");
      return;
    }
    if (!empPassword || empPassword.length < 6) {
      setEmployeeError("Password must be at least 6 characters.");
      return;
    }

    setAddingEmployee(true);
    setEmployeeError(null);

    try {
      const res = await apiClient<{ success: boolean; message: string; user: User }>("/users", {
        method: "POST",
        body: JSON.stringify({
          name: empName.trim(),
          email: empEmail.trim().toLowerCase(),
          password: empPassword,
          role: "Employee",
          projectId,
        }),
      });

      setIsEmployeeModalOpen(false);
      setEmployeeSuccess(`Employee ${res.user.name} provisioned and assigned to this project.`);
      setTimeout(() => setEmployeeSuccess(null), 4000);
      fetchProject();
    } catch (err: any) {
      setEmployeeError(err.message || "Failed to create employee.");
    } finally {
      setAddingEmployee(false);
    }
  };

  const fetchProject = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiClient<{ success: boolean; project: Project }>(`/projects/${projectId}`);
      setProject(data.project);
    } catch (err: any) {
      if (err.status !== 401) {
        setError(err.message || "Failed to load project details");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchProject();
    }
  }, [projectId, authLoading, user]);

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this project?")) return;
    try {
      await apiClient(`/projects/${projectId}/archive`, { method: "PATCH" });
      fetchProject();
    } catch (err: any) {
      alert("Failed to archive: " + err.message);
    }
  };

  const handleRestore = async () => {
    if (!confirm("Are you sure you want to restore this project?")) return;
    try {
      await apiClient(`/projects/${projectId}/restore`, { method: "PATCH" });
      fetchProject();
    } catch (err: any) {
      alert("Failed to restore: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Permanent Deletion: Are you sure you want to delete this project and all its tasks?")) return;
    try {
      await apiClient(`/projects/${projectId}`, { method: "DELETE" });
      router.push("/projects");
    } catch (err: any) {
      alert("Failed to delete project: " + err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setTaskError("Task title is required");
      return;
    }

    setCreatingTask(true);
    setTaskError(null);

    try {
      await apiClient("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          project: projectId,
          assignee: taskAssignee || undefined,
          priority: taskPriority,
          status: "To Do",
          dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
        }),
      });

      setIsTaskModalOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskDueDate("");
      fetchProject();
    } catch (err: any) {
      setTaskError(err.message || "Failed to create task");
    } finally {
      setCreatingTask(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl my-6">
        <FiAlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Project Not Found</h3>
        <p className="text-xs text-zinc-500 mt-1 mb-4">{error || "The requested project could not be loaded."}</p>
        <Link href="/projects">
          <Button size="sm">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  // Eligible assignees:
  // If admin: show only project manager
  // If PM: show only assigned employees
  const isAdmin = user?.role === "Admin";
  const eligibleAssignees = isAdmin
    ? (project.projectManager ? [project.projectManager] : [])
    : (project.assignedEmployees || []).filter(Boolean);

  return (
    <div className="space-y-6">
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

      {/* Notifications */}
      {employeeSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <FiCheckCircle className="w-4 h-4 shrink-0" />
          <span>{employeeSuccess}</span>
        </div>
      )}

      {/* Project Overview Hero Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-3">
                <StatusBadge status={project.status} />
                <span className="text-xs text-zinc-400 font-medium">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {project.name}
              </h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {project.description || "No project description provided."}
              </p>
            </div>

            {/* Project Controls */}
            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/board?project=${projectId}`}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FiColumns className="w-3.5 h-3.5 text-zinc-500" />}
                >
                  Kanban Board
                </Button>
              </Link>
              {isManagerOrAdmin && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openAddEmployeeModal}
                    leftIcon={<FiPlus className="w-3.5 h-3.5 text-zinc-500" />}
                  >
                    Add Employee
                  </Button>
                  {project.status !== "Archived" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleArchive}
                      leftIcon={<FiArchive className="w-3.5 h-3.5 text-zinc-500" />}
                    >
                      Archive
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestore}
                      leftIcon={<FiRotateCw className="w-3.5 h-3.5 text-zinc-500" />}
                    >
                      Restore
                    </Button>
                  )}
                  {user?.role === "Admin" && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDelete}
                      leftIcon={<FiTrash2 className="w-3.5 h-3.5" />}
                    >
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Details Row */}
          <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-zinc-400 font-medium">Project Manager</p>
              <div className="flex items-center gap-2 mt-1">
                <FiUser className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {project.projectManager?.name || "Unassigned"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-zinc-400 font-medium">Timeline & Deadline</p>
              <div className="flex items-center gap-2 mt-1">
                <FiCalendar className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="text-zinc-800 dark:text-zinc-200">
                  {project.deadline ? new Date(project.deadline).toLocaleDateString() : "Open-ended"}
                </span>
              </div>
            </div>

            <div>
              <p className="text-zinc-400 font-medium">Team Roster</p>
              <div className="flex items-center gap-1.5 mt-1">
                <FiUsers className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="text-zinc-800 dark:text-zinc-200">
                  {project.assignedEmployees?.length ?? 0} members assigned
                </span>
              </div>
            </div>

            <div>
              <p className="text-zinc-400 font-medium">Progress ({project.progress ?? 0}%)</p>
              <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Tasks Section */}
      <Card>
        <CardHeader
          title={`Project Tasks (${project.tasks?.length ?? 0})`}
          description="Deliverables and milestones allocated to team members"
          action={
            isManagerOrAdmin && (
              <Button
                size="sm"
                onClick={openTaskModal}
                leftIcon={<FiPlus className="w-3.5 h-3.5" />}
              >
                Add Task
              </Button>
            )
          }
        />
        <CardContent className="p-0">
          {!project.tasks || project.tasks.length === 0 ? (
            <EmptyState
              icon={<FiCheckCircle className="w-6 h-6 text-zinc-400" />}
              title="No tasks in this project"
              description="Start organizing work by breaking down this project into trackable tasks."
              actionText={isManagerOrAdmin ? "Add First Task" : undefined}
              onAction={isManagerOrAdmin ? openTaskModal : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 text-zinc-500 font-semibold">
                    <th className="py-3 px-4">Task</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {project.tasks.map((task, idx) => (
                    <tr key={task._id || task.id || `ptask-${idx}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {task.title}
                        {task.description && (
                          <p className="text-[11px] text-zinc-400 font-normal line-clamp-1">{task.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                        {task.assignee?.name || "Unassigned"}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Task to Project"
        description={`Allocate a new task for ${project.name}`}
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          {taskError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 shrink-0" />
              <span>{taskError}</span>
            </div>
          )}

          <Input
            label="Task Title"
            required
            placeholder="e.g. Conduct compliance security review"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea
              rows={3}
              placeholder="Provide context and definition of done..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
              options={[
                { label: "Low", value: "Low" },
                { label: "Medium", value: "Medium" },
                { label: "High", value: "High" },
                { label: "Critical", value: "Critical" },
              ]}
            />

            <Input
              label="Due Date"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </div>

          <Select
            label={isAdmin ? "Assignee (Project Manager)" : "Assignee (Assigned Project Employees)"}
            value={taskAssignee}
            onChange={(e) => setTaskAssignee(e.target.value)}
            options={[
              { label: isAdmin ? "-- Select Project Manager --" : "-- Select Employee --", value: "" },
              ...eligibleAssignees.map((emp, idx) => ({
                label: `${emp.name} (${emp.role})`,
                value: emp.id || (emp as any)._id || `emp-${idx}`,
              })),
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={creatingTask}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Employee to Project Modal */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        title="Add Employee to Project"
        description={`Provision a new employee account and immediately assign them to ${project.name}`}
      >
        {employeeError && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <FiAlertTriangle className="w-4 h-4 shrink-0" />
            <span>{employeeError}</span>
          </div>
        )}

        <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
          <Input
            label="Full Name*"
            placeholder="e.g. Arun Kumar"
            value={empName}
            onChange={(e) => setEmpName(e.target.value)}
            required
            leftIcon={<FiUser className="w-4 h-4" />}
          />

          <Input
            label="Email Address*"
            type="email"
            placeholder="arun@icsr.edu"
            value={empEmail}
            onChange={(e) => setEmpEmail(e.target.value)}
            required
          />

          <Input
            label="Initial Password* (min 6 characters)"
            type="password"
            placeholder="••••••••"
            value={empPassword}
            onChange={(e) => setEmpPassword(e.target.value)}
            required
          />

          <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-indigo-700 dark:text-indigo-300">
            * This employee will automatically be assigned to <span className="font-semibold">{project.name}</span> upon creation.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsEmployeeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={addingEmployee}>
              Create Employee
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
