"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { DashboardData } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { StatusBadge, PriorityBadge, RoleBadge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import {
  FiFolder,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
  FiTrendingUp,
  FiArrowRight,
  FiCalendar,
  FiRefreshCw,
  FiActivity,
  FiPlus,
  FiCheckSquare,
  FiUsers,
} from "react-icons/fi";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ success: boolean } & DashboardData>("/dashboard/stats");
      setData(res);
    } catch (err: any) {
      if (err.status !== 401) {
        setError(err.message || "Failed to load dashboard metrics");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchStats();
    }
  }, [authLoading, user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl my-6">
        <FiAlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Unable to load metrics</h3>
        <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 mb-4">{error}</p>
        <Button onClick={fetchStats} leftIcon={<FiRefreshCw className="w-3.5 h-3.5" />}>
          Try Again
        </Button>
      </div>
    );
  }

  const { stats, charts, recentActivity, upcomingDeadlines } = data;
  const isEmployee = user?.role === "Employee";
  const isPM = user?.role === "Project Manager";

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {isEmployee
              ? "My Workload & Assignments"
              : isPM
              ? "Managed Projects & Workload"
              : "System Overview & Governance"}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {isEmployee
              ? "Your current task pipeline, upcoming deliverables, and project milestones"
              : isPM
              ? "Progress tracking, deadlines, and delivery metrics across your authorized projects"
              : "Enterprise-wide project execution, resource allocation, and audit tracking"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats} leftIcon={<FiRefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          {!isEmployee && (
            <Link href="/projects/new">
              <Button size="sm" leftIcon={<FiPlus className="w-3.5 h-3.5" />}>
                New Project
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isEmployee ? (
          <>
            <StatCard
              title="My Assigned Tasks"
              value={stats.totalTasks}
              subtitle={`${stats.todoTasks || 0} To Do · ${stats.inProgressTasks || 0} In Progress`}
              href="/tasks"
              icon={<FiCheckSquare className="w-5 h-5" />}
              colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
            />
            <StatCard
              title="Completed Deliverables"
              value={stats.completedTasks}
              subtitle={`${stats.completionRate}% completion rate`}
              href="/tasks?status=Done"
              icon={<FiCheckCircle className="w-5 h-5" />}
              colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
              trend={{ value: `${stats.totalTasks} total tasks`, isPositive: true }}
            />
            <StatCard
              title="In Progress"
              value={stats.inProgressTasks}
              subtitle={`${stats.reviewTasks || 0} awaiting review`}
              href="/tasks?status=In Progress"
              icon={<FiClock className="w-5 h-5" />}
              colorClass="bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400"
            />
            <StatCard
              title="Overdue Deliverables"
              value={stats.overdueTasks}
              subtitle="Past scheduled deadline"
              href="/tasks?overdue=true"
              icon={<FiAlertTriangle className="w-5 h-5" />}
              colorClass={
                stats.overdueTasks > 0
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                  : "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }
              trend={stats.overdueTasks > 0 ? { value: "Requires attention", isPositive: false } : undefined}
            />
          </>
        ) : isPM ? (
          <>
            <StatCard
              title="Managed Projects"
              value={`${stats.activeProjects} / ${stats.totalProjects}`}
              subtitle={`${stats.completedProjects} completed projects`}
              href="/projects"
              icon={<FiFolder className="w-5 h-5" />}
              colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
            />
            <StatCard
              title="Authorized Tasks"
              value={stats.totalTasks}
              subtitle={`${stats.completedTasks} completed (${stats.completionRate}%)`}
              href="/tasks"
              icon={<FiCheckSquare className="w-5 h-5" />}
              colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
              trend={{ value: `${stats.totalTasks} total tasks`, isPositive: true }}
            />
            <StatCard
              title="Pending Deliverables"
              value={stats.pendingTasks}
              subtitle={`${stats.inProgressTasks} active in progress`}
              href="/tasks?status=In Progress"
              icon={<FiClock className="w-5 h-5" />}
              colorClass="bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400"
            />
            <StatCard
              title="Overdue Tasks"
              value={stats.overdueTasks}
              subtitle="Past project due date"
              href="/tasks?overdue=true"
              icon={<FiAlertTriangle className="w-5 h-5" />}
              colorClass={
                stats.overdueTasks > 0
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                  : "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }
              trend={stats.overdueTasks > 0 ? { value: "Requires action", isPositive: false } : undefined}
            />
          </>
        ) : (
          <>
            <StatCard
              title="Active Projects"
              value={`${stats.activeProjects} / ${stats.totalProjects}`}
              subtitle={`${stats.archivedProjects || 0} archived projects`}
              href="/projects?status=Active"
              icon={<FiFolder className="w-5 h-5" />}
              colorClass="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
            />
            <StatCard
              title="System Tasks"
              value={stats.totalTasks}
              subtitle={`${stats.completedTasks} completed (${stats.completionRate}%)`}
              href="/tasks"
              icon={<FiCheckSquare className="w-5 h-5" />}
              colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400"
              trend={{ value: `${stats.totalTasks} total tasks`, isPositive: true }}
            />
            <StatCard
              title="Team Personnel"
              value={stats.totalTeamMembers || stats.activeProjects}
              subtitle="Registered researchers & staff"
              href="/team"
              icon={<FiUsers className="w-5 h-5" />}
              colorClass="bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400"
            />
            <StatCard
              title="Overdue Tasks"
              value={stats.overdueTasks}
              subtitle="Past project due date"
              href="/tasks?overdue=true"
              icon={<FiAlertTriangle className="w-5 h-5" />}
              colorClass={
                stats.overdueTasks > 0
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                  : "bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }
              trend={stats.overdueTasks > 0 ? { value: "Requires action", isPositive: false } : undefined}
            />
          </>
        )}
      </div>

      {/* Charts Section: Status & Priority Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader
            title="Task Status Breakdown"
            description="Distribution of all tasks across current workflow stages"
          />
          <CardContent className="h-64 flex flex-col justify-center">
            {stats.totalTasks === 0 ? (
              <div className="text-center text-xs text-zinc-400">No tasks created yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {charts.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader
            title="Priority Distribution"
            description="Workload volume grouped by urgency level"
          />
          <CardContent className="h-64 flex flex-col justify-center">
            {stats.totalTasks === 0 ? (
              <div className="text-center text-xs text-zinc-400">No tasks created yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {charts.priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two Column Bottom Grid: Upcoming Deadlines & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader
            title="Upcoming Deadlines"
            description="Deliverables scheduled for completion soon"
            action={
              <Link href="/tasks" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1">
                View all <FiArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <CardContent className="p-0">
            {upcomingDeadlines.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">No upcoming deadlines found</div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {upcomingDeadlines.map((task, idx) => (
                  <div key={task._id || `deadline-${idx}`} className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                        Project: {task.project?.name || "General"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <PriorityBadge priority={task.priority} />
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        <FiCalendar className="w-3 h-3 text-zinc-400" />
                        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Activity */}
        <Card>
          <CardHeader
            title="Recent Activity"
            description="Audit events and timeline updates"
            action={
              <Link href="/activity" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 inline-flex items-center gap-1">
                Full log <FiArrowRight className="w-3 h-3" />
              </Link>
            }
          />
          <CardContent className="p-0">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">No activity recorded yet</div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {recentActivity.map((act, idx) => (
                  <div key={act._id || `act-${idx}`} className="p-4 flex items-start gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0 mt-0.5">
                      <FiActivity className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-800 dark:text-zinc-200">
                        <span className="font-semibold">{act.actor?.name || "System"}: </span>
                        <span>{act.summary}</span>
                      </p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {new Date(act.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
