"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Activity } from "@/types";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/lib/auth-context";
import {
  FiActivity,
  FiFolder,
  FiCheckSquare,
  FiMessageSquare,
  FiShield,
  FiRefreshCw,
  FiClock,
  FiSearch,
  FiExternalLink,
} from "react-icons/fi";

export default function ActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");

  const fetchActivities = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.append("search", search.trim());
      if (resourceFilter) q.append("resourceType", resourceFilter);
      q.append("limit", "50");

      const data = await apiClient<{ success: boolean; activities: Activity[] }>(
        `/activity?${q.toString()}`
      );
      setActivities(data.activities || []);
    } catch (err: any) {
      if (err.status !== 401) {
        console.error("Failed to load activity log", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchActivities();
    }
  }, [resourceFilter, authLoading, user]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case "Project":
        return <FiFolder className="w-4 h-4 text-indigo-600" />;
      case "Task":
        return <FiCheckSquare className="w-4 h-4 text-emerald-600" />;
      case "Comment":
        return <FiMessageSquare className="w-4 h-4 text-amber-600" />;
      case "User":
        return <FiShield className="w-4 h-4 text-rose-600" />;
      default:
        return <FiActivity className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            System Audit & Activity Trail
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Chronological audit log of project state transitions, task completions, and governance actions
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchActivities}
          leftIcon={<FiRefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchActivities();
          }}
          className="w-full sm:w-80 flex items-center gap-2"
        >
          <Input
            placeholder="Search activity description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<FiSearch className="w-3.5 h-3.5" />}
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm" variant="secondary" className="h-8">
            Search
          </Button>
        </form>

        <div className="w-full sm:w-48">
          <Select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="h-8 text-xs"
            options={[
              { label: "All Entities", value: "" },
              { label: "Projects", value: "Project" },
              { label: "Tasks", value: "Task" },
              { label: "Comments", value: "Comment" },
              { label: "Users & Roles", value: "User" },
            ]}
          />
        </div>
      </div>

      {/* Activity Timeline Card */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : activities.length === 0 ? (
            <EmptyState
              icon={<FiActivity className="w-6 h-6 text-zinc-400" />}
              title="No audit events found"
              description="No activity matches your active search and filter criteria."
            />
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
              {activities.map((act, idx) => (
                <div key={act._id || `act-log-${idx}`} className="relative flex items-start gap-4 group">
                  {/* Timeline Node Icon */}
                  <div className="absolute -left-6 mt-1 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs group-hover:border-indigo-500 transition-colors">
                    {getActionIcon(act.relatedResourceType)}
                  </div>

                  {/* Log Content Card */}
                  <div className="flex-1 bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80 rounded-xl p-4 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {act.actor?.name || "System"}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium">
                          {act.action.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <FiClock className="w-3 h-3" />
                        <span>{new Date(act.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {act.summary}
                    </p>

                    {act.relatedResourceId && (
                      <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center gap-2">
                        {act.relatedResourceType === "Project" ? (
                          <Link
                            href={`/projects/${act.relatedResourceId}`}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                          >
                            <span>Open Project Details</span>
                            <FiExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        ) : act.relatedResourceType === "Task" ? (
                          <Link
                            href={`/tasks`}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                          >
                            <span>Open Tasks</span>
                            <FiExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
