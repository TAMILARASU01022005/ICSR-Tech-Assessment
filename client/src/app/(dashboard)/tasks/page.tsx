"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Task, Project, User, TaskPriority, TaskStatus, Comment } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  FiCheckSquare,
  FiPlus,
  FiSearch,
  FiCalendar,
  FiUser,
  FiMessageSquare,
  FiAlertTriangle,
  FiTrash2,
  FiEdit3,
  FiSend,
} from "react-icons/fi";

export default function TasksPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <TasksContent />
    </Suspense>
  );
}

function TasksContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "";
  const initialOverdue = searchParams.get("overdue") === "true";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(initialOverdue);

  // Create Task Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskPriorityVal, setTaskPriorityVal] = useState<TaskPriority>("Medium");
  const [taskDueDateVal, setTaskDueDateVal] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Task Details & Comments Drawer/Modal State
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  const isManagerOrAdmin = user?.role === "Admin" || user?.role === "Project Manager";

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.append("search", search.trim());
      if (statusFilter) q.append("status", statusFilter);
      if (priorityFilter) q.append("priority", priorityFilter);
      if (projectFilter) q.append("project", projectFilter);
      if (overdueOnly) q.append("overdue", "true");

      const [taskRes, projectRes] = await Promise.all([
        apiClient<{ success: boolean; tasks: Task[] }>(`/tasks?${q.toString()}`),
        apiClient<{ success: boolean; projects: Project[] }>("/projects"),
      ]);

      setTasks(taskRes.tasks || []);
      setProjects(projectRes.projects || []);
      if (!taskProjectId && projectRes.projects?.length > 0) {
        setTaskProjectId(projectRes.projects[0]._id);
      }
    } catch (err: any) {
      if (err.status !== 401) {
        console.error("Failed to fetch tasks", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchTasks();
    }
  }, [statusFilter, priorityFilter, projectFilter, overdueOnly, authLoading, user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTasks();
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await apiClient(`/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
      if (activeTask && activeTask._id === taskId) {
        setActiveTask({ ...activeTask, status: newStatus });
      }
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setCreateError("Title is required");
      return;
    }
    if (!taskProjectId) {
      setCreateError("Please select a project");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      await apiClient("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          project: taskProjectId,
          assignee: taskAssigneeId || undefined,
          priority: taskPriorityVal,
          status: "To Do",
          dueDate: taskDueDateVal ? new Date(taskDueDateVal).toISOString() : undefined,
        }),
      });

      setIsCreateModalOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskAssigneeId("");
      setTaskDueDateVal("");
      fetchTasks();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const openTaskDetails = async (task: Task) => {
    setActiveTask(task);
    setLoadingComments(true);
    try {
      const data = await apiClient<{ success: boolean; comments: Comment[] }>(
        `/comments/task/${task._id}`
      );
      setComments(data.comments || []);
    } catch (err) {
      console.error("Failed to load comments", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !activeTask) return;

    setSendingComment(true);
    try {
      const res = await apiClient<{ success: boolean; comment: Comment }>("/comments", {
        method: "POST",
        body: JSON.stringify({ task: activeTask._id, content: newComment.trim() }),
      });
      setComments((prev) => [...prev, res.comment]);
      setNewComment("");
    } catch (err: any) {
      alert("Failed to post comment: " + err.message);
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await apiClient(`/tasks/${taskId}`, { method: "DELETE" });
      setActiveTask(null);
      fetchTasks();
    } catch (err: any) {
      alert("Failed to delete task: " + err.message);
    }
  };

  // Selected project for eligible assignees in creation modal
  const selectedProjectObj = projects.find((p) => p._id === taskProjectId);
  const isAdmin = user?.role === "Admin";
  // If admin: show only project manager
  // If PM: show only assigned employees
  const eligibleAssignees = selectedProjectObj
    ? isAdmin
      ? selectedProjectObj.projectManager ? [selectedProjectObj.projectManager] : []
      : (selectedProjectObj.assignedEmployees || []).filter(Boolean)
    : [];

  const openCreateTaskModal = () => {
    setCreateError(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskDueDateVal("");
    setTaskPriorityVal("Medium");
    const firstProject = projects[0];
    const initialPId = taskProjectId || firstProject?._id || "";
    setTaskProjectId(initialPId);
    const pObj = projects.find((p) => p._id === initialPId) || firstProject;
    if (user?.role === "Admin" && pObj?.projectManager) {
      setTaskAssigneeId(pObj.projectManager.id || (pObj.projectManager as any)._id || "");
    } else {
      setTaskAssigneeId("");
    }
    setIsCreateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {user?.role === "Employee" ? "My Tasks" : "Tasks & Work Items"}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {user?.role === "Employee"
              ? "Your personal assigned deliverables, status updates, and milestone tracking"
              : "Search, assign, prioritize, and manage project deliverables"}
          </p>
        </div>

        {isManagerOrAdmin && (
          <Button
            size="sm"
            onClick={openCreateTaskModal}
            leftIcon={<FiPlus className="w-3.5 h-3.5" />}
          >
            Create Task
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <Input
            placeholder="Search task title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<FiSearch className="w-3.5 h-3.5" />}
            className="h-9 text-xs"
          />

          <Select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 text-xs"
            options={[
              { label: "All Projects", value: "" },
              ...projects.map((p) => ({ label: p.name, value: p._id })),
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs"
            options={[
              { label: "All Statuses", value: "" },
              { label: "To Do", value: "To Do" },
              { label: "In Progress", value: "In Progress" },
              { label: "Review", value: "Review" },
              { label: "Done", value: "Done" },
            ]}
          />

          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 text-xs"
            options={[
              { label: "All Priorities", value: "" },
              { label: "Low", value: "Low" },
              { label: "Medium", value: "Medium" },
              { label: "High", value: "High" },
              { label: "Critical", value: "Critical" },
            ]}
          />

          <button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`h-9 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              overdueOnly
                ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800"
                : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400"
            }`}
          >
            <FiAlertTriangle className={`w-3.5 h-3.5 ${overdueOnly ? "text-rose-600" : "text-zinc-400"}`} />
            <span>Overdue Only</span>
          </button>
        </div>
      </div>

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableSkeleton rows={5} />
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={<FiCheckSquare className="w-6 h-6 text-indigo-500" />}
              title="No tasks found"
              description="No tasks match your selected filter criteria."
              actionText={isManagerOrAdmin ? "Create New Task" : undefined}
              onAction={isManagerOrAdmin ? () => setIsCreateModalOpen(true) : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-500 font-semibold">
                    <th className="py-3 px-4">Task Details</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status & Action</th>
                    <th className="py-3 px-4">Assignee</th>
                    <th className="py-3 px-4">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {tasks.map((task, idx) => {
                    const taskId = task._id || task.id || `task-${idx}`;
                    const isOverdue =
                      task.status !== "Done" &&
                      task.dueDate &&
                      new Date(task.dueDate).getTime() < Date.now();

                    const assigneeId = task.assignee?.id || (task.assignee as any)?._id;
                    const canUpdateStatus =
                      isManagerOrAdmin ||
                      (user?.role === "Employee" && assigneeId === user?.id);

                    return (
                      <tr
                        key={taskId}
                        className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                        onClick={() => openTaskDetails(task)}
                      >
                        <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100 max-w-xs">
                          <p className="group-hover:text-indigo-600 transition-colors">{task.title}</p>
                          {task.description && (
                            <p className="text-[11px] text-zinc-400 font-normal line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-300">
                          {task.project?.name || "General"}
                        </td>

                        <td className="py-3.5 px-4">
                          <PriorityBadge priority={task.priority} />
                        </td>

                        <td
                          className="py-3.5 px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canUpdateStatus ? (
                            <select
                              value={task.status}
                              onChange={(e) =>
                                handleQuickStatusChange(task._id, e.target.value as TaskStatus)
                              }
                              className="text-[11px] font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md focus:outline-none cursor-pointer"
                            >
                              <option value="To Do">To Do</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Review">Review</option>
                              <option value="Done">Done</option>
                            </select>
                          ) : (
                            <StatusBadge status={task.status} />
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300">
                          <div className="flex items-center gap-1.5">
                            <FiUser className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{task.assignee?.name || "Unassigned"}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${
                              isOverdue
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "text-zinc-500"
                            }`}
                          >
                            <FiCalendar className="w-3 h-3" />
                            <span>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "None"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Details and Comments Modal */}
      {activeTask && (
        <Modal
          isOpen={!!activeTask}
          onClose={() => setActiveTask(null)}
          title={activeTask.title}
          description={`Project: ${activeTask.project?.name}`}
          size="lg"
        >
          <div className="space-y-5">
            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-xs">
              <div>
                <span className="text-zinc-400 font-medium">Status</span>
                <div className="mt-1">
                  <StatusBadge status={activeTask.status} />
                </div>
              </div>
              <div>
                <span className="text-zinc-400 font-medium">Priority</span>
                <div className="mt-1">
                  <PriorityBadge priority={activeTask.priority} />
                </div>
              </div>
              <div>
                <span className="text-zinc-400 font-medium">Assignee</span>
                <p className="mt-1 font-semibold text-zinc-800 dark:text-zinc-200">
                  {activeTask.assignee?.name || "Unassigned"}
                </p>
              </div>
              <div>
                <span className="text-zinc-400 font-medium">Due Date</span>
                <p className="mt-1 font-semibold text-zinc-800 dark:text-zinc-200">
                  {activeTask.dueDate ? new Date(activeTask.dueDate).toLocaleDateString() : "No deadline"}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Description & Deliverable
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 leading-relaxed">
                {activeTask.description || "No detailed description provided."}
              </p>
            </div>

            {/* Comments Timeline */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 mb-3">
                <FiMessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Discussion & Activity ({comments.length})</span>
              </h4>

              {loadingComments ? (
                <div className="py-4 text-center text-xs text-zinc-400">Loading comments...</div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-zinc-400 italic py-2">No comments yet. Start the conversation below.</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {comments.map((c, idx) => (
                    <div key={c._id || `comment-${idx}`} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {c.author?.name || "Member"}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="mt-3 flex items-center gap-2">
                <Input
                  placeholder="Write a message or status update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button type="submit" size="sm" isLoading={sendingComment} leftIcon={<FiSend className="w-3.5 h-3.5" />}>
                  Post
                </Button>
              </form>
            </div>

            {/* Actions */}
            {isManagerOrAdmin && (
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteTask(activeTask._id)}
                  leftIcon={<FiTrash2 className="w-3.5 h-3.5" />}
                >
                  Delete Task
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveTask(null)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Task"
        description="Allocate deliverable with priority and milestone due date"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <FiAlertTriangle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <Input
            label="Task Title"
            required
            placeholder="e.g. Set up JWT Auth & Role Middleware"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Description</label>
            <textarea
              rows={3}
              placeholder="Detailed acceptance criteria..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <Select
            label="Associated Project"
            required
            value={taskProjectId}
            onChange={(e) => {
              const newPId = e.target.value;
              setTaskProjectId(newPId);
              const pObj = projects.find((p) => p._id === newPId);
              if (isAdmin && pObj?.projectManager) {
                setTaskAssigneeId(pObj.projectManager.id || (pObj.projectManager as any)._id || "");
              } else {
                setTaskAssigneeId("");
              }
            }}
            options={projects.map((p) => ({ label: p.name, value: p._id }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Priority"
              value={taskPriorityVal}
              onChange={(e) => setTaskPriorityVal(e.target.value as TaskPriority)}
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
              value={taskDueDateVal}
              onChange={(e) => setTaskDueDateVal(e.target.value)}
            />
          </div>

          <Select
            label={isAdmin ? "Assignee (Project Manager)" : "Assignee (Assigned Project Employees)"}
            value={taskAssigneeId}
            onChange={(e) => setTaskAssigneeId(e.target.value)}
            options={[
              { label: isAdmin ? "-- Select Project Manager --" : "-- Select Employee --", value: "" },
              ...eligibleAssignees.map((emp, idx) => ({
                label: `${emp.name} (${emp.role})`,
                value: emp.id || (emp as any)._id || `emp-${idx}`,
              })),
            ]}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={creating}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
