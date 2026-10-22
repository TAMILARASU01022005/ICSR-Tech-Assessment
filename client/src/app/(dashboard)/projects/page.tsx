"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Project, ProjectStatus } from "@/types";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  FiFolder,
  FiPlus,
  FiSearch,
  FiCalendar,
  FiUser,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiArchive,
} from "react-icons/fi";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={4} />}>
      <ProjectsContent />
    </Suspense>
  );
}

function ProjectsContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "Active";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  const canCreate = user?.role === "Admin";

  const fetchProjects = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") query.append("status", statusFilter);
      if (search.trim()) query.append("search", search.trim());

      const data = await apiClient<{ success: boolean; projects: Project[] }>(
        `/projects?${query.toString()}`
      );
      setProjects(data.projects || []);
    } catch (err: any) {
      if (err.status !== 401) {
        console.error("Failed to load projects", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchProjects();
    }
  }, [statusFilter, authLoading, user]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProjects();
  };

  const getPageTitle = () => {
    if (user?.role === "Admin") return "Projects Portfolio";
    return "My Projects";
  };

  const getPageSubtitle = () => {
    if (user?.role === "Admin") return "Manage every project across the institute";
    if (user?.role === "Project Manager") return "Projects you own, manage, and coordinate";
    return "Projects you are assigned to contribute to";
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {getPageTitle()}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {getPageSubtitle()}
          </p>
        </div>

        {canCreate && (
          <Link href="/projects/new">
            <Button size="sm" leftIcon={<FiPlus className="w-3.5 h-3.5" />}>
              Create Project
            </Button>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {["Active", "ALL", "Completed", "Archived"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === st
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              {st === "ALL" ? "All Projects" : st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="w-full sm:w-72 flex items-center gap-2">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<FiSearch className="w-3.5 h-3.5" />}
            className="h-8 text-xs"
          />
          <Button type="submit" size="sm" variant="secondary" className="h-8">
            Filter
          </Button>
        </form>
      </div>

      {/* Projects Grid / List */}
      {loading ? (
        <TableSkeleton rows={4} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FiFolder className="w-6 h-6 text-indigo-500" />}
          title="No projects found"
          description={
            search || statusFilter !== "ALL"
              ? "No projects match your active search or filter parameters."
              : "Get started by creating your first sponsored research or consultancy project."
          }
          actionText={canCreate ? "Create New Project" : undefined}
          onAction={canCreate ? () => (window.location.href = "/projects/new") : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Link
              key={project._id}
              href={`/projects/${project._id}`}
              className="group block transition-transform hover:-translate-y-0.5"
            >
              <Card className="h-full flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Top Row: Status badge & Deadlines */}
                    <div className="flex items-center justify-between mb-3">
                      <StatusBadge status={project.status} />
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                        <FiCalendar className="w-3 h-3" />
                        <span>
                          {project.deadline
                            ? new Date(project.deadline).toLocaleDateString()
                            : "Ongoing"}
                        </span>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                      {project.description || "No project description provided."}
                    </p>
                  </div>

                  {/* Bottom Stats & Manager */}
                  <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-zinc-500 font-medium">Deliverables Progress</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">
                          {project.progress ?? 0}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress ?? 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                        <FiUser className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{project.projectManager?.name || "Unassigned"}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px]">
                        <FiUsers className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{project.assignedEmployees?.length ?? 0} members</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
