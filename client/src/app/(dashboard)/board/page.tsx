"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Task, Project, TaskStatus } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { PriorityBadge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  FiColumns,
  FiCalendar,
  FiUser,
  FiMove,
  FiRefreshCw,
  FiAlertCircle,
  FiCheck,
  FiAlertTriangle,
} from "react-icons/fi";

const COLUMNS: { id: TaskStatus; label: string; dotColor: string }[] = [
  { id: "To Do", label: "To Do", dotColor: "bg-zinc-400" },
  { id: "In Progress", label: "In Progress", dotColor: "bg-indigo-500" },
  { id: "Review", label: "Review", dotColor: "bg-amber-500" },
  { id: "Done", label: "Done", dotColor: "bg-emerald-500" },
];

export default function KanbanBoardPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      }
    >
      <KanbanBoardContent />
    </Suspense>
  );
}

function KanbanBoardContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const initialProject = searchParams.get("project") || "";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(initialProject);
  const [loading, setLoading] = useState(true);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const fetchBoardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedProject) q.append("project", selectedProject);

      const [taskRes, projectRes] = await Promise.all([
        apiClient<{ success: boolean; tasks: Task[] }>(`/tasks?${q.toString()}`),
        apiClient<{ success: boolean; projects: Project[] }>("/projects"),
      ]);

      setTasks(taskRes.tasks || []);
      setProjects(projectRes.projects || []);
    } catch (err: any) {
      if (err.status !== 401) {
        console.error("Failed to load board tasks", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchBoardData();
    }
  }, [selectedProject, authLoading, user]);

  const updateTaskStatus = async (taskId: string, targetStatus: TaskStatus) => {
    // Optimistic UI update
    const previousTasks = [...tasks];
    setTasks((current) =>
      current.map((t) => (t._id === taskId ? { ...t, status: targetStatus } : t))
    );
    setSyncStatus("Saving changes...");

    try {
      await apiClient(`/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: targetStatus }),
      });
      setSyncStatus("Saved");
      setTimeout(() => setSyncStatus(null), 2000);
    } catch (err: any) {
      // Rollback on failure
      setTasks(previousTasks);
      setSyncStatus("Failed to update status");
      alert("Status change failed: " + err.message);
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string, canMove: boolean) => {
    if (!canMove) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", taskId);
    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    setDraggingTaskId(null);

    if (!taskId) return;
    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.status === targetStatus) return;

    const assigneeId = task.assignee?.id || (task.assignee as any)?._id;
    const canMove =
      user?.role === "Admin" ||
      user?.role === "Project Manager" ||
      (user?.role === "Employee" && assigneeId === user?.id);

    if (!canMove) {
      alert("You are not authorized to update this task's status.");
      return;
    }

    await updateTaskStatus(taskId, targetStatus);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Kanban Workflow Board</span>
            {syncStatus && (
              <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {syncStatus}
              </span>
            )}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Drag cards between columns or use quick status selectors to sync live deliverable stages
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-56">
            <Select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="h-8 text-xs"
              options={[
                { label: "All Projects", value: "" },
                ...projects.map((p) => ({ label: p.name, value: p._id })),
              ]}
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchBoardData} leftIcon={<FiRefreshCw className="w-3.5 h-3.5" />}>
            Sync
          </Button>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className="bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-200/70 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                      {col.label}
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1">
                  {colTasks.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg text-[11px] text-zinc-400">
                      Drop tasks here
                    </div>
                  ) : (
                    colTasks.map((task, idx) => {
                      const taskId = task._id || task.id || `board-task-${idx}`;
                      const isDragging = draggingTaskId === taskId;
                      const isOverdue =
                        task.status !== "Done" &&
                        task.dueDate &&
                        new Date(task.dueDate).getTime() < Date.now();

                      const assigneeId = task.assignee?.id || (task.assignee as any)?._id;
                      const canMove =
                        user?.role === "Admin" ||
                        user?.role === "Project Manager" ||
                        (user?.role === "Employee" && assigneeId === user?.id);

                      return (
                        <div
                          key={taskId}
                          draggable={canMove}
                          onDragStart={(e) => handleDragStart(e, taskId, canMove)}
                          className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all ${
                            canMove ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                          } ${
                            isDragging ? "opacity-40 scale-95 border-dashed border-indigo-500" : ""
                          }`}
                        >
                          {/* Card Header: Priority & Project */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <PriorityBadge priority={task.priority} />
                              {isOverdue && (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800 flex items-center gap-0.5">
                                  <FiAlertTriangle className="w-2.5 h-2.5" />
                                  Overdue
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                              {task.project?.name || "General"}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">
                            {task.title}
                          </h4>

                          {task.description && (
                            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Footer: Due date & Assignee */}
                          <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                            <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                              <FiUser className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="truncate">{task.assignee?.name || "Unassigned"}</span>
                            </div>

                            <div
                              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                                isOverdue
                                  ? "bg-rose-50 text-rose-600 font-semibold"
                                  : "text-zinc-400"
                              }`}
                            >
                              <FiCalendar className="w-2.5 h-2.5" />
                              <span>
                                {task.dueDate
                                  ? new Date(task.dueDate).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "No date"}
                              </span>
                            </div>
                          </div>

                          {/* Accessible Quick Move Dropdown (Guaranteed Fallback) */}
                          {canMove ? (
                            <div className="mt-2 pt-2 border-t border-zinc-50 dark:border-zinc-800/60 flex items-center justify-between">
                              <span className="text-[10px] text-zinc-400">Move to:</span>
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  updateTaskStatus(task._id, e.target.value as TaskStatus)
                                }
                                className="text-[10px] py-0.5 px-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
                              >
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Review">Review</option>
                                <option value="Done">Done</option>
                              </select>
                            </div>
                          ) : (
                            <div className="mt-2 pt-2 border-t border-zinc-50 dark:border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
                              <span>Status:</span>
                              <span className="font-semibold text-zinc-600 dark:text-zinc-400">{task.status}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
